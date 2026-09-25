import type { Project } from "../types";
import { layoutClips } from "./timeline";

export function syncVideos(
  project: Project,
  elements: Map<string, HTMLImageElement | HTMLVideoElement>,
  timeMs: number,
  playing: boolean,
) {
  const layout = layoutClips(project.clips);
  for (const item of layout.items) {
    const element = elements.get(item.clip.mediaId);
    if (!(element instanceof HTMLVideoElement)) continue;
    const inside = timeMs >= item.startMs && timeMs <= item.endMs;
    if (!inside) {
      element.pause();
      continue;
    }
    const local = Math.max(0, (timeMs - item.startMs) / 1000);
    if (Math.abs(element.currentTime - local) > (playing ? 0.35 : 0.08)) {
      element.currentTime = Math.min(local, Math.max(0, (element.duration || local) - 0.05));
    }
    element.muted = false;
    if (playing && element.paused) void element.play().catch(() => undefined);
    if (!playing) element.pause();
  }
}
