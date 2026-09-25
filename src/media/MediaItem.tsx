import type { MediaAsset, TimelineClip } from "../types";
import { useSettings } from "../hooks/useSettings";
import { formatTimecode } from "../utils/time";

export function MediaItem({
  asset,
  clip,
  index,
  selected,
  onSelect,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDrop,
}: {
  asset: MediaAsset | undefined;
  clip: TimelineClip;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  const { t } = useSettings();
  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
      onClick={onSelect}
      className={`grid grid-cols-[72px_1fr] gap-2 rounded-xl border p-2 ${selected ? "border-cyan/60 bg-blue/10" : "border-line bg-navy/40"}`}
    >
      <img
        src={asset?.thumbnailUrl}
        alt=""
        className="h-16 w-[72px] rounded-lg object-cover bg-navy"
      />
      <div className="min-w-0">
        <p className="truncate text-sm">{asset?.name ?? clip.mediaId}</p>
        <p className="text-xs text-muted">{formatTimecode(clip.durationMs)}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          <button type="button" aria-label={t("dragHandle")} className="rounded-md border border-line px-1.5 text-xs" title={t("dragHandle")}>
            ::
          </button>
          <button type="button" className="rounded-md border border-line px-1.5 text-xs" onClick={(event) => { event.stopPropagation(); onMoveUp(); }} aria-label={t("moveUp")}>↑</button>
          <button type="button" className="rounded-md border border-line px-1.5 text-xs" onClick={(event) => { event.stopPropagation(); onMoveDown(); }} aria-label={t("moveDown")}>↓</button>
          <button type="button" className="rounded-md border border-line px-1.5 text-xs" onClick={(event) => { event.stopPropagation(); onDuplicate(); }}>{t("duplicate")}</button>
          <button type="button" className="rounded-md border border-line px-1.5 text-xs" onClick={(event) => { event.stopPropagation(); onDelete(); }}>{t("delete")}</button>
        </div>
        <span className="sr-only">{index + 1}</span>
      </div>
    </article>
  );
}
