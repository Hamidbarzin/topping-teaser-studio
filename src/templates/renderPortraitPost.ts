import { cardFit } from "../formats/formatPresets";
import type { ClipLayout, DrawableMedia, PortraitPostCopy } from "../types";
import { COMPANY } from "../branding/company";
import { clipsAtTime } from "../utils/timeline";
import { PORTRAIT_NAVY, PORTRAIT_ORANGE } from "./portraitPost";

export function renderPortraitPost(
  context: CanvasRenderingContext2D,
  state: {
    width: number;
    height: number;
    timeMs: number;
    items: ClipLayout[];
    media: Map<string, DrawableMedia>;
    logo: CanvasImageSource | null;
    stockPoster?: CanvasImageSource | null;
    post: PortraitPostCopy;
    slotLabel?: string;
    formatId?: string;
  },
) {
  const { width, height, post } = state;
  const { s, ox, oy } = cardFit(width, height, state.formatId);
  const margin = 60 * s;
  const maxPhoto = { x: ox + margin, y: oy + 176 * s, w: 960 * s, h: 640 * s, r: 40 * s };
  const photoSource = activePhoto(state) ?? stockPhoto(state.stockPoster);
  const photo = photoSource
    ? frameForMedia(maxPhoto, photoSource.width, photoSource.height)
    : maxPhoto;

  context.clearRect(0, 0, width, height);
  context.fillStyle = PORTRAIT_NAVY;
  context.fillRect(0, 0, width, height);
  const glow = context.createRadialGradient(ox + 1080 * s * 0.82, oy + 1350 * s * 0.92, 20 * s, ox + 1080 * s * 0.82, oy + 1350 * s * 0.92, 520 * s);
  glow.addColorStop(0, "rgba(255,140,26,0.20)");
  glow.addColorStop(1, "rgba(255,140,26,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  drawBrandLogo(context, state.logo, ox + margin, oy + 56 * s, 250 * s);
  drawOutlinePill(context, ox + 1080 * s - margin, oy + 64 * s, post.tag, s);

  roundPath(context, photo.x, photo.y, photo.w, photo.h, photo.r);
  context.save();
  context.clip();
  context.fillStyle = "#0C1638";
  context.fillRect(photo.x, photo.y, photo.w, photo.h);
  if (photoSource) {
    drawImageFill(context, photoSource.source, photoSource.width, photoSource.height, photo.x, photo.y, photo.w, photo.h);
  } else {
    drawMediaSlot(context, photo, s, state.slotLabel ?? "Add photo, video or poster");
  }
  context.restore();
  context.lineWidth = 2 * s;
  context.strokeStyle = "rgba(255,255,255,0.20)";
  roundPath(context, photo.x, photo.y, photo.w, photo.h, photo.r);
  context.stroke();

  drawSolidPill(context, photo.x + 24 * s, photo.y + photo.h - 56 * s, post.badge, s);

  const font = `700 ${78 * s}px Poppins, Inter, sans-serif`;
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.font = font;
  context.fillStyle = "#FFFFFF";
  context.fillText(post.headline1, ox + margin, oy + 900 * s);
  context.fillStyle = PORTRAIT_ORANGE;
  context.fillText(post.headline2, ox + margin, oy + 990 * s);

  context.strokeStyle = "rgba(255,255,255,0.20)";
  context.lineWidth = 2 * s;
  context.beginPath();
  context.moveTo(ox + margin, oy + 1128 * s);
  context.lineTo(ox + 1080 * s - margin, oy + 1128 * s);
  context.stroke();

  if (post.footerStyle === "urlArrow") {
    context.fillStyle = "#FFFFFF";
    context.font = `700 ${28 * s}px Poppins, Inter, sans-serif`;
    context.textBaseline = "middle";
    context.fillText(post.website || COMPANY.website, ox + margin, oy + 1236 * s);
    const cx = ox + 1080 * s - margin - 28 * s;
    const cy = oy + 1236 * s;
    context.fillStyle = PORTRAIT_ORANGE;
    context.beginPath();
    context.arc(cx, cy, 28 * s, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#FFFFFF";
    context.lineWidth = 3 * s;
    context.beginPath();
    context.moveTo(cx - 8 * s, cy);
    context.lineTo(cx + 6 * s, cy);
    context.moveTo(cx + 1 * s, cy - 7 * s);
    context.lineTo(cx + 8 * s, cy);
    context.lineTo(cx + 1 * s, cy + 7 * s);
    context.stroke();
  } else {
    drawCtaButton(context, ox + margin, oy + 1208 * s, post.cta, s);
    context.fillStyle = "#FFFFFF";
    context.font = `700 ${26 * s}px Poppins, Inter, sans-serif`;
    context.textAlign = "right";
    context.textBaseline = "middle";
    context.fillText(post.website || COMPANY.website, ox + 1080 * s - margin, oy + 1236 * s);
  }
}

function stockPhoto(source?: CanvasImageSource | null): { source: CanvasImageSource; width: number; height: number } | null {
  if (!source) return null;
  if (source instanceof HTMLImageElement) {
    const width = source.naturalWidth;
    const height = source.naturalHeight;
    if (width <= 0 || height <= 0) return null;
    return { source, width, height };
  }
  return { source, width: 1920, height: 1080 };
}

function activePhoto(state: {
  timeMs: number;
  items: ClipLayout[];
  media: Map<string, DrawableMedia>;
}): { source: CanvasImageSource; width: number; height: number } | null {
  const active = clipsAtTime(state.items, state.timeMs)[0];
  if (!active) return null;
  const media = state.media.get(active.clip.mediaId);
  if (!media?.source) return null;
  let width = media.width;
  let height = media.height;
  if (media.source instanceof HTMLVideoElement) {
    width = media.source.videoWidth || width;
    height = media.source.videoHeight || height;
  }
  if (media.source instanceof HTMLImageElement) {
    width = media.source.naturalWidth || width;
    height = media.source.naturalHeight || height;
  }
  return { source: media.source, width, height };
}

function drawMediaSlot(
  context: CanvasRenderingContext2D,
  photo: { x: number; y: number; w: number; h: number; r: number },
  s: number,
  label: string,
) {
  context.fillStyle = "#0C1638";
  context.fillRect(photo.x, photo.y, photo.w, photo.h);
  const inset = 18 * s;
  context.setLineDash([14 * s, 10 * s]);
  context.strokeStyle = "rgba(255,255,255,0.28)";
  context.lineWidth = 2 * s;
  roundPath(context, photo.x + inset, photo.y + inset, photo.w - inset * 2, photo.h - inset * 2, 28 * s);
  context.stroke();
  context.setLineDash([]);
  context.fillStyle = "rgba(255,255,255,0.72)";
  context.font = `700 ${28 * s}px Poppins, Inter, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, photo.x + photo.w / 2, photo.y + photo.h / 2);
}

function frameForMedia(
  box: { x: number; y: number; w: number; h: number; r: number },
  mediaW: number,
  mediaH: number,
): { x: number; y: number; w: number; h: number; r: number } {
  const sw = Math.max(1, mediaW);
  const sh = Math.max(1, mediaH);
  const fit = Math.min(box.w / sw, box.h / sh);
  const w = sw * fit;
  const h = sh * fit;
  return {
    x: box.x + (box.w - w) / 2,
    y: box.y + (box.h - h) / 2,
    w,
    h,
    r: Math.min(box.r, w / 2, h / 2),
  };
}

function drawImageFill(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sw: number,
  sh: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  try {
    if (sw <= 0 || sh <= 0) {
      context.drawImage(source, dx, dy, dw, dh);
      return;
    }
    context.drawImage(source, dx, dy, dw, dh);
  } catch {
    /* source not ready */
  }
}

function drawBrandLogo(
  context: CanvasRenderingContext2D,
  logo: CanvasImageSource | null,
  x: number,
  y: number,
  drawW: number,
) {
  if (!logo) return;
  const srcW = logo instanceof HTMLImageElement ? logo.naturalWidth : 882;
  const srcH = logo instanceof HTMLImageElement ? logo.naturalHeight : 350;
  if (srcW <= 0 || srcH <= 0) return;
  const drawH = drawW * (srcH / srcW);
  context.drawImage(logo, x, y, drawW, drawH);
}

function drawOutlinePill(context: CanvasRenderingContext2D, right: number, y: number, text: string, s: number) {
  context.font = `700 ${18 * s}px Poppins, Inter, sans-serif`;
  const label = text.toUpperCase();
  const width = context.measureText(label).width + 36 * s;
  const height = 40 * s;
  const x = right - width;
  roundPath(context, x, y, width, height, height / 2);
  context.strokeStyle = PORTRAIT_ORANGE;
  context.lineWidth = 2 * s;
  context.stroke();
  context.fillStyle = PORTRAIT_ORANGE;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, x + width / 2, y + height / 2 + 1 * s);
}

function drawSolidPill(context: CanvasRenderingContext2D, x: number, y: number, text: string, s: number) {
  context.font = `700 ${20 * s}px Poppins, Inter, sans-serif`;
  const label = text.toUpperCase();
  const width = context.measureText(label).width + 40 * s;
  const height = 48 * s;
  roundPath(context, x, y, width, height, height / 2);
  context.fillStyle = PORTRAIT_ORANGE;
  context.fill();
  context.fillStyle = "#FFFFFF";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, x + width / 2, y + height / 2 + 1 * s);
}

function drawCtaButton(context: CanvasRenderingContext2D, x: number, y: number, text: string, s: number) {
  context.font = `700 ${24 * s}px Poppins, Inter, sans-serif`;
  const width = context.measureText(text).width + 56 * s;
  const height = 56 * s;
  roundPath(context, x, y, width, height, height / 2);
  context.fillStyle = PORTRAIT_ORANGE;
  context.fill();
  context.fillStyle = "#FFFFFF";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, x + width / 2, y + height / 2 + 1 * s);
}

function roundPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + w, y, x + w, y + h, radius);
  context.arcTo(x + w, y + h, x, y + h, radius);
  context.arcTo(x, y + h, x, y, radius);
  context.arcTo(x, y, x + w, y, radius);
  context.closePath();
}
