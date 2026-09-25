import type { MessageKey } from "../i18n";

export interface FormatPreset {
  id: string;
  labelKey: MessageKey;
  width: number;
  height: number;
  ratio: string;
}

export const FORMAT_PRESETS: FormatPreset[] = [
  { id: "reel", labelKey: "formatReel", width: 1080, height: 1920, ratio: "9:16" },
  { id: "tiktok", labelKey: "formatTiktok", width: 1080, height: 1920, ratio: "9:16" },
  { id: "post", labelKey: "formatPost", width: 1080, height: 1080, ratio: "1:1" },
  { id: "landscape", labelKey: "formatLandscape", width: 1920, height: 1080, ratio: "16:9" },
  { id: "shorts", labelKey: "formatShorts", width: 1080, height: 1920, ratio: "9:16" },
  { id: "youtube", labelKey: "formatYoutube", width: 1920, height: 1080, ratio: "16:9" },
  { id: "linkedin", labelKey: "formatLinkedin", width: 1920, height: 1005, ratio: "1.91:1" },
  { id: "custom", labelKey: "custom", width: 1080, height: 1920, ratio: "Custom" },
];

export function findFormat(id: string): FormatPreset {
  return FORMAT_PRESETS.find((preset) => preset.id === id) ?? FORMAT_PRESETS[0];
}

export function resolveFormatSize(
  formatId: string,
  customWidth: number,
  customHeight: number,
): { width: number; height: number } {
  if (formatId === "custom") {
    return {
      width: clampSize(customWidth),
      height: clampSize(customHeight),
    };
  }
  const preset = findFormat(formatId);
  return { width: preset.width, height: preset.height };
}

function clampSize(value: number): number {
  if (!Number.isFinite(value)) return 1080;
  return Math.round(Math.min(3840, Math.max(320, value)));
}

export function exportPixelSize(
  width: number,
  height: number,
  resolution: "720p" | "1080p",
): { width: number; height: number } {
  if (resolution === "1080p") {
    return { width: even(width), height: even(height) };
  }
  const scale = 720 / 1080;
  return {
    width: even(width * scale),
    height: even(height * scale),
  };
}

function even(value: number): number {
  return Math.max(2, Math.round(value / 2) * 2);
}
