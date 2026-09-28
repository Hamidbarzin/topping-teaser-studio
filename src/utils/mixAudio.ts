import type { Project } from "../types";
import { loadMediaBlob } from "../projects/projectStorage";
import { layoutClips } from "./timeline";

const SAMPLE_RATE = 48000;
const CHANNELS = 2;

export async function mixTimelineAudio(
  project: Project,
  elements: Map<string, HTMLImageElement | HTMLVideoElement>,
  durationMs: number,
): Promise<AudioBuffer | null> {
  const layout = layoutClips(project.clips);
  const sources: Array<{ buffer: AudioBuffer; startSec: number; durationSec: number }> = [];
  for (const item of layout.items) {
    const element = elements.get(item.clip.mediaId);
    const blob = await loadMediaBlob(item.clip.mediaId);
    const buffer =
      (blob ? await decodeBlobAudio(blob) : null) ??
      (element instanceof HTMLVideoElement ? await decodeElementAudio(element) : null);
    if (!buffer) continue;
    sources.push({
      buffer,
      startSec: Math.max(0, item.startMs / 1000),
      durationSec: Math.max(0.02, (item.endMs - item.startMs) / 1000),
    });
  }
  if (sources.length === 0 || durationMs <= 0) return null;

  const length = Math.max(1, Math.ceil((durationMs / 1000) * SAMPLE_RATE));
  const offline = new OfflineAudioContext(CHANNELS, length, SAMPLE_RATE);
  for (const source of sources) {
    if (source.startSec >= durationMs / 1000) continue;
    const node = offline.createBufferSource();
    node.buffer = source.buffer;
    node.connect(offline.destination);
    node.start(source.startSec, 0, Math.min(source.durationSec, source.buffer.duration));
  }
  const mixed = await offline.startRendering();
  return hasSignal(mixed) ? mixed : mixed;
}

async function decodeBlobAudio(blob: Blob): Promise<AudioBuffer | null> {
  if (!blob.type.startsWith("video/") && !blob.type.startsWith("audio/") && blob.type !== "application/octet-stream") {
    return null;
  }
  try {
    const bytes = await blob.arrayBuffer();
    const context = new AudioContext();
    try {
      return await context.decodeAudioData(bytes.slice(0));
    } finally {
      await context.close();
    }
  } catch {
    return null;
  }
}

async function decodeElementAudio(video: HTMLVideoElement): Promise<AudioBuffer | null> {
  const src = video.currentSrc || video.src;
  if (!src) return null;
  const fromBytes = await decodeBytes(src);
  if (fromBytes) return fromBytes;
  return captureElementAudio(video);
}

async function decodeBytes(src: string): Promise<AudioBuffer | null> {
  try {
    const response = await fetch(src);
    if (!response.ok) return null;
    const bytes = await response.arrayBuffer();
    const context = new AudioContext();
    try {
      return await context.decodeAudioData(bytes.slice(0));
    } finally {
      await context.close();
    }
  } catch {
    return null;
  }
}

async function captureElementAudio(video: HTMLVideoElement): Promise<AudioBuffer | null> {
  try {
    const clone = document.createElement("video");
    clone.src = video.currentSrc || video.src;
    clone.crossOrigin = "anonymous";
    clone.playsInline = true;
    clone.muted = false;
    clone.volume = 1;
    await new Promise<void>((resolve, reject) => {
      clone.onloadedmetadata = () => resolve();
      clone.onerror = () => reject(new Error("audio"));
    });
    const duration = Number.isFinite(clone.duration) ? clone.duration : 0;
    if (duration <= 0.05) return null;
    const context = new AudioContext();
    await context.resume();
    const source = context.createMediaElementSource(clone);
    const dest = context.createMediaStreamDestination();
    source.connect(dest);
    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
    if (!mime) {
      await context.close();
      return null;
    }
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(dest.stream, { mimeType: mime });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.start(50);
    try {
      await clone.play();
    } catch {
      clone.muted = true;
      await clone.play();
      clone.muted = false;
    }
    await new Promise<void>((resolve) => {
      const stop = () => {
        clone.pause();
        resolve();
      };
      clone.onended = () => stop();
      window.setTimeout(stop, Math.ceil(duration * 1000) + 120);
    });
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });
    clone.removeAttribute("src");
    clone.load();
    await context.close();
    const recorded = new Blob(chunks, { type: mime });
    if (recorded.size < 16) return null;
    return decodeBlobAudio(recorded);
  } catch (error) {
    console.warn("Could not capture clip audio", error);
    return null;
  }
}

function hasSignal(buffer: AudioBuffer): boolean {
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < data.length; index += 48) {
      if (Math.abs(data[index] ?? 0) > 0.00005) return true;
    }
  }
  return buffer.length > 0;
}
