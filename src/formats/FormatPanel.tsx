import { FORMAT_PRESETS } from "./formatPresets";
import { Field, TextInput } from "../components/Controls";
import { useSettings } from "../hooks/useSettings";
import { useStudio } from "../hooks/useStudio";
import { resolveFormatSize } from "./formatPresets";

export function FormatPanel({ detailed = false }: { detailed?: boolean }) {
  const { t } = useSettings();
  const { project, patchProject } = useStudio();
  const size = resolveFormatSize(project.formatId, project.customWidth, project.customHeight);
  return (
    <div className="flex flex-col gap-2">
      {FORMAT_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => patchProject((current) => ({ ...current, formatId: preset.id }))}
          className={`rounded-lg border px-3 py-2 text-start ${project.formatId === preset.id ? "border-cyan bg-blue/15" : "border-line"}`}
        >
          <span className="block text-sm">{t(preset.labelKey)}</span>
          <span className="text-xs text-muted">
            {preset.id === "custom" ? `${size.width} × ${size.height}` : `${preset.width} × ${preset.height}`} · {preset.ratio}
          </span>
        </button>
      ))}
      {detailed && project.formatId === "custom" ? (
        <div className="grid grid-cols-2 gap-2">
          <Field label={t("width")}>
            <TextInput
              type="number"
              min={320}
              max={3840}
              value={project.customWidth}
              aria-label={t("width")}
              onChange={(event) => patchProject((current) => ({ ...current, customWidth: Number(event.target.value) }))}
            />
          </Field>
          <Field label={t("height")}>
            <TextInput
              type="number"
              min={320}
              max={3840}
              value={project.customHeight}
              aria-label={t("height")}
              onChange={(event) => patchProject((current) => ({ ...current, customHeight: Number(event.target.value) }))}
            />
          </Field>
        </div>
      ) : null}
    </div>
  );
}
