import type {
  BrandingSettings,
  ClipAnimation,
  ClipLayout,
  DrawableMedia,
  TextHitBox,
  TextOverlay,
  TransitionType,
} from "../types";
import { resolveFrameColors } from "../branding/brandingPresets";
import { COMPANY } from "../branding/company";
import { clipsAtTime } from "./timeline";

export interface RenderState {
  width: number;
  height: number;
  timeMs: number;
  items: ClipLayout[];
  media: Map<string, DrawableMedia>;
  branding: BrandingSettings;
  texts: TextOverlay[];
  logo: CanvasImageSource | null;
}

interface Motion {
  scale: number;
  x: number;
  y: number;
}

export function renderFrame(context: CanvasRenderingContext2D, state: RenderState): TextHitBox[] {
  const { width, height } = state;
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#050B14";
  context.fillRect(0, 0, width, height);

  const frame = contentRect(state.branding, width, height);
  const active = clipsAtTime(state.items, state.timeMs);
  context.save();
  context.beginPath();
  context.rect(frame.x, frame.y, frame.w, frame.h);
  context.clip();
  if (active.length === 0) {
    drawEmpty(context, frame);
  } else if (active.length === 1) {
    const only = active[0];
    if (only) drawClip(context, state, only, frame, 1);
  } else {
    const outgoing = active[0];
    const incoming = active[1];
    if (outgoing && incoming) {
      const progress =
        incoming.transitionInMs <= 0
          ? 1
          : clamp((state.timeMs - incoming.startMs) / incoming.transitionInMs);
      const type = outgoing.clip.transition.type;
      drawTransition(context, state, outgoing, incoming, frame, type, progress);
    }
  }
  context.restore();

  drawBranding(context, state);
  return drawTexts(context, state, frame);
}

function contentRect(branding: BrandingSettings, width: number, height: number) {
  const header = branding.enabled && branding.showHeader ? (height * branding.header.height) / 100 : 0;
  const footer = branding.enabled && branding.showFooter ? (height * branding.footer.height) / 100 : 0;
  return {
    x: 0,
    y: header,
    w: Math.max(1, width),
    h: Math.max(1, height - header - footer),
  };
}

function drawEmpty(
  context: CanvasRenderingContext2D,
  frame: { x: number; y: number; w: number; h: number },
) {
  context.fillStyle = "#071525";
  context.fillRect(frame.x, frame.y, frame.w, frame.h);
}

function drawClip(
  context: CanvasRenderingContext2D,
  state: RenderState,
  item: ClipLayout,
  frame: { x: number; y: number; w: number; h: number },
  alpha: number,
  offsetX = 0,
  extraScale = 1,
) {
  const media = state.media.get(item.clip.mediaId);
  if (!media?.source) return;
  const progress = clamp((state.timeMs - item.startMs) / Math.max(1, item.endMs - item.startMs));
  const motion = animationMotion(item.clip.animation, progress);
  context.save();
  context.globalAlpha = alpha;
  drawCover(
    context,
    media.source,
    media.width,
    media.height,
    frame.x + offsetX,
    frame.y,
    frame.w,
    frame.h,
    motion.scale * extraScale,
    motion.x,
    motion.y,
  );
  context.restore();
}

