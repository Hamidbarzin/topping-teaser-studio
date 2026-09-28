import { PORTRAIT_VARIANTS, VARIANT_POSTERS, normalizePortraitPost, type PortraitVariantId } from "./portraitPost";
import { Field, TextInput, Toggle } from "../components/Controls";
import { useSettings } from "../hooks/useSettings";
import { useStudio } from "../hooks/useStudio";

const VARIANT_KEYS: Array<{ id: PortraitVariantId; key: "variantService" | "variantTracking" | "variantCta" }> = [
  { id: "service", key: "variantService" },
  { id: "tracking", key: "variantTracking" },
  { id: "cta", key: "variantCta" },
];

export function CardCopyFields() {
  const { t } = useSettings();
  const { project, patchProject } = useStudio();
  const post = normalizePortraitPost(project.post);

  const update = (patch: Partial<typeof post>) => {
    patchProject((current) => ({ ...current, post: { ...normalizePortraitPost(current.post), ...patch } }));
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-cyan">{t("cardTexts")}</p>
      <Field label={t("headline")}>
        <TextInput value={post.headline1} aria-label={t("headline")} onChange={(event) => update({ headline1: event.target.value })} />
      </Field>
      <Field label={t("headline2")}>
        <TextInput value={post.headline2} aria-label={t("headline2")} onChange={(event) => update({ headline2: event.target.value })} />
      </Field>
      <Field label={t("postCta")}>
        <TextInput value={post.cta} aria-label={t("postCta")} onChange={(event) => update({ cta: event.target.value })} />
      </Field>
      <Field label={t("website")}>
        <TextInput value={post.website} aria-label={t("website")} onChange={(event) => update({ website: event.target.value })} />
      </Field>
      <Field label={t("postTag")}>
        <TextInput value={post.tag} aria-label={t("postTag")} onChange={(event) => update({ tag: event.target.value })} />
      </Field>
      <Field label={t("postBadge")}>
        <TextInput value={post.badge} aria-label={t("postBadge")} onChange={(event) => update({ badge: event.target.value })} />
      </Field>
      <Toggle
        label={t("urlArrowFooter")}
        checked={post.footerStyle === "urlArrow"}
        onChange={(on) => update({ footerStyle: on ? "urlArrow" : "button" })}
      />
    </div>
  );
}

export function PortraitPostPanel() {
  const { t } = useSettings();
  const { project, patchProject, exportAllPosts } = useStudio();
  const post = normalizePortraitPost(project.post);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">{t("portraitHint")}</p>
      <div className="grid grid-cols-1 gap-2">
        {VARIANT_KEYS.map((variant) => (
          <button
            key={variant.id}
            type="button"
            onClick={() => patchProject((current) => ({
              ...current,
              branding: { ...current.branding, enabled: false },
              post: {
                ...PORTRAIT_VARIANTS[variant.id],
                website: normalizePortraitPost(current.post).website,
              },
            }))}
            className={`flex gap-3 rounded-lg border p-2 text-start text-sm ${post.variantId === variant.id ? "border-cyan bg-blue/15" : "border-line"}`}
          >
            <img src={VARIANT_POSTERS[variant.id]} alt="" className="h-16 w-24 rounded-md object-cover" />
            <span className="self-center">{t(variant.key)}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="rounded-2xl bg-blue px-3 py-3 text-sm font-semibold text-[#1d1f56]"
        onClick={() => void exportAllPosts()}
      >
        {t("exportAllPosts")}
      </button>
      <CardCopyFields />
    </div>
  );
}
