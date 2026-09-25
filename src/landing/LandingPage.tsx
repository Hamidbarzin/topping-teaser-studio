import { COMPANY } from "../branding/company";
import { useSettings } from "../hooks/useSettings";

export function LandingPage({ onCreate, onOpen }: { onCreate: () => void; onOpen: () => void }) {
  const { t } = useSettings();
  const features = [t("featureBrowser"), t("featurePrivate"), t("featureFast"), t("featurePro")];
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-navy text-ink">
      <div className="pointer-events-none absolute -top-32 start-[-10%] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(247,147,30,0.28),transparent_68%)]" />
      <div className="pointer-events-none absolute top-24 end-[-8%] h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,rgba(90,110,210,0.28),transparent_70%)]" />
      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <img src={COMPANY.logoSrc} alt={t("brand")} className="h-12 w-auto rounded-xl bg-white/95 px-2 py-1 shadow-sm" />
          <div>
            <p className="font-display text-sm tracking-[0.18em]">{t("brand")}</p>
            <p className="text-[11px] text-muted">{t("tagline")}</p>
          </div>
        </div>
      </header>
      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-8 rounded-[28px] border border-white/10 bg-white/95 px-10 py-7 shadow-[var(--brand-shadow)]">
          <img src={COMPANY.logoSrc} alt="" className="h-28 w-auto sm:h-36" />
        </div>
        <p className="text-[11px] font-semibold tracking-[0.28em] text-cyan">{t("brand")}</p>
        <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">{t("appName")}</h1>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-muted sm:text-lg">{t("landingSubtitle")}</p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={onCreate} className="rounded-2xl bg-blue px-6 py-3 text-sm font-semibold text-[#1d1f56] shadow-[0_10px_30px_rgba(247,147,30,0.35)]">
            {t("createProject")}
          </button>
          <button type="button" onClick={onOpen} className="rounded-2xl border border-line bg-panel/70 px-6 py-3 text-sm backdrop-blur">
            {t("openProject")}
          </button>
        </div>
        <ul className="mt-12 flex flex-wrap justify-center gap-2">
          {features.map((feature) => (
            <li key={feature} className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-muted backdrop-blur">
              {feature}
            </li>
          ))}
        </ul>
      </main>
      <footer className="relative z-10 flex items-center justify-center gap-3 px-6 py-7 text-xs text-muted">
        <img src={COMPANY.logoSrc} alt="" className="h-8 w-auto rounded-md bg-white px-1.5 py-0.5" />
        <span>{t("brand")}</span>
        <span aria-hidden="true">·</span>
        <span>{COMPANY.website}</span>
      </footer>
    </div>
  );
}