function drawTransition(
  context: CanvasRenderingContext2D,
  state: RenderState,
  outgoing: ClipLayout,
  incoming: ClipLayout,
  frame: { x: number; y: number; w: number; h: number },
  type: TransitionType,
  progress: number,
) {
  const eased = ease(progress);
  if (type === "fade") {
    drawClip(context, state, outgoing, frame, 1 - eased);
    context.fillStyle = `rgba(5,11,20,${Math.sin(eased * Math.PI)})`;
    context.fillRect(frame.x, frame.y, frame.w, frame.h);
    drawClip(context, state, incoming, frame, eased);
    return;
  }
  if (type === "slideLeft" || type === "slideRight") {
    const direction = type === "slideLeft" ? -1 : 1;
    drawClip(context, state, outgoing, frame, 1, direction * eased * frame.w * 0.35);
    drawClip(context, state, incoming, frame, 1, direction * (1 - eased) * frame.w * -1);
    return;
  }
  if (type === "zoom") {
    drawClip(context, state, outgoing, frame, 1 - eased, 0, 1 + eased * 0.08);
    drawClip(context, state, incoming, frame, eased, 0, 1.12 - eased * 0.12);
    return;
  }
  if (type === "blur") {
    context.save();
    context.filter = `blur(${(1 - eased) * 10}px)`;
    drawClip(context, state, outgoing, frame, 1 - eased * 0.2);
    context.restore();
    context.save();
    context.filter = `blur(${(1 - eased) * 8}px)`;
    drawClip(context, state, incoming, frame, eased);
    context.restore();
    return;
  }
  drawClip(context, state, outgoing, frame, 1 - eased);
  drawClip(context, state, incoming, frame, eased);
}

function animationMotion(type: ClipAnimation, progress: number): Motion {
  if (type === "kenBurns") return { scale: 1 + progress * 0.12, x: (progress - 0.5) * 0.05, y: (progress - 0.5) * 0.03 };
  if (type === "slowZoom") return { scale: 1 + progress * 0.08, x: 0, y: 0 };
  if (type === "panLeft") return { scale: 1.08, x: 0.04 - progress * 0.08, y: 0 };
  if (type === "panRight") return { scale: 1.08, x: -0.04 + progress * 0.08, y: 0 };
  if (type === "panUp") return { scale: 1.08, x: 0, y: 0.04 - progress * 0.08 };
  if (type === "panDown") return { scale: 1.08, x: 0, y: -0.04 + progress * 0.08 };
  return { scale: 1, x: 0, y: 0 };
}

function drawCover(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sw: number,
  sh: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  scale: number,
  shiftX: number,
  shiftY: number,
) {
  if (sw <= 0 || sh <= 0) return;
  const cover = Math.max(dw / sw, dh / sh) * scale;
  const width = sw * cover;
  const height = sh * cover;
  context.drawImage(source, dx + (dw - width) / 2 + shiftX * dw, dy + (dh - height) / 2 + shiftY * dh, width, height);
}

function drawBranding(context: CanvasRenderingContext2D, state: RenderState) {
  const { branding, width, height, logo } = state;
  if (!branding.enabled) return;
  const headerH = branding.showHeader ? (height * branding.header.height) / 100 : 0;
  const footerH = branding.showFooter ? (height * branding.footer.height) / 100 : 0;
  const colors = resolveFrameColors(branding);
  if (headerH > 0) {
    context.save();
    context.globalAlpha = branding.header.opacity;
    drawBrandPlate(context, 0, headerH, width, "bottom", colors.header, colors.stripe);
    drawLogoMark(context, branding, logo, width, headerH, 0);
    context.restore();
  }
  if (footerH > 0) {
    context.save();
    context.globalAlpha = branding.footer.opacity;
    drawBrandPlate(context, height - footerH, footerH, width, "top", colors.footer, colors.stripe);
    drawFooterCopy(context, branding, width, height, footerH, colors);
    context.restore();
  }
}

function drawBrandPlate(
  context: CanvasRenderingContext2D,
  y: number,
  barH: number,
  width: number,
  edge: "top" | "bottom",
  fill: string,
  stripeColor: string,
) {
  context.fillStyle = fill;
  context.fillRect(0, y, width, barH);
  const stripe = Math.max(6, Math.round(barH * 0.07));
  context.fillStyle = stripeColor;
  if (edge === "bottom") context.fillRect(0, y + barH - stripe, width, stripe);
  else context.fillRect(0, y, width, stripe);
}

