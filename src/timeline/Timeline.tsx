import { TimelineControls } from "./TimelineControls";
import { TimelineItem } from "./TimelineItem";
import { useSettings } from "../hooks/useSettings";
import { useStudio } from "../hooks/useStudio";
import { layoutClips } from "../utils/timeline";

export function Timeline({
  timeMs,
  playing,
  muted,
  onToggle,
  onRestart,
  onMute,
  onSeek,
}: {
  timeMs: number;
  playing: boolean;
  muted: boolean;
  onToggle: () => void;
  onRestart: () => void;
  onMute: () => void;
  onSeek: (ms: number) => void;
}) {
  const { t } = useSettings();
  const { project, media, selectedClipId, selectClip, removeClip, duplicateClip } = useStudio();
  const layout = layoutClips(project.clips);
  const duration = Math.max(1, layout.durationMs);

  return (
    <section className="border-t border-line bg-navy-2/90 px-4 py-3 backdrop-blur" aria-label={t("timeline")}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <TimelineControls playing={playing} muted={muted} timeMs={timeMs} durationMs={layout.durationMs} onToggle={onToggle} onRestart={onRestart} onMute={onMute} />
        <div className="flex gap-2">
          <button type="button" className="rounded-lg border border-line px-2 py-1 text-xs" disabled={!selectedClipId} onClick={() => selectedClipId && duplicateClip(selectedClipId)}>{t("duplicate")}</button>
          <button type="button" className="rounded-lg border border-line px-2 py-1 text-xs" disabled={!selectedClipId} onClick={() => selectedClipId && removeClip(selectedClipId)}>{t("delete")}</button>
        </div>
      </div>
      {project.clips.length === 0 ? (
        <p className="text-sm text-muted">{t("emptyTimeline")}</p>
      ) : (
        <div
          className="relative"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const ratio = (event.clientX - rect.left) / rect.width;
            onSeek(Math.min(layout.durationMs, Math.max(0, ratio * layout.durationMs)));
          }}
          role="slider"
          aria-label={t("seek")}
          aria-valuemin={0}
          aria-valuemax={layout.durationMs}
          aria-valuenow={Math.round(timeMs)}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") onSeek(timeMs + 200);
            if (event.key === "ArrowLeft") onSeek(timeMs - 200);
          }}
        >
          <div className="flex gap-1 overflow-x-auto pb-2">
            {layout.items.map((item) => (
              <TimelineItem
                key={item.clip.id}
                clip={item.clip}
                asset={media.find((asset) => asset.id === item.clip.mediaId)}
                selected={item.clip.id === selectedClipId}
                width={Math.max(72, (item.clip.durationMs / duration) * 640)}
                onSelect={() => selectClip(item.clip.id)}
              />
            ))}
          </div>
          <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-cyan" style={{ insetInlineStart: `${(timeMs / duration) * 100}%` }} />
        </div>
      )}
    </section>
  );
}
