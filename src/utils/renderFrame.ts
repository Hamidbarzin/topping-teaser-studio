import type {
  BrandingSettings,
  ClipLayout,
  DrawableMedia,
  PortraitPostCopy,
  TextHitBox,
  TextOverlay,
} from "../types";
import { normalizePortraitPost } from "../templates/portraitPost";
import { renderPortraitPost } from "../templates/renderPortraitPost";

export interface RenderState {
  width: number;
  height: number;
  timeMs: number;
  items: ClipLayout[];
  media: Map<string, DrawableMedia>;
  branding: BrandingSettings;
  texts: TextOverlay[];
  logo: CanvasImageSource | null;
  formatId?: string;
  post?: PortraitPostCopy;
  slotLabel?: string;
  stockPoster?: CanvasImageSource | null;
}

export function renderFrame(context: CanvasRenderingContext2D, state: RenderState): TextHitBox[] {
  renderPortraitPost(context, {
    width: state.width,
    height: state.height,
    timeMs: state.timeMs,
    items: state.items,
    media: state.media,
    logo: state.logo,
    post: normalizePortraitPost(state.post),
    slotLabel: state.slotLabel,
    stockPoster: state.stockPoster,
    formatId: state.formatId,
  });
  return [];
}