function drawLogoMark(
  context: CanvasRenderingContext2D,
  branding: BrandingSettings,
  logo: CanvasImageSource | null,
  width: number,
  barH: number,
  y: number,
) {
  if (!branding.showLogo || !logo) return;
  const pad = Math.max(width * 0.045, (branding.header.padding / 1080) * width);
  const stripe = Math.max(6, Math.round(barH * 0.07));
  const inner = barH - stripe;
  const drawH = inner * (branding.header.logoSize / 100) * 0.78;
  const aspect = logo instanceof HTMLImageElement && logo.naturalWidth > 0
    ? logo.naturalWidth / logo.naturalHeight
    : 882 / 350;
  const drawW = Math.min(drawH * aspect, width * 0.46);
  const fittedH = drawW / aspect;
  let x = pad;
  if (branding.header.logoPosition === "center") x = (width - drawW) / 2;
  if (branding.header.logoPosition === "right") x = width - drawW - pad;
  context.drawImage(logo, x, y + (inner - fittedH) / 2, drawW, fittedH);
}

function drawFooterCopy(
  context: CanvasRenderingContext2D,
  branding: BrandingSettings,
  width: number,
  height: number,
  footerH: number,
  colors: ReturnType<typeof resolveFrameColors>,
) {
  const stripe = Math.max(6, Math.round(footerH * 0.07));
  const inner = footerH - stripe;
  const name = branding.footer.text || COMPANY.name;
  const site = branding.footer.website || COMPANY.website;
  const rows: Array<{ text: string; color: string; weight: number; size: number }> = [];
  if (branding.showWebsite && site) {
    rows.push({ text: site, color: colors.site, weight: 700, size: inner * 0.34 });
  } else {
    rows.push({ text: name, color: colors.footerInk, weight: 700, size: inner * 0.3 });
  }
  if (branding.showTagline && branding.footer.tagline) {
    rows.push({ text: branding.footer.tagline, color: colors.footerInk, weight: 500, size: inner * 0.16 });
  }
  if (branding.showCanada) {
    rows.push({ text: "CANADA", color: colors.footerInk, weight: 600, size: inner * 0.16 });
  }

  context.textAlign = "center";
  context.textBaseline = "middle";
  const limit = width * 0.88;
  for (const row of rows) {
    while (row.size > 11) {
      context.font = `${row.weight} ${row.size}px Arial, Helvetica, sans-serif`;
      if (context.measureText(row.text).width <= limit) break;
      row.size *= 0.94;
    }
  }
  const block = rows.reduce((sum, row) => sum + row.size * 1.35, 0);
  let y = height - inner + (inner - block) / 2 + rows[0]!.size * 0.55;
  for (const row of rows) {
    context.font = `${row.weight} ${row.size}px Arial, Helvetica, sans-serif`;
    context.fillStyle = row.color;
    context.fillText(row.text, width / 2, y);
    y += row.size * 1.35;
  }
}

