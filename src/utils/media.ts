import type { MediaKind } from "../types";

const MAX_BYTES = 200 * 1024 * 1024;

const EXTENSIONS: Record<string, MediaKind> = {
  jpg: "image",
  jpeg: "image",
  png: "image",
  webp: "image",
  mp4: "video",
  mov: "video",
  webm: "video",
};

export type FileIssue = "unsupported" | "large";

export function inspectFile(file: File): { kind: MediaKind } | { error: FileIssue } {
  if (file.size > MAX_BYTES) return { error: "large" };
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const kind = EXTENSIONS[extension];
  if (!kind) return { error: "unsupported" };
  return { kind };
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image"));
    image.src = url;
  });
}

export function loadVideoMeta(url: string): Promise<{ durationMs: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const fail = () => {
      video.removeAttribute("src");
      video.load();
      reject(new Error("video"));
    };
    video.onloadedmetadata = () => {
      const durationMs = Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : 0;
      if (durationMs <= 0) {
        fail();
        return;
      }
      resolve({
        durationMs,
        width: video.videoWidth || 1280,
        height: video.videoHeight || 720,
      });
      video.removeAttribute("src");
      video.load();
    };
    video.onerror = fail;
    video.src = url;
  });
}

export async function makeThumbnail(
  kind: MediaKind,
  url: string,
  width: number,
  height: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = Math.max(180, Math.round((320 * height) / Math.max(1, width)));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  context.fillStyle = "#071525";
  context.fillRect(0, 0, canvas.width, canvas.height);
  if (kind === "image") {
    const image = await loadImage(url);
    drawCover(context, image, image.naturalWidth, image.naturalHeight, canvas.width, canvas.height);
  } else {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("video"));
    });
    const target = Math.min(0.2, Math.max(0, (video.duration || 1) - 0.05));
    if (target > 0) {
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        video.onseeked = done;
        video.currentTime = target;
      });
    }
    drawCover(context, video, video.videoWidth, video.videoHeight, canvas.width, canvas.height);
    video.removeAttribute("src");
    video.load();
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) throw new Error("thumb");
  return blob;
}

function drawCover(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
) {
  const scale = Math.max(dw / sw, dh / sh);
  const width = sw * scale;
  const height = sh * scale;
  context.drawImage(source, (dw - width) / 2, (dh - height) / 2, width, height);
}
