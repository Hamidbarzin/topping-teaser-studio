import type { MessageKey } from "../i18n";
import type { ExportFileFormat, ExportSettings, SocialPlatform } from "../types";

export type Placement = "post" | "story" | "reel";

export interface SocialPreset {
  id: string;
  platform: SocialPlatform;
  placement: Placement;
  output: ExportFileFormat;
  width: number;
  height: number;
  ratio: string;
  labelKey: MessageKey;
  specKey: MessageKey;
  marginTop: number;
  marginBottom: number;
}

function make(
  platform: SocialPlatform,
  placement: Placement,
  specKey: MessageKey,
): SocialPreset {
  const story = placement !== "post";
  return {
    id: `${platform}-${placement}`,
    platform,
    placement,
    output: placement === "reel" ? "mp4" : "png",
    width: 1080,
    height: story ? 1920 : 1350,
    ratio: story ? "9:16" : "4:5",
    labelKey: placement === "post" ? "formatPost" : placement === "story" ? "formatStory" : "formatReel",
    specKey,
    marginTop: story ? 180 : 0,
    marginBottom: story ? 220 : 0,
  };
}

export const SOCIAL_PRESETS: SocialPreset[] = [
  make("instagram", "post", "specInstagramPng"),
  make("instagram", "story", "specInstagramStory"),
  make("instagram", "reel", "specInstagramMp4"),
  make("facebook", "post", "specFacebookPng"),
  make("facebook", "story", "specFacebookStory"),
  make("facebook", "reel", "specFacebookMp4"),
  make("linkedin", "post", "specLinkedinPng"),
  make("linkedin", "story", "specLinkedinStory"),
  make("linkedin", "reel", "specLinkedinMp4"),
];

export const FORMAT_PRESETS = SOCIAL_PRESETS;

export const SOCIAL_PLATFORMS: SocialPlatform[] = ["instagram", "facebook", "linkedin"];

const ALIASES: Record<string, string> = {
  "instagram-png": "instagram-post",
  "instagram-mp4": "instagram-reel",
  "linkedin-png": "linkedin-post",
  "linkedin-mp4": "linkedin-reel",
  "linkedin-video": "linkedin-reel",
  "facebook-png": "facebook-post",
  "facebook-mp4": "facebook-reel",
  "youtube-png": "instagram-post",
  "youtube-mp4": "instagram-reel",
  "youtube-thumb": "instagram-post",
  "youtube-video": "instagram-post",
  "youtube-shorts": "instagram-reel",
  tiktok: "instagram-reel",
  portrait: "instagram-post",
  instagram: "instagram-post",
};

export function presetsFor(platform: SocialPlatform): SocialPreset[] {
  return SOCIAL_PRESETS.filter((preset) => preset.platform === platform);
}

export function findSocialPreset(
  formatId?: string,
  fileFormat?: ExportFileFormat,
  platform?: SocialPlatform,
): SocialPreset {
  const mapped = formatId ? ALIASES[formatId] ?? formatId : undefined;
  const byId = SOCIAL_PRESETS.find((preset) => preset.id === mapped);
  if (byId) return byId;
  if (platform && fileFormat) {
    const preferred = preferredPreset(platform, fileFormat);
    if (preferred) return preferred;
  }
  return SOCIAL_PRESETS[0]!;
}

export function findFormat(id: string): SocialPreset {
  return findSocialPreset(id);
}

export function resolveFormatSize(
  formatId: string,
  _customWidth: number,
  _customHeight: number,
): { width: number; height: number } {
  const preset = findSocialPreset(formatId);
  return { width: preset.width, height: preset.height };
}

export function exportPixelSize(
  width: number,
  height: number,
  _resolution: ExportSettings["resolution"],
): { width: number; height: number } {
  return { width: even(width), height: even(height) };
}

export function socialPatch(platform: SocialPlatform, output: ExportFileFormat) {
  const preset = preferredPreset(platform, output) ?? SOCIAL_PRESETS[0]!;
  return applyPreset(preset);
}

export function applyPreset(preset: SocialPreset) {
  return {
    formatId: preset.id,
    customWidth: preset.width,
    customHeight: preset.height,
    exportSettings: {
      fileFormat: preset.output,
      platform: preset.platform,
    },
  };
}

export function cardFit(width: number, height: number, formatId?: string) {
  const preset = findSocialPreset(formatId);
  const innerY = preset.marginTop;
  const innerH = Math.max(1, height - preset.marginTop - preset.marginBottom);
  const s = Math.min(width / 1080, innerH / 1350);
  return {
    s,
    ox: (width - 1080 * s) / 2,
    oy: innerY + (innerH - 1350 * s) / 2,
  };
}

function preferredPreset(platform: SocialPlatform, output: ExportFileFormat): SocialPreset | undefined {
  const group = presetsFor(platform);
  if (output === "mp4") return group.find((item) => item.placement === "reel") ?? group[0];
  return group.find((item) => item.placement === "post") ?? group[0];
}

function even(value: number): number {
  return Math.max(2, Math.round(value / 2) * 2);
}
