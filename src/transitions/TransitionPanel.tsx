import type { TransitionType } from "../types";
import { Slider } from "../components/Controls";
import { useSettings } from "../hooks/useSettings";
import { useStudio } from "../hooks/useStudio";

const OPTIONS: Array<{ id: TransitionType; key: "none" | "fade" | "dissolve" | "slideLeft" | "slideRight" | "zoom" | "blur" }> = [
  { id: "none", key: "none" },
  { id: "fade", key: "fade" },
  { id: "dissolve", key: "dissolve" },
  { id: "slideLeft", key: "slideLeft" },
  { id: "slideRight", key: "slideRight" },
  { id: "zoom", key: "zoom" },
  { id: "blur", key: "blur" },
];

export function TransitionPanel() {
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
          onClick={() => updateClip(clip.id, { transition: { ...clip.transition, type: option.id } })}
          className={`rounded-lg border px-3 py-2 text-start text-sm ${clip.transition.type === option.id ? "border-cyan bg-blue/15" : "border-line"}`}
        >
          {t(option.key)}
        </button>
      ))}
      <Slider
        label={t("transitionDuration")}
        min={100}
        max={1500}
        step={50}
        value={clip.transition.durationMs}
        onChange={(durationMs) => updateClip(clip.id, { transition: { ...clip.transition, durationMs } })}
      />
    </div>
  );
}
