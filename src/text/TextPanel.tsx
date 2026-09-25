import type { TextAlign, TextAnimation } from "../types";
import { Field, SelectInput, Slider, TextInput, Toggle } from "../components/Controls";
import { FONT_OPTIONS } from "../media/mediaTypes";
import { useSettings } from "../hooks/useSettings";
import { useStudio } from "../hooks/useStudio";
import { TextOverlayRow } from "./TextOverlay";

const ANIMATIONS: TextAnimation[] = ["none", "fade", "slideUp", "slideDown", "zoom", "typewriter"];

export function TextPanel({ detailed = false }: { detailed?: boolean }) {
  const { t } = useSettings();
  const { project, selectedTextId, selectText, addText, removeText, updateText } = useStudio();
  const overlay = project.texts.find((item) => item.id === selectedTextId) ?? null;
  const labels: Record<TextAnimation, "none" | "fade" | "slideUp" | "slideDown" | "zoom" | "typewriter"> = {
    none: "none",
    fade: "fade",
    slideUp: "slideUp",
    slideDown: "slideDown",
    zoom: "zoom",
    typewriter: "typewriter",
  };

  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={addText} className="rounded-lg bg-blue px-3 py-2 text-sm font-semibold text-white">
        {t("addText")}
      </button>
      {project.texts.map((item) => (
        <TextOverlayRow
          key={item.id}
          overlay={item}
          selected={item.id === selectedTextId}
          onSelect={() => selectText(item.id)}
          onDelete={() => removeText(item.id)}
        />
      ))}
      {detailed && overlay ? (
        <>
          <Field label={t("textValue")}>
            <TextInput value={overlay.text} aria-label={t("textValue")} onChange={(event) => updateText(overlay.id, { text: event.target.value })} />
          </Field>
          <Field label={t("font")}>
            <SelectInput value={overlay.fontFamily} aria-label={t("font")} onChange={(event) => updateText(overlay.id, { fontFamily: event.target.value })}>
              {FONT_OPTIONS.map((font) => (
                <option key={font} value={font}>{font}</option>
              ))}
            </SelectInput>
          </Field>
          <Slider label={t("size")} min={18} max={160} step={1} value={overlay.fontSize} onChange={(fontSize) => updateText(overlay.id, { fontSize })} />
          <Slider label={t("weight")} min={400} max={700} step={100} value={overlay.fontWeight} onChange={(fontWeight) => updateText(overlay.id, { fontWeight })} />
          <Field label={t("color")}>
            <input type="color" aria-label={t("color")} value={overlay.color} onChange={(event) => updateText(overlay.id, { color: event.target.value })} />
          </Field>
          <Slider label={t("positionX")} min={0} max={1} step={0.01} value={overlay.x} onChange={(x) => updateText(overlay.id, { x })} />
          <Slider label={t("positionY")} min={0} max={1} step={0.01} value={overlay.y} onChange={(y) => updateText(overlay.id, { y })} />
          <Field label={t("alignment")}>
            <SelectInput value={overlay.align} aria-label={t("alignment")} onChange={(event) => updateText(overlay.id, { align: event.target.value as TextAlign })}>
              <option value="left">{t("left")}</option>
              <option value="center">{t("center")}</option>
              <option value="right">{t("right")}</option>
            </SelectInput>
          </Field>
          <Slider label={t("opacity")} min={0} max={1} step={0.01} value={overlay.opacity} onChange={(opacity) => updateText(overlay.id, { opacity })} />
          <Field label={t("background")}>
            <input type="color" aria-label={t("background")} value={overlay.backgroundColor} onChange={(event) => updateText(overlay.id, { backgroundColor: event.target.value })} />
          </Field>
          <Slider label={t("background")} min={0} max={1} step={0.01} value={overlay.backgroundOpacity} onChange={(backgroundOpacity) => updateText(overlay.id, { backgroundOpacity })} />
          <Field label={t("border")}>
            <input type="color" aria-label={t("border")} value={overlay.borderColor} onChange={(event) => updateText(overlay.id, { borderColor: event.target.value })} />
          </Field>
          <Slider label={t("border")} min={0} max={12} step={1} value={overlay.borderWidth} onChange={(borderWidth) => updateText(overlay.id, { borderWidth })} />
          <Toggle label={t("shadow")} checked={overlay.shadow} onChange={(shadow) => updateText(overlay.id, { shadow })} />
          <Slider label={t("letterSpacing")} min={0} max={20} step={0.5} value={overlay.letterSpacing} onChange={(letterSpacing) => updateText(overlay.id, { letterSpacing })} />
          <Field label={t("animation")}>
            <SelectInput value={overlay.animation} aria-label={t("animation")} onChange={(event) => updateText(overlay.id, { animation: event.target.value as TextAnimation })}>
              {ANIMATIONS.map((animation) => (
                <option key={animation} value={animation}>{t(labels[animation])}</option>
              ))}
            </SelectInput>
          </Field>
          <Slider label={t("start")} min={0} max={120000} step={100} value={overlay.startMs} onChange={(startMs) => updateText(overlay.id, { startMs })} />
          <Slider label={t("end")} min={100} max={120000} step={100} value={overlay.endMs} onChange={(endMs) => updateText(overlay.id, { endMs })} />
        </>
      ) : null}
    </div>
  );
}
