import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { exportPixelSize, resolveFormatSize } from "../formats/formatPresets";
import { qualityBitrate } from "../projects/projectStorage";
import type { DrawableMedia, ExportFileFormat, ExportSettings, Project } from "../types";
import { mixTimelineAudio } from "../utils/mixAudio";
import { renderFrame } from "../utils/renderFrame";
import { layoutClips } from "../utils/timeline";

export interface ExportRequest {
  project: Project;
  media: Map<string, DrawableMedia>;
  elements: Map<string, HTMLImageElement | HTMLVideoElement>;
  logo: CanvasImageSource | null;
  stockPoster?: CanvasImageSource | null;
  settings: ExportSettings;
  format: ExportFileFormat;
  onProgress: (progress: number) => void;
}

export interface ExportResult {
  blob: Blob;
  extension: "png" | "mp4" | "webm";
  mimeType: string;
}

export async function exportTeaser(request: ExportRequest): Promise<ExportResult> {
  const size = resolveFormatSize(request.project.formatId, request.project.customWidth, request.project.customHeight);
  const pixels = exportPixelSize(size.width, size.height, request.settings.resolution);
  const canvas = document.createElement("canvas");
  canvas.width = pixels.width;
  canvas.height = pixels.height;
  canvas.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none";
  document.body.appendChild(canvas);
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    canvas.remove();
    throw new Error("canvas");
  }

  const layout = layoutClips(request.project.clips);
  const durationMs = Math.max(layout.durationMs > 0 ? layout.durationMs : 2000, 1200);

  const draw = async (timeMs: number) => {
    await seekVideos(request.project, request.elements, timeMs);
    renderFrame(context, {
      width: pixels.width,
      height: pixels.height,
      timeMs,
      items: layout.items,
      media: request.media,
      branding: request.project.branding,
      texts: request.project.texts,
      logo: request.logo,
      formatId: request.project.formatId,
      post: request.project.post,
      slotLabel: "Add photo, video or poster",
      stockPoster: request.stockPoster ?? null,
    });
  };

  try {
    if (request.format === "png") {
      await draw(0);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
      const blob = await canvasToBlob(canvas, "image/png");
      request.onProgress(1);
      return { blob, extension: "png", mimeType: "image/png" };
    }
    try {
      return await encodeMp4(canvas, request, durationMs, draw);
    } catch (error) {
      console.error("VideoEncoder MP4 failed, trying MediaRecorder", error);
      return await encodeRecorded(canvas, request, durationMs, draw);
    }
  } finally {
    canvas.remove();
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob && blob.size > 0) {
        resolve(blob);
        return;
      }
      try {
        const dataUrl = canvas.toDataURL(type);
        const comma = dataUrl.indexOf(",");
        const binary = atob(dataUrl.slice(comma + 1));
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
        resolve(new Blob([bytes], { type }));
      } catch {
        reject(new Error("png"));
      }
    }, type);
  });
}

