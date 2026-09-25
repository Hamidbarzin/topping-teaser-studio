import { Muxer, ArrayBufferTarget } from "mp4-muxer";
import { exportPixelSize, resolveFormatSize } from "../formats/formatPresets";
import { qualityBitrate } from "../projects/projectStorage";
import type { DrawableMedia, ExportFileFormat, ExportSettings, Project } from "../types";
import { renderFrame } from "../utils/renderFrame";
import { layoutClips } from "../utils/timeline";

export interface ExportRequest {
  project: Project;
  media: Map<string, DrawableMedia>;
  elements: Map<string, HTMLImageElement | HTMLVideoElement>;
  logo: CanvasImageSource | null;
  settings: ExportSettings;
  format: ExportFileFormat;
  onProgress: (progress: number) => void;
}

export interface ExportResult {
  blob: Blob;
  extension: ExportFileFormat;
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
  const context = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
  if (!context) {
    canvas.remove();
    throw new Error("canvas");
  }

  const layout = layoutClips(request.project.clips);
  if (layout.durationMs <= 0) {
    canvas.remove();
    throw new Error("empty");
  }

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
    });
  };

  try {
    if (request.format === "png") {
      await draw(0);
      const blob = await canvasToBlob(canvas, "image/png");
      request.onProgress(1);
      return { blob, extension: "png", mimeType: "image/png" };
    }
    try {
      return await encodeMp4(canvas, request, layout.durationMs, draw);
    } catch (error) {
      console.error("MP4 export failed, falling back to PNG", error);
      await draw(0);
      const blob = await canvasToBlob(canvas, "image/png");
      request.onProgress(1);
      return { blob, extension: "png", mimeType: "image/png" };
    }
  } finally {
    canvas.remove();
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("png"));
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
  const codec = await pickAvcCodec(canvas.width, canvas.height);
  if (!codec) throw new Error("mp4");

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: "avc", width: canvas.width, height: canvas.height, frameRate: fps },
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
  const bitrate = qualityBitrate(request.settings.quality, canvas.width * canvas.height);
  encoder.configure({
    codec,
    width: canvas.width,
    height: canvas.height,
    bitrate,
    framerate: fps,
    avc: { format: "avc" },
  });

  const frameCount = Math.max(1, Math.round((durationMs / 1000) * fps));
  const frameDuration = Math.round(1_000_000 / fps);
  for (let index = 0; index < frameCount; index += 1) {
    if (encoderError) throw encoderError;
    await draw((index / fps) * 1000);
    const timestamp = index * frameDuration;
    const frame = new VideoFrame(canvas, { timestamp, duration: frameDuration });
    encoder.encode(frame, { keyFrame: index % Math.max(1, fps) === 0 });
    frame.close();
    request.onProgress((index + 1) / frameCount);
    if (encoder.encodeQueueSize > 8) {
      await new Promise<void>((resolve) => {
        encoder.addEventListener("dequeue", () => resolve(), { once: true });
      });
    }
  }
  await encoder.flush();
  if (encoderError) throw encoderError;
  muxer.finalize();
  encoder.close();
  if (!target.buffer.byteLength) throw new Error("mp4");
  return {
    blob: new Blob([target.buffer], { type: "video/mp4" }),
    extension: "mp4",
    mimeType: "video/mp4",
  };
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
