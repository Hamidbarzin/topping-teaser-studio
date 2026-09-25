import { IMAGE_DURATIONS } from "../media/mediaTypes";
import { useSettings } from "../hooks/useSettings";
import { useStudio } from "../hooks/useStudio";
import { ToolBody } from "./EditorSidebar";

export function EditorInspector() {
  const { t } = useSettings();
  const { project, media, selectedClipId, updateClip, tool } = useStudio();
  const clip = project.clips.find((item) => item.id === selectedClipId) ?? null;
  const asset = media.find((item) => item.id === clip?.mediaId);
  return (
    <aside className="hidden min-h-0 flex-col border-s border-line bg-panel lg:flex" aria-label={t("inspector")}>
      <div className="border-b border-line px-3 py-2 text-xs tracking-wide text-muted uppercase">{t("inspector")}</div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {clip && asset?.kind === "image" && (tool === "media" || tool === "timeline") ? (
          <div className="mb-4">
            <p className="mb-2 text-xs text-muted">{t("imageDuration")}</p>
            <div className="flex flex-wrap gap-2">
              {IMAGE_DURATIONS.map((duration) => (
                <button
                  key={duration}
                  type="button"
                  onClick={() => updateClip(clip.id, { durationMs: duration })}
                  className={`rounded-lg border px-2 py-1 text-xs ${clip.durationMs === duration ? "border-cyan bg-blue/20" : "border-line"}`}
                >
                  {t("seconds", { n: duration / 1000 })}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {clip && asset?.kind === "video" && (tool === "media" || tool === "timeline") ? (
          <p className="mb-3 text-xs text-muted">{t("videoDuration")}</p>
        ) : null}
        <ToolBody detailed />
      </div>
    </aside>
  );
}
