import type { ClipAnimation } from "../types";
import { useSettings } from "../hooks/useSettings";
import { useStudio } from "../hooks/useStudio";

const OPTIONS: Array<{ id: ClipAnimation; key: "none" | "kenBurns" | "slowZoom" | "panLeft" | "panRight" | "panUp" | "panDown" }> = [
  { id: "none", key: "none" },
  { id: "kenBurns", key: "kenBurns" },
  { id: "slowZoom", key: "slowZoom" },
  { id: "panLeft", key: "panLeft" },
  { id: "panRight", key: "panRight" },
  { id: "panUp", key: "panUp" },
  { id: "panDown", key: "panDown" },
];

export function AnimationPanel() {
  const { t } = useSettings();
  const { project, selectedClipId, updateClip } = useStudio();
  const clip = project.clips.find((item) => item.id === selectedClipId) ?? null;
  if (!clip) return <p className="text-sm text-muted">{t("selectScene")}</p>;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted">{t("appliesToSelected")}</p>
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => updateClip(clip.id, { animation: option.id })}
          className={`rounded-lg border px-3 py-2 text-start text-sm ${clip.animation === option.id ? "border-cyan bg-blue/15" : "border-line"}`}
        >
          {t(option.key)}
        </button>
      ))}
    </div>
  );
}
