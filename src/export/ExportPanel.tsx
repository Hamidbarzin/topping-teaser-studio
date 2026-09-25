import { useState } from "react";
import { Field, SelectInput } from "../components/Controls";
import { exportPixelSize, resolveFormatSize } from "../formats/formatPresets";
import { useSettings } from "../hooks/useSettings";
import { useStudio } from "../hooks/useStudio";
import { useToast } from "../hooks/useToast";
import type { ExportFileFormat, ExportFps, ExportQuality, ExportResolution } from "../types";
import { COMPANY } from "../branding/company";
import { exportTeaser } from "./VideoExporter";

export function ExportPanel({ onClose }: { onClose: () => void }) {
  const { t } = useSettings();
  const { notify } = useToast();
  const { project, patchProject, drawables, elementsRef } = useStudio();
  const [progress, setProgress] = useState<number | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [extension, setExtension] = useState<ExportFileFormat>("mp4");
  const [format, setFormat] = useState<ExportFileFormat>("mp4");
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<typeof project.exportSettings>) => {
    patchProject((current) => ({ ...current, exportSettings: { ...current.exportSettings, ...patch } }));
  };

  const render = async () => {
    if (project.clips.length === 0) {
      setError(t("exportEmpty"));
      notify(t("exportEmpty"), "error");
      return;
    }
    setError(null);
    setDownloadUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setProgress(0);
    try {
      const logo = await loadLogo();
      const result = await exportTeaser({
        project,
        media: drawables,
        elements: elementsRef.current,
        logo,
        settings: project.exportSettings,
        format,
        onProgress: setProgress,
      });
      if (!result.blob || result.blob.size < 32) {
        throw new Error(t("exportFailed"));
      }
      setExtension(result.extension);
      const url = URL.createObjectURL(result.blob);
      setDownloadUrl(url);
      setProgress(1);
      if (format === "mp4" && result.extension === "png") {
        notify(t("mp4Unavailable"), "error");
      } else {
        notify(t("exportReady"));
      }
    } catch (caught) {
      setProgress(null);
      const message = caught instanceof Error ? caught.message : t("exportFailed");
      setError(message === "mp4" || message === "canvas" || message === "empty" || message === "png" ? t("exportFailed") : message);
      notify(t("exportFailed"), "error");
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={t("export")}>
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-panel p-5 shadow-[var(--brand-shadow)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg">{t("export")}</h2>
          <button type="button" onClick={onClose} className="rounded-xl border border-line px-3 py-1.5 text-sm">{t("close")}</button>
        </div>
        <Field label={t("fileFormat")}>
          <SelectInput value={format} aria-label={t("fileFormat")} onChange={(event) => setFormat(event.target.value as ExportFileFormat)}>
            <option value="mp4">{t("exportMp4")}</option>
            <option value="png">{t("exportPng")}</option>
          </SelectInput>
        </Field>
        {(() => {
          const design = resolveFormatSize(project.formatId, project.customWidth, project.customHeight);
          const pixels = exportPixelSize(design.width, design.height, project.exportSettings.resolution);
          const instagram = pixels.width === 1080 && pixels.height === 1920;
          return (
            <p className={`mb-3 rounded-2xl bg-navy/50 px-3 py-2 text-sm ${instagram ? "text-cyan" : "text-ink"}`}>
              {pixels.width} × {pixels.height}
              {instagram ? " · Instagram Reel" : ""}
            </p>
          );
        })()}
        <Field label={t("resolution")}>
          <SelectInput value={project.exportSettings.resolution} aria-label={t("resolution")} onChange={(event) => update({ resolution: event.target.value as ExportResolution })}>
            <option value="720p">720p</option>
            <option value="1080p">1080p</option>
          </SelectInput>
        </Field>
        {format === "mp4" ? <Field label={t("frameRate")}>
          <SelectInput value={project.exportSettings.fps} aria-label={t("frameRate")} onChange={(event) => update({ fps: Number(event.target.value) as ExportFps })}>
            <option value={24}>24 FPS</option>
            <option value={30}>30 FPS</option>
            <option value={60}>60 FPS</option>
          </SelectInput>
        </Field> : null}
        {format === "mp4" ? <Field label={t("quality")}>
          <SelectInput value={project.exportSettings.quality} aria-label={t("quality")} onChange={(event) => update({ quality: event.target.value as ExportQuality })}>
            <option value="low">{t("low")}</option>
            <option value="medium">{t("medium")}</option>
            <option value="high">{t("high")}</option>
          </SelectInput>
        </Field> : null}
        <p className="mb-3 text-xs text-muted">{t("renderingHint")}</p>
        <button type="button" disabled={progress !== null && progress < 1} onClick={() => void render()} className="w-full rounded-2xl bg-blue px-3 py-3 text-sm font-semibold text-[#1d1f56] disabled:opacity-60">
          {progress !== null && progress < 1 ? t("rendering") : t("export")}
        </button>
        {progress !== null ? (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>{progress >= 1 ? t("done") : t("rendering")}</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-navy" aria-label={t("progress")}>
              <div className="h-full bg-cyan" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          </div>
        ) : null}
        {error ? <p className="mt-3 rounded-2xl border border-maple/40 bg-navy/50 px-3 py-2 text-sm text-ink">{error}</p> : null}
        {downloadUrl ? (
          <div className="mt-3">
            <p className="mb-2 text-center text-sm text-cyan">{t("exportReady")}</p>
            <a
              className="block rounded-2xl bg-blue px-3 py-3 text-center text-sm font-semibold text-[#1d1f56]"
              href={downloadUrl}
              download={`${(project.name || "Topping_Teaser").replace(/\s+/g, "_")}.${extension}`}
            >
              {t("download")} · {extension.toUpperCase()}
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = COMPANY.logoSrc;
  });
}