async function encodeMp4(
  canvas: HTMLCanvasElement,
  request: ExportRequest,
  durationMs: number,
  draw: (timeMs: number) => Promise<void>,
): Promise<ExportResult> {
  if (typeof VideoEncoder === "undefined") throw new Error("mp4");
  const fps = request.settings.fps;
  const encW = align16(canvas.width);
  const encH = align16(canvas.height);
  const codec = await pickAvcCodec(encW, encH);
  if (!codec) throw new Error("mp4");

  const pad = document.createElement("canvas");
  pad.width = encW;
  pad.height = encH;
  const padContext = pad.getContext("2d", { alpha: false });
  if (!padContext) throw new Error("mp4");

  request.onProgress(0.02);
  const mixed = await mixTimelineAudio(request.project, request.elements, durationMs);
  const aac = mixed ? await encodeAacPackets(mixed) : null;
  if (mixed && !aac) throw new Error("aac");

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: "avc", width: encW, height: encH, frameRate: fps },
    audio: aac
      ? { codec: "aac", numberOfChannels: aac.channels, sampleRate: aac.sampleRate }
      : undefined,
    fastStart: "in-memory",
    firstTimestampBehavior: "offset",
  });

  let encoderError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => {
      encoderError = error;
    },
  });
  const bitrate = qualityBitrate(request.settings.quality, encW * encH);
  const baseConfig: VideoEncoderConfig = {
    codec,
    width: encW,
    height: encH,
    bitrate,
    framerate: fps,
    avc: { format: "avc" },
  };
  try {
    encoder.configure({ ...baseConfig, latencyMode: "quality", hardwareAcceleration: "prefer-software" });
  } catch {
    encoder.configure(baseConfig);
  }

  const frameCount = Math.max(1, Math.round((durationMs / 1000) * fps));
  const frameDuration = Math.round(1_000_000 / fps);
  for (let index = 0; index < frameCount; index += 1) {
    if (encoderError) throw encoderError;
    await draw((index / fps) * 1000);
    padContext.fillStyle = "#07102A";
    padContext.fillRect(0, 0, encW, encH);
    padContext.drawImage(canvas, Math.floor((encW - canvas.width) / 2), Math.floor((encH - canvas.height) / 2));
    const timestamp = index * frameDuration;
    const frame = new VideoFrame(pad, { timestamp, duration: frameDuration });
    encoder.encode(frame, { keyFrame: index === 0 || index % Math.max(1, fps) === 0 });
    frame.close();
    if (index === 0) await encoder.flush();
    request.onProgress(0.12 + (0.86 * (index + 1)) / frameCount);
    if (encoder.encodeQueueSize > 8) {
      await new Promise<void>((resolve) => {
        encoder.addEventListener("dequeue", () => resolve(), { once: true });
      });
    }
  }
  await encoder.flush();
  if (encoderError) throw encoderError;
  if (aac) {
    for (const packet of aac.packets) muxer.addAudioChunk(packet.chunk, packet.meta);
  }
  muxer.finalize();
  encoder.close();
  const copy = target.buffer.slice(0);
  const bytes = new Uint8Array(copy);
  if (!hasFtyp(bytes)) throw new Error("mp4");
  return {
    blob: new Blob([copy], { type: "video/mp4" }),
    extension: "mp4",
    mimeType: "video/mp4",
  };
}

async function encodeRecorded(
  canvas: HTMLCanvasElement,
  request: ExportRequest,
  durationMs: number,
  draw: (timeMs: number) => Promise<void>,
): Promise<ExportResult> {
  if (typeof MediaRecorder === "undefined" || typeof canvas.captureStream !== "function") {
    throw new Error("mp4");
  }
  const fps = request.settings.fps;
  const mixed = await mixTimelineAudio(request.project, request.elements, durationMs);
  const mime = [
    mixed ? "video/webm;codecs=vp9,opus" : "",
    mixed ? "video/webm;codecs=vp8,opus" : "",
    mixed ? "video/mp4;codecs=avc1,mp4a.40.2" : "",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ].find((type) => Boolean(type) && MediaRecorder.isTypeSupported(type));
  if (!mime) throw new Error("mp4");
  const canvasStream = canvas.captureStream(fps);
  const audioContext = mixed ? new AudioContext({ sampleRate: mixed.sampleRate }) : null;
  const audioNode = mixed && audioContext ? audioContext.createBufferSource() : null;
  const audioTracks: MediaStreamTrack[] = [];
  if (mixed && audioContext && audioNode) {
    const dest = audioContext.createMediaStreamDestination();
    audioNode.buffer = mixed;
    audioNode.connect(dest);
    audioTracks.push(...dest.stream.getAudioTracks());
    await audioContext.resume();
    audioNode.start();
  }
  const stream = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);
  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  recorder.start(100);
  const frameCount = Math.max(1, Math.round((durationMs / 1000) * fps));
  for (let index = 0; index < frameCount; index += 1) {
    await draw((index / fps) * 1000);
    const videoTrack = canvasStream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined;
    videoTrack?.requestFrame?.();
    request.onProgress(0.1 + (0.85 * (index + 1)) / frameCount);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }
  await new Promise<void>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("mp4"));
    recorder.onstop = () => resolve();
    recorder.stop();
  });
  stream.getTracks().forEach((track) => track.stop());
  try {
    audioNode?.stop();
  } catch {
    /* already ended */
  }
  if (audioContext) await audioContext.close();
  const blob = new Blob(chunks, { type: mime.startsWith("video/mp4") ? "video/mp4" : "video/webm" });
  if (blob.size < 32) throw new Error("mp4");
  return {
    blob,
    extension: mime.startsWith("video/mp4") ? "mp4" : "webm",
    mimeType: blob.type,
  };
}

