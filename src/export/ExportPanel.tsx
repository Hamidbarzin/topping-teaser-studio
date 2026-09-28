import { useEffect, useState } from "react";
import { Field, SelectInput } from "../components/Controls";
import { findSocialPreset, resolveFormatSize } from "../formats/formatPresets";
import { SocialTargetPicker } from "../formats/SocialTargetPicker";
import { useSettings } from "../hooks/useSettings";
import { useStudio } from "../hooks/useStudio";
import { useToast } from "../hooks/useToast";
import type { ExportFps, ExportQuality } from "../types";
import { COMPANY } from "../branding/company";
import { studioFilename } from "./saveStudioFile";
import { exportTeaser } from "./VideoExporter";
import { loadVariantPoster, normalizePortraitPost } from "../templates/portraitPost";

export function ExportPanel({ onClose }: { onClose: () => void }) {
  const { t } = useSettings();
  const { notify } = useToast();
  const { project, patchProject, drawables, elementsRef, previewCanvasRef, downloadPreviewPng } = useStudio();
  const [progress, setProgress] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [href, setHref] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const preset = findSocialPreset(project.formatId, project.exportSettings.fileFormat, project.exportSettings.platform);
  const format = preset.output;
  const size = resolveFormatSize(project.formatId, project.customWidth, project.customHeight);

  useEffect(() => {
    return () => {
      if (href) URL.revokeObjectURL(href);
    };
  }, [href]);

  const render = async () => {
    setError(null);
    setFile(null);
    setHref((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setProgress(0.05);
    try {
      await Promise.race([document.fonts?.ready ?? Promise.resolve(), sleep(800)]);
      const logo = await loadLogo();
      const stockPoster = await loadVariantPoster(normalizePortraitPost(project.post).variantId);
      let result;
      if (format === "png") {
        const blob = await capturePreviewPng(previewCanvasRef.current, size.width, size.height);
        if (blob) {
          result = { blob, extension: "png" as const, mimeType: "image/png" };
        } else {
          result = await exportTeaser({
            project,
            media: drawables,
            elements: elementsRef.current,
            logo,
            stockPoster,
            settings: project.exportSettings,
            format: "png",
            onProgress: setProgress,
          });
        }
      } else {
        result = await exportTeaser({
          project,
          media: drawables,
          elements: elementsRef.current,
          logo,
          stockPoster,
          settings: project.exportSettings,
          format: "mp4",
          onProgress: setProgress,
        });
      }
      if (!result.blob || result.blob.size < 32) {
        throw new Error(t("exportFailed"));
      }
      const next = await fileFromExport(result.blob, project.name, result.extension, result.mimeType, preset.platform);
      const url = URL.createObjectURL(next);
      setFile(next);
      setHref(url);
      setProgress(1);
      if (format === "mp4" && next.name.endsWith(".png")) {
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
      <div className="max-h-[92vh] w-full max-w-md overflow-auto rounded-3xl border border-white/10 bg-panel p-5 shadow-[var(--brand-shadow)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg">{t("export")}</h2>
          <button type="button" onClick={onClose} className="rounded-xl border border-line px-3 py-1.5 text-sm">{t("close")}</button>
        </div>
        <SocialTargetPicker />
        {format === "mp4" ? <Field label={t("frameRate")}>
          <SelectInput value={project.exportSettings.fps} aria-label={t("frameRate")} onChange={(event) => patchProject((current) => ({ ...current, exportSettings: { ...current.exportSettings, fps: Number(event.target.value) as ExportFps } }))}>
            <option value={24}>24 FPS</option>
            <option value={30}>30 FPS</option>
            <option value={60}>60 FPS</option>
          </SelectInput>
        </Field> : null}
        {format === "mp4" ? <Field label={t("quality")}>
          <SelectInput value={project.exportSettings.quality} aria-label={t("quality")} onChange={(event) => patchProject((current) => ({ ...current, exportSettings: { ...current.exportSettings, quality: event.target.value as ExportQuality } }))}>
            <option value="low">{t("low")}</option>
            <option value="medium">{t("medium")}</option>
            <option value="high">{t("high")}</option>
          </SelectInput>
        </Field> : null}
        <p className="mb-3 mt-3 text-xs text-muted">{t("renderingHint")}</p>
        <p className="mb-3 text-xs text-muted">{size.width} × {size.height}</p>
        <button type="button" onClick={() => {
          if (format === "png") {
            downloadPreviewPng();
            return;
          }
          void render();
        }} className="w-full rounded-2xl bg-blue px-3 py-3 text-sm font-semibold text-[#1d1f56] disabled:opacity-60" disabled={progress !== null && progress < 1}>
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
        {file && href ? (
          <div className="mt-3">
            {file.type.startsWith("image/") ? (
              <img src={href} alt="" className="mb-3 w-full rounded-2xl border border-white/10" />
            ) : null}
            <p className="mb-2 text-center text-sm text-cyan">{t("exportReady")}</p>
            <a
              className="block rounded-2xl bg-blue px-3 py-3 text-center text-sm font-semibold text-[#1d1f56]"
              href={href}
              download={file.name}
            >
              {t("download")} · {file.name.split(".").pop()?.toUpperCase()}
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function capturePreviewPng(canvas: HTMLCanvasElement | null, width: number, height: number): Promise<Blob | null> {
  if (!canvas || canvas.width !== width || canvas.height !== height) return Promise.resolve(null);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob && blob.size > 32 ? blob : null), "image/png");
  });
}

async function fileFromExport(
  blob: Blob,
  name: string,
  extension: "png" | "mp4" | "webm",
  mimeType: string,
  platform: string,
): Promise<File> {
  const head = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
  const png = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  const mp4 = String.fromCharCode(head[4] ?? 0, head[5] ?? 0, head[6] ?? 0, head[7] ?? 0) === "ftyp";
  if (png) return new File([blob], studioFilename(name, "png", platform), { type: "image/png" });
  if (mp4) return new File([blob], studioFilename(name, "mp4", platform), { type: "video/mp4" });
  if (extension === "webm" || mimeType.includes("webm")) {
    return new File([blob], studioFilename(name, "webm", platform), { type: "video/webm" });
  }
  if (extension === "png" || mimeType.includes("png")) {
    return new File([blob], studioFilename(name, "png", platform), { type: "image/png" });
  }
  throw new Error("mp4");
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = COMPANY.logoSrc;
  });
}
