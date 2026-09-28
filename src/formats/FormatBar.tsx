import { SOCIAL_PRESETS, applyPreset, findSocialPreset } from "./formatPresets";
import { useSettings } from "../hooks/useSettings";
import { useStudio } from "../hooks/useStudio";

export function FormatBar() {
  const { t } = useSettings();
  const { project, patchProject } = useStudio();
  const current = findSocialPreset(project.formatId, project.exportSettings.fileFormat, project.exportSettings.platform);

  return (
    <label className="flex min-w-[220px] flex-col gap-1 text-start">
      <span className="text-[10px] tracking-[0.14em] text-muted uppercase">{t("format")}</span>
      <select
        aria-label={t("format")}
        value={current.id}
        className="rounded-xl border border-line bg-white/5 px-2 py-2 text-sm text-ink"
        onChange={(event) => {
          const preset = SOCIAL_PRESETS.find((item) => item.id === event.target.value);
          if (!preset) return;
          const next = applyPreset(preset);
          patchProject((projectState) => ({
            ...projectState,
            formatId: next.formatId,
            customWidth: next.customWidth,
            customHeight: next.customHeight,
            exportSettings: { ...projectState.exportSettings, ...next.exportSettings },
          }));
        }}
      >
        {SOCIAL_PRESETS.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {t(preset.specKey)}
          </option>
        ))}
      </select>
    </label>
  );
}
