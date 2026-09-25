import { useSettings } from "../hooks/useSettings";
import { formatTimecode } from "../utils/time";

export function TimelineControls({
  playing,
  muted,
  timeMs,
  durationMs,
  onToggle,
  onRestart,
  onMute,
}: {
  playing: boolean;
  muted: boolean;
  timeMs: number;
  durationMs: number;
  onToggle: () => void;
  onRestart: () => void;
  onMute: () => void;
}) {
  const { t } = useSettings();
  return (
    <div className="flex items-center gap-2">
      <button type="button" className="rounded-lg bg-blue px-3 py-1.5 text-sm text-white" onClick={onToggle} aria-label={playing ? t("pause") : t("play")}>
        {playing ? t("pause") : t("play")}
      </button>
      <button type="button" className="rounded-lg border border-line px-3 py-1.5 text-sm" onClick={onRestart} aria-label={t("restart")}>{t("restart")}</button>
      <button type="button" className="rounded-lg border border-line px-3 py-1.5 text-sm" onClick={onMute} aria-label={muted ? t("unmute") : t("mute")}>
        {muted ? t("unmute") : t("mute")}
      </button>
      <span className="text-xs text-muted">{formatTimecode(timeMs)} / {formatTimecode(durationMs)}</span>
    </div>
  );
}
