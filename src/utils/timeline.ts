import type { ClipLayout, TimelineClip } from "../types";

export function transitionOverlap(current: TimelineClip, next: TimelineClip | undefined): number {
  if (!next || current.transition.type === "none") return 0;
  const max = Math.min(current.durationMs, next.durationMs) * 0.45;
  return Math.max(0, Math.min(current.transition.durationMs, max));
}

export function layoutClips(clips: TimelineClip[]): { items: ClipLayout[]; durationMs: number } {
  const items: ClipLayout[] = [];
  let cursor = 0;
  clips.forEach((clip, index) => {
    const prev = clips[index - 1];
    const transitionInMs = prev ? transitionOverlap(prev, clip) : 0;
    const startMs = index === 0 ? 0 : cursor - transitionInMs;
    const endMs = startMs + Math.max(1, clip.durationMs);
    items.push({ clip, index, startMs, endMs, transitionInMs });
    cursor = endMs;
  });
  return { items, durationMs: cursor };
}

export function clipsAtTime(items: ClipLayout[], timeMs: number): ClipLayout[] {
  if (items.length === 0) return [];
  const last = items[items.length - 1];
  if (!last) return [];
  const time = Math.min(Math.max(0, timeMs), last.endMs);
  const active = items.filter((item, index) => {
    const end = index === items.length - 1 ? item.endMs : item.endMs;
    return time >= item.startMs && time < end;
  });
  if (active.length === 0 && time >= last.endMs) return [last];
  return active.length > 0 ? active : [items[0]].filter((item): item is ClipLayout => Boolean(item));
}
