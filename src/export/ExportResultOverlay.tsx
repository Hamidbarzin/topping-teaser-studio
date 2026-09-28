import { useSettings } from "../hooks/useSettings";
import { useStudio } from "../hooks/useStudio";
import { useToast } from "../hooks/useToast";
import { isEmbeddedBrowser, saveToDownloads } from "./saveStudioFile";

export function ExportResultOverlay() {
  const { t } = useSettings();
  const { notify } = useToast();
  const { lastExport, exportProgress, clearLastExport } = useStudio();
  if (!lastExport && exportProgress === null) return null;
  const embedded = isEmbeddedBrowser();

  const saveAs = () => {
    if (!lastExport) return;
    void saveToDownloads(lastExport.blob, lastExport.filename).then((saved) => {
      if (saved) notify(t("savedToFolder", { path: saved }));
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={t("export")}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-auto rounded-3xl border border-white/10 bg-panel p-5 shadow-[var(--brand-shadow)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg">{lastExport?.filename ?? t("rendering")}</h2>
          <button type="button" onClick={clearLastExport} className="rounded-xl border border-line px-3 py-1.5 text-sm">{t("close")}</button>
        </div>
        {exportProgress !== null && exportProgress < 1 && !lastExport ? (
          <div className="mb-3">
            <p className="mb-2 text-sm text-muted">{t("rendering")}</p>
            <div className="h-2 overflow-hidden rounded-full bg-navy">
              <div className="h-full bg-cyan" style={{ width: `${Math.round(exportProgress * 100)}%` }} />
            </div>
          </div>
        ) : null}
        {embedded ? (
          <p className="mb-3 rounded-2xl bg-navy/50 px-3 py-2 text-sm text-cyan">{t("cursorBrowserHint")}</p>
        ) : null}
        {lastExport?.kind === "png" ? (
          <img src={lastExport.href} alt="" className="mb-3 w-full rounded-2xl border border-white/10" />
        ) : null}
        {lastExport?.kind === "mp4" ? (
          <video src={lastExport.href} controls playsInline className="mb-3 w-full rounded-2xl border border-white/10" />
        ) : null}
        {lastExport ? (
          <div className="grid gap-2">
            <button type="button" onClick={saveAs} className="w-full rounded-2xl bg-blue px-3 py-3 text-sm font-semibold text-[#1d1f56]">
              {lastExport.kind === "png" ? t("savePngAs") : t("saveMp4As")}
            </button>
            <a
              href={lastExport.href}
              download={lastExport.filename}
              className="block w-full rounded-2xl bg-cyan px-3 py-3 text-center text-sm font-semibold text-[#1d1f56]"
            >
              {t("download")}
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
