import type { ToolId } from "../types";
import { MediaLibrary } from "../media/MediaLibrary";
import { BrandingPanel } from "../branding/BrandingPanel";
import { TextPanel } from "../text/TextPanel";
import { AnimationPanel } from "../animation/AnimationPanel";
import { TransitionPanel } from "../transitions/TransitionPanel";
import { FormatPanel } from "../formats/FormatPanel";
import { useSettings } from "../hooks/useSettings";
import { useStudio } from "../hooks/useStudio";
import type { MessageKey } from "../i18n";

const TOOLS: Array<{ id: ToolId; key: MessageKey }> = [
  { id: "media", key: "media" },
  { id: "timeline", key: "timeline" },
  { id: "branding", key: "branding" },
  { id: "text", key: "text" },
  { id: "animation", key: "animation" },
  { id: "transitions", key: "transitions" },
  { id: "format", key: "format" },
];

export function EditorSidebar() {
  const { t } = useSettings();
  const { tool, setTool } = useStudio();
  return (
    <aside className="flex min-h-0 flex-col border-line bg-panel lg:border-e" aria-label={t("media")}>
      <div className="flex gap-1 overflow-x-auto border-b border-line p-2 lg:flex-col">
        {TOOLS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={tool === item.id}
            onClick={() => setTool(item.id)}
            className={`rounded-xl px-3 py-2.5 text-start text-sm whitespace-nowrap ${tool === item.id ? "bg-blue font-semibold text-[#1d1f56] shadow-[0_8px_20px_rgba(247,147,30,0.25)]" : "text-muted hover:bg-white/5"}`}
          >
            {t(item.key)}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <ToolBody detailed={false} />
      </div>
    </aside>
  );
}

export function ToolBody({ detailed }: { detailed: boolean }) {
  const { tool, project, media, selectClip, selectedClipId } = useStudio();
  const { t } = useSettings();
  if (tool === "media" || tool === "timeline") {
    return tool === "media" ? <MediaLibrary /> : (
      <div className="flex flex-col gap-2">
        {project.clips.length === 0 ? <p className="text-sm text-muted">{t("emptyTimeline")}</p> : null}
        {project.clips.map((clip) => {
          const asset = media.find((item) => item.id === clip.mediaId);
          return (
            <button key={clip.id} type="button" onClick={() => selectClip(clip.id)} className={`rounded-lg border px-3 py-2 text-start text-sm ${selectedClipId === clip.id ? "border-cyan" : "border-line"}`}>
              {asset?.name ?? clip.id}
            </button>
          );
        })}
      </div>
    );
  }
  if (tool === "branding") return <BrandingPanel detailed={detailed} />;
  if (tool === "text") return <TextPanel detailed={detailed} />;
  if (tool === "animation") return <AnimationPanel />;
  if (tool === "transitions") return <TransitionPanel />;
  return <FormatPanel detailed={detailed} />;
}