function drawTexts(
  context: CanvasRenderingContext2D,
  state: RenderState,
  frame: { x: number; y: number; w: number; h: number },
): TextHitBox[] {
  const hits: TextHitBox[] = [];
  const scale = state.width / 1080;
  for (const overlay of state.texts) {
    if (state.timeMs < overlay.startMs || state.timeMs > overlay.endMs) continue;
    const span = Math.max(1, overlay.endMs - overlay.startMs);
    const progress = clamp((state.timeMs - overlay.startMs) / span);
    const intro = clamp(progress / 0.28);
    const motion = textMotion(overlay.animation, intro, progress);
    const text = overlay.animation === "typewriter"
      ? overlay.text.slice(0, Math.max(0, Math.ceil(overlay.text.length * progress)))
      : overlay.text;
    context.save();
    context.globalAlpha = overlay.opacity * motion.alpha;
    const size = overlay.fontSize * scale * motion.scale;
    context.font = `${overlay.fontWeight} ${size}px ${overlay.fontFamily}`;
    context.textAlign = overlay.align;
    context.textBaseline = "middle";
    const x = state.width * overlay.x + motion.dx * state.width;
    const y = state.height * overlay.y + motion.dy * state.height;
    const metrics = context.measureText(text || " ");
    const width = Math.max(metrics.width + overlay.letterSpacing * text.length * scale, size);
    const height = size * 1.4;
    const left = overlay.align === "center" ? x - width / 2 : overlay.align === "right" ? x - width : x;
    if (overlay.backgroundOpacity > 0) {
      context.fillStyle = hexAlpha(overlay.backgroundColor, overlay.backgroundOpacity);
      roundRect(context, left - size * 0.35, y - height / 2, width + size * 0.7, height, 8 * scale);
      context.fill();
    }
    if (overlay.borderWidth > 0) {
      context.strokeStyle = overlay.borderColor;
      context.lineWidth = overlay.borderWidth * scale;
      roundRect(context, left - size * 0.35, y - height / 2, width + size * 0.7, height, 8 * scale);
      context.stroke();
    }
    if (overlay.shadow) {
      context.shadowColor = "rgba(0,0,0,0.45)";
      context.shadowBlur = 12 * scale;
      context.shadowOffsetY = 4 * scale;
    }
    context.fillStyle = overlay.color;
    drawSpacedText(context, text, x, y, overlay.letterSpacing * scale);
    context.restore();
    hits.push({ id: overlay.id, x: left - size * 0.35, y: y - height / 2, w: width + size * 0.7, h: height });
    void frame;
  }
  return hits;
}

function textMotion(type: TextOverlay["animation"], intro: number, progress: number) {
  const eased = ease(intro);
  if (type === "fade") return { alpha: eased, dx: 0, dy: 0, scale: 1 };
  if (type === "slideUp") return { alpha: eased, dx: 0, dy: (1 - eased) * 0.04, scale: 1 };
  if (type === "slideDown") return { alpha: eased, dx: 0, dy: (1 - eased) * -0.04, scale: 1 };
  if (type === "zoom") return { alpha: eased, dx: 0, dy: 0, scale: 0.92 + eased * 0.08 };
  if (type === "typewriter") return { alpha: progress > 0 ? 1 : 0, dx: 0, dy: 0, scale: 1 };
  return { alpha: 1, dx: 0, dy: 0, scale: 1 };
}

function drawSpacedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
) {
  if (spacing === 0 || text.length < 2) {
    context.fillText(text, x, y);
    return;
  }
  const chars = [...text];
  const widths = chars.map((char) => context.measureText(char).width);
  const total = widths.reduce((sum, width) => sum + width, 0) + spacing * (chars.length - 1);
  let cursor = x;
  if (context.textAlign === "center") cursor = x - total / 2;
  if (context.textAlign === "right") cursor = x - total;
  const align = context.textAlign;
  context.textAlign = "left";
  chars.forEach((char, index) => {
    context.fillText(char, cursor, y);
    cursor += (widths[index] ?? 0) + spacing;
  });
  context.textAlign = align;
}

function drawMaple(context: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  context.save();
  context.translate(x, y);
  context.scale(size / 100, size / 100);
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(50, 4);
  context.lineTo(61, 30);
  context.lineTo(88, 22);
  context.lineTo(72, 42);
  context.lineTo(98, 52);
  context.lineTo(70, 58);
  context.lineTo(80, 86);
  context.lineTo(50, 66);
  context.lineTo(20, 86);
  context.lineTo(30, 58);
  context.lineTo(2, 52);
  context.lineTo(28, 42);
  context.lineTo(12, 22);
  context.lineTo(39, 30);
  context.closePath();
  context.fill();
  context.fillRect(45, 64, 10, 32);
  context.restore();
}

function roundRect(
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

function hexAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((part) => part + part).join("") : value;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((channel) => Number.isNaN(channel))) return `rgba(5,11,20,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function ease(value: number): number {
  return 1 - (1 - value) ** 3;
}