type AacPacket = { chunk: EncodedAudioChunk; meta?: EncodedAudioChunkMetadata };

async function encodeAacPackets(
  buffer: AudioBuffer,
): Promise<{ packets: AacPacket[]; sampleRate: number; channels: number } | null> {
  if (typeof AudioEncoder === "undefined" || typeof AudioData === "undefined") return null;
  const channels = Math.min(2, Math.max(1, buffer.numberOfChannels));
  const sampleRate = buffer.sampleRate;
  const codec = "mp4a.40.2";
  try {
    const support = await AudioEncoder.isConfigSupported({
      codec,
      numberOfChannels: channels,
      sampleRate,
      bitrate: 128_000,
    });
    if (!support.supported) return null;
  } catch {
    return null;
  }
  const packets: AacPacket[] = [];
  let encoderError: Error | null = null;
  const encoder = new AudioEncoder({
    output: (chunk, meta) => packets.push({ chunk, meta }),
    error: (error) => {
      encoderError = error;
    },
  });
  encoder.configure({ codec, numberOfChannels: channels, sampleRate, bitrate: 128_000 });
  const frameSize = 1024;
  for (let offset = 0; offset < buffer.length; offset += frameSize) {
    const frames = Math.min(frameSize, buffer.length - offset);
    const planar = new Float32Array(frameSize * channels);
    for (let channel = 0; channel < channels; channel += 1) {
      const source = buffer.getChannelData(Math.min(channel, buffer.numberOfChannels - 1));
      planar.set(source.subarray(offset, offset + frames), channel * frameSize);
    }
    const timestamp = Math.round((offset / sampleRate) * 1_000_000);
    const audioData = new AudioData({
      format: "f32-planar",
      sampleRate,
      numberOfFrames: frameSize,
      numberOfChannels: channels,
      timestamp,
      data: planar,
    });
    encoder.encode(audioData);
    audioData.close();
  }
  await encoder.flush();
  encoder.close();
  if (encoderError || packets.length === 0) return null;
  return { packets, sampleRate, channels };
}

function align16(value: number): number {
  return Math.max(16, Math.ceil(value / 16) * 16);
}

function hasFtyp(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 12) return false;
  return String.fromCharCode(bytes[4] ?? 0, bytes[5] ?? 0, bytes[6] ?? 0, bytes[7] ?? 0) === "ftyp";
}

async function pickAvcCodec(width: number, height: number): Promise<string | null> {
  if (typeof VideoEncoder === "undefined" || !VideoEncoder.isConfigSupported) return null;
  const codecs = ["avc1.4d0028", "avc1.42001f", "avc1.42E01E", "avc1.640028"];
  for (const codec of codecs) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec,
        width,
        height,
        bitrate: 4_000_000,
        avc: { format: "avc" },
      });
      if (support.supported) return codec;
    } catch {
      continue;
    }
  }
  return null;
}

async function seekVideos(
  project: Project,
  elements: Map<string, HTMLImageElement | HTMLVideoElement>,
  timeMs: number,
) {
  const layout = layoutClips(project.clips);
  const tasks: Array<Promise<void>> = [];
  for (const item of layout.items) {
    const element = elements.get(item.clip.mediaId);
    if (!(element instanceof HTMLVideoElement)) continue;
    const inside = timeMs >= item.startMs && timeMs <= item.endMs;
    element.pause();
    if (!inside) continue;
    const local = Math.min(
      Math.max(0, (timeMs - item.startMs) / 1000),
      Math.max(0, (element.duration || 0) - 0.04),
    );
    if (Math.abs(element.currentTime - local) < 0.03 && element.readyState >= 2) continue;
    tasks.push(new Promise((resolve) => {
      const done = () => {
        element.removeEventListener("seeked", done);
        window.clearTimeout(timer);
        resolve();
      };
      const timer = window.setTimeout(done, 280);
      element.addEventListener("seeked", done);
      try {
        element.currentTime = local;
      } catch {
        done();
      }
    }));
  }
  await Promise.all(tasks);
}

export { syncVideos } from "../utils/syncVideos";
