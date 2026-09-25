export type MediaKind = "image" | "video";

export type ToolId =
  | "media"
  | "timeline"
  | "branding"
  | "text"
  | "animation"
  | "transitions"
  | "format";

export type BrandPresetId = "classic" | "tech" | "minimal" | "future" | "cinematic";

export type LogoPosition = "left" | "center" | "right";

export type TextAlign = "left" | "center" | "right";

export type TextAnimation =
  | "none"
  | "fade"
  | "slideUp"
  | "slideDown"
  | "zoom"
  | "typewriter";

export type TransitionType =
  | "none"
  | "fade"
  | "dissolve"
  | "slideLeft"
  | "slideRight"
  | "zoom"
  | "blur";

export type ClipAnimation =
  | "none"
  | "kenBurns"
  | "slowZoom"
  | "panLeft"
  | "panRight"
  | "panUp"
  | "panDown";

export type ExportFileFormat = "mp4" | "png";
export type ExportResolution = "720p" | "1080p";
export type ExportFps = 24 | 30 | 60;
export type ExportQuality = "low" | "medium" | "high";
export type Language = "en" | "fa";
export type ThemeName = "dark" | "light";

export interface TransitionSettings {
  type: TransitionType;
  durationMs: number;
}

export interface HeaderBranding {
  logoSize: number;
  logoPosition: LogoPosition;
  padding: number;
  height: number;
  opacity: number;
  color: string;
}

export interface FooterBranding {
  showLogo: boolean;
  text: string;
  tagline: string;
  website: string;
  showMapleLeaf: boolean;
  height: number;
  opacity: number;
  color: string;
}

export interface BrandingSettings {
  enabled: boolean;
  preset: BrandPresetId;
  showHeader: boolean;
  showFooter: boolean;
  showLogo: boolean;
  showTagline: boolean;
  showCanada: boolean;
  showWebsite: boolean;
  colorsAuto: boolean;
  accent: string;
  barColor: string;
  header: HeaderBranding;
  footer: FooterBranding;
}

export interface TextOverlay {
  id: string;
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  x: number;
  y: number;
  align: TextAlign;
  opacity: number;
  backgroundColor: string;
  backgroundOpacity: number;
  borderColor: string;
  borderWidth: number;
  shadow: boolean;
  letterSpacing: number;
  animation: TextAnimation;
  startMs: number;
  endMs: number;
}

export interface TimelineClip {
  id: string;
  mediaId: string;
  durationMs: number;
  transition: TransitionSettings;
  animation: ClipAnimation;
}

export interface ExportSettings {
  resolution: ExportResolution;
  fps: ExportFps;
  quality: ExportQuality;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  formatId: string;
  customWidth: number;
  customHeight: number;
  clips: TimelineClip[];
  branding: BrandingSettings;
  texts: TextOverlay[];
  exportSettings: ExportSettings;
}

export interface MediaAsset {
  id: string;
  projectId: string;
  name: string;
  kind: MediaKind;
  mimeType: string;
  intrinsicDurationMs: number;
  width: number;
  height: number;
  objectUrl: string;
  thumbnailUrl: string;
}

export interface StoredMedia {
  id: string;
  projectId: string;
  name: string;
  kind: MediaKind;
  mimeType: string;
  intrinsicDurationMs: number;
  width: number;
  height: number;
  blob: Blob;
  thumbnail: Blob;
}

export interface AppSettings {
  language: Language;
  theme: ThemeName;
  defaultFormatId: string;
  defaultExportQuality: ExportQuality;
  autoSave: boolean;
  brandingEnabledByDefault: boolean;
}

export interface ClipLayout {
  clip: TimelineClip;
  index: number;
  startMs: number;
  endMs: number;
  transitionInMs: number;
}

export interface TextHitBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DrawableMedia {
  kind: MediaKind;
  source: CanvasImageSource | null;
  width: number;
  height: number;
}
