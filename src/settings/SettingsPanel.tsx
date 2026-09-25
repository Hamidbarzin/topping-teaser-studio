import { FORMAT_PRESETS } from "../formats/formatPresets";
import { Field, SelectInput, Toggle } from "../components/Controls";
import { useSettings } from "../hooks/useSettings";
import type { ExportQuality, Language, ThemeName } from "../types";

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings, t } = useSettings();
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={t("settings")}>
      <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-xl border border-line bg-panel p-4 shadow-[var(--brand-shadow)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg">{t("settings")}</h2>
          <button type="button" onClick={onClose} className="rounded-lg border border-line px-2 py-1 text-sm" aria-label={t("close")}>{t("close")}</button>
        </div>
        <Field label={t("language")}>
          <SelectInput value={settings.language} aria-label={t("language")} onChange={(event) => updateSettings({ language: event.target.value as Language })}>
            <option value="en">{t("english")}</option>
            <option value="fa">{t("farsi")}</option>
          </SelectInput>
        </Field>
        <Field label={t("theme")}>
          <SelectInput value={settings.theme} aria-label={t("theme")} onChange={(event) => updateSettings({ theme: event.target.value as ThemeName })}>
            <option value="dark">{t("dark")}</option>
            <option value="light">{t("light")}</option>
          </SelectInput>
        </Field>
        <Field label={t("defaultFormat")}>
          <SelectInput value={settings.defaultFormatId} aria-label={t("defaultFormat")} onChange={(event) => updateSettings({ defaultFormatId: event.target.value })}>
            {FORMAT_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>{t(preset.labelKey)}</option>
            ))}
          </SelectInput>
        </Field>
        <Field label={t("defaultQuality")}>
          <SelectInput value={settings.defaultExportQuality} aria-label={t("defaultQuality")} onChange={(event) => updateSettings({ defaultExportQuality: event.target.value as ExportQuality })}>
            <option value="low">{t("low")}</option>
            <option value="medium">{t("medium")}</option>
            <option value="high">{t("high")}</option>
          </SelectInput>
        </Field>
        <div className="flex flex-col gap-2">
          <Toggle label={t("autoSave")} checked={settings.autoSave} onChange={(autoSave) => updateSettings({ autoSave })} />
          <Toggle label={t("brandingDefault")} checked={settings.brandingEnabledByDefault} onChange={(brandingEnabledByDefault) => updateSettings({ brandingEnabledByDefault })} />
        </div>
      </div>
    </div>
  );
}
