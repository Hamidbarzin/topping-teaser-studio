import { COMPANY } from "../branding/company";
import { useSettings } from "../hooks/useSettings";
import { useStudio } from "../hooks/useStudio";

export function EditorHeader({
  onHome,
  onNew,
  onOpen,
  onExport,
  onSettings,
}: {
  onHome: () => void;
  onNew: () => void;
  onOpen: () => void;
  onExport: () => void;
  onSettings: () => void;
}) {
  const { t } = useSettings();
  const { project, rename, save } = useStudio();
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-line bg-navy-2/80 px-3 py-2.5 backdrop-blur-xl">
      <button type="button" onClick={onHome} className="rounded-xl bg-white px-2 py-1.5 shadow-sm" aria-label={t("home")}>
        <img src={COMPANY.logoSrc} alt={t("brand")} className="h-10 w-auto" />
      </button>
      <div className="min-w-0 flex-1 text-center">
        <p className="font-display text-[11px] tracking-[0.22em] text-cyan">{t("appName")}</p>
        <input
          aria-label={t("projectName")}
          value={project.name}
          onChange={(event) => rename(event.target.value)}
          className="w-full max-w-xs bg-transparent text-center text-sm text-ink outline-none"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <GhostButton onClick={onNew}>{t("new")}</GhostButton>
        <GhostButton onClick={onOpen}>{t("open")}</GhostButton>
        <GhostButton onClick={() => void save()}>{t("save")}</GhostButton>
        <button type="button" className="rounded-xl bg-blue px-3 py-2 text-sm font-semibold text-[#1d1f56]" onClick={onExport}>{t("export")}</button>
        <GhostButton onClick={onSettings}>{t("settings")}</GhostButton>
      </div>
    </header>
  );
}

function GhostButton({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button type="button" className="rounded-xl border border-line bg-white/5 px-3 py-2 text-sm hover:bg-white/10" onClick={onClick}>
      {children}
    </button>
  );
}
