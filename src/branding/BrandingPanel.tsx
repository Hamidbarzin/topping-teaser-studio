import { applyAutoFrameColors, applyPreset, resolveFrameColors } from "./brandingPresets";
import { BrandingPreview } from "./BrandingPreview";
import type { BrandPresetId, LogoPosition } from "../types";
import { ColorField, Field, SelectInput, Slider, TextInput, Toggle } from "../components/Controls";
import { useSettings } from "../hooks/useSettings";
import { useStudio } from "../hooks/useStudio";
import { COMPANY } from "./company";

const PRESETS: Array<{ id: BrandPresetId; key: "presetClassic" | "presetTech" | "presetMinimal" | "presetFuture" | "presetCinematic" }> = [
  { id: "classic", key: "presetClassic" },
  { id: "tech", key: "presetTech" },
  { id: "minimal", key: "presetMinimal" },
  { id: "future", key: "presetFuture" },
  { id: "cinematic", key: "presetCinematic" },
];

const SWATCHES = [COMPANY.frame.plate, COMPANY.frame.ink, COMPANY.frame.line, "#000000", "#111827", "#F4F6FB"];

export function BrandingPanel({ detailed = false }: { detailed?: boolean }) {
  const { t } = useSettings();
  const { project, patchProject } = useStudio();
  const branding = project.branding;
  const colors = resolveFrameColors(branding);

  const update = (next: typeof branding) => patchProject((current) => ({ ...current, branding: next }));

  const paint = (patch: { header?: string; footer?: string; stripe?: string }) => {
    const headerColor = patch.header ?? branding.header.color;
    const footerColor = patch.footer ?? patch.header ?? branding.footer.color;
    update({
      ...branding,
      colorsAuto: false,
      accent: patch.stripe ?? branding.accent,
      barColor: headerColor,
      header: { ...branding.header, color: headerColor },
      footer: { ...branding.footer, color: footerColor },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <BrandingPreview branding={branding} />
      <div className="grid grid-cols-1 gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => update(applyPreset(branding, preset.id))}
            className={`rounded-lg border px-3 py-2 text-start text-sm ${branding.preset === preset.id ? "border-cyan bg-blue/15" : "border-line"}`}
          >
            {t(preset.key)}
          </button>
        ))}
      </div>
      <Toggle
        label={t("autoColors")}
        checked={branding.colorsAuto !== false}
        onChange={(on) => update(on ? applyAutoFrameColors(branding) : { ...branding, colorsAuto: false })}
      />
      <ColorField label={t("headerColor")} value={colors.header} onChange={(header) => paint({ header })} />
      <ColorField label={t("footerColor")} value={colors.footer} onChange={(footer) => paint({ footer })} />
      <ColorField label={t("stripeColor")} value={colors.stripe} onChange={(stripe) => paint({ stripe })} />
      <div className="flex flex-wrap gap-2">
        {SWATCHES.map((swatch) => (
          <button
            key={swatch}
            type="button"
            aria-label={swatch}
            onClick={() => paint({ header: swatch })}
            className="h-7 w-7 rounded-full border border-line"
            style={{ background: swatch }}
          />
        ))}
      </div>
      <Toggle label={t("enableFrame")} checked={branding.enabled} onChange={(enabled) => update({ ...branding, enabled })} />
      <Toggle label={t("showHeader")} checked={branding.showHeader} onChange={(showHeader) => update({ ...branding, showHeader })} />
      <Toggle label={t("showFooter")} checked={branding.showFooter} onChange={(showFooter) => update({ ...branding, showFooter })} />
      <Toggle label={t("showLogo")} checked={branding.showLogo} onChange={(showLogo) => update({ ...branding, showLogo })} />
      <Toggle label={t("showTagline")} checked={branding.showTagline} onChange={(showTagline) => update({ ...branding, showTagline })} />
      <Toggle label={t("showCanada")} checked={branding.showCanada} onChange={(showCanada) => update({ ...branding, showCanada })} />
      <Toggle label={t("showWebsite")} checked={branding.showWebsite} onChange={(showWebsite) => update({ ...branding, showWebsite })} />
      {detailed ? (
        <>
          <Field label={t("logoPosition")}>
            <SelectInput
              value={branding.header.logoPosition}
              aria-label={t("logoPosition")}
              onChange={(event) =>
                update({
                  ...branding,
                  header: { ...branding.header, logoPosition: event.target.value as LogoPosition },
                })
              }
            >
              <option value="left">{t("left")}</option>
              <option value="center">{t("center")}</option>
              <option value="right">{t("right")}</option>
            </SelectInput>
          </Field>
          <Slider label={t("logoSize")} min={32} max={100} step={1} value={branding.header.logoSize} onChange={(logoSize) => update({ ...branding, header: { ...branding.header, logoSize } })} />
          <Slider label={t("padding")} min={0} max={80} step={1} value={branding.header.padding} onChange={(padding) => update({ ...branding, header: { ...branding.header, padding } })} />
          <Slider label={t("height")} min={6} max={22} step={1} value={branding.header.height} onChange={(height) => update({ ...branding, header: { ...branding.header, height } })} />
          <Slider label={t("opacity")} min={0.2} max={1} step={0.01} value={branding.header.opacity} onChange={(opacity) => update({ ...branding, header: { ...branding.header, opacity } })} />
          <Field label={t("footerText")}>
            <TextInput value={branding.footer.text} aria-label={t("footerText")} onChange={(event) => update({ ...branding, footer: { ...branding.footer, text: event.target.value } })} />
          </Field>
          <Field label={t("tagline")}>
            <TextInput value={branding.footer.tagline} aria-label={t("tagline")} onChange={(event) => update({ ...branding, footer: { ...branding.footer, tagline: event.target.value } })} />
          </Field>
          <Field label={t("website")}>
            <TextInput value={branding.footer.website} aria-label={t("website")} onChange={(event) => update({ ...branding, footer: { ...branding.footer, website: event.target.value } })} />
          </Field>
          <Toggle label={t("footerLogo")} checked={branding.footer.showLogo} onChange={(showLogo) => update({ ...branding, footer: { ...branding.footer, showLogo } })} />
          <Toggle label={t("maple")} checked={branding.footer.showMapleLeaf} onChange={(showMapleLeaf) => update({ ...branding, footer: { ...branding.footer, showMapleLeaf } })} />
          <Slider label={t("height")} min={8} max={28} step={1} value={branding.footer.height} onChange={(height) => update({ ...branding, footer: { ...branding.footer, height } })} />
          <Slider label={t("opacity")} min={0.2} max={1} step={0.01} value={branding.footer.opacity} onChange={(opacity) => update({ ...branding, footer: { ...branding.footer, opacity } })} />
        </>
      ) : null}
    </div>
  );
}
