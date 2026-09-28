import type { Project } from "../types";
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
    if (!(element instanceof HTMLVideoElement)) continue;
    const buffer = await decodeElementAudio(element);
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
  return hasSignal(mixed) ? mixed : null;
}

async function decodeElementAudio(video: HTMLVideoElement): Promise<AudioBuffer | null> {
  const src = video.currentSrc || video.src;
  if (!src) return null;
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
  } catch (error) {
    console.warn("Could not decode clip audio", error);
    return null;
  }
}

function hasSignal(buffer: AudioBuffer): boolean {
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < data.length; index += 48) {
      if (Math.abs(data[index] ?? 0) > 0.0008) return true;
    }
  }
  return false;
}
