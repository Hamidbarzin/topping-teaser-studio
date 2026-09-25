import type { MediaAsset, TimelineClip } from "../types";
import { useSettings } from "../hooks/useSettings";

export function TimelineItem({
  clip,
  asset,
  selected,
  width,
  onSelect,
}: {
  clip: TimelineClip;
  asset: MediaAsset | undefined;
  selected: boolean;
  width: number;
  onSelect: () => void;
}) {
  const { t } = useSettings();
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      style={{ width }}
      className={`relative h-16 shrink-0 overflow-hidden rounded-lg border text-start ${selected ? "border-cyan" : "border-line"}`}
    >
      {asset ? <img src={asset.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : null}
      <span className="absolute bottom-1 start-1 rounded bg-black/60 px-1 text-[10px] text-white">
        {(clip.durationMs / 1000).toFixed(1)}s
      </span>
      {clip.transition.type !== "none" ? (
        <span className="absolute end-1 top-1 rounded bg-blue/80 px-1 text-[10px] text-white" title={t("transitions")}>
          {t("transitions")}
        </span>
      ) : null}
    </button>
  );
}
