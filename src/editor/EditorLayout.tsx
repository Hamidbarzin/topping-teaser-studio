import { useEffect, useState } from "react";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { EditorCanvas } from "./EditorCanvas";
import { EditorHeader } from "./EditorHeader";
import { EditorInspector } from "./EditorInspector";
import { EditorSidebar, ToolBody } from "./EditorSidebar";
import { Timeline } from "../timeline/Timeline";
import { ExportPanel } from "../export/ExportPanel";
import { SettingsPanel } from "../settings/SettingsPanel";
import { ProjectManager } from "../projects/ProjectManager";
import { usePlayback } from "../hooks/usePlayback";
import { useSettings } from "../hooks/useSettings";
import { useStudio } from "../hooks/useStudio";
import { layoutClips } from "../utils/timeline";
import { createEmptyProject, duplicateProjectRecord, readSettings, saveProject } from "../projects/projectStorage";
import type { Project } from "../types";

export function EditorLayout({
  onHome,
  onReplace,
}: {
  onHome: () => void;
  onReplace: (project: Project) => void;
}) {
  const { t } = useSettings();
  const studio = useStudio();
  const duration = layoutClips(studio.project.clips).durationMs;
  const playback = usePlayback(duration);
  const [exportOpen, setExportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === " ") {
        event.preventDefault();
        playback.toggle();
      }
      if ((event.key === "Delete" || event.key === "Backspace") && studio.selectedClipId) {
        studio.removeClip(studio.selectedClipId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playback, studio]);

  return (
    <div className="flex h-dvh flex-col bg-navy text-ink">
      <EditorHeader
        onHome={onHome}
        onNew={() => {
          const next = createEmptyProject(readSettings(), t("untitled"));
          void saveProject(next).then(() => onReplace(next));
        }}
        onOpen={() => setProjectsOpen(true)}
        onExport={() => {
          playback.setPlaying(false);
          setExportOpen(true);
        }}
        onSettings={() => setSettingsOpen(true)}
      />
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_300px]">
        <div className="hidden min-h-0 lg:flex lg:flex-col">
          <EditorSidebar />
        </div>
        <main className="min-h-[46vh] bg-[radial-gradient(circle_at_20%_0%,rgba(247,147,30,0.14),transparent_36%),radial-gradient(circle_at_80%_20%,rgba(80,100,200,0.18),transparent_40%),var(--brand-navy)] lg:min-h-0">
          <ErrorBoundary
            fallback={
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted">
                {t("canvasError")}
              </div>
            }
          >
            <EditorCanvas timeMs={playback.timeMs} playing={playback.playing} muted={playback.muted} />
          </ErrorBoundary>
        </main>
        <EditorInspector />
        <div className="max-h-64 overflow-auto border-t border-line bg-panel p-3 lg:hidden">
          <EditorSidebar />
          <div className="mt-3">
            <ToolBody detailed />
          </div>
        </div>
      </div>
      <Timeline
        timeMs={playback.timeMs}
        playing={playback.playing}
        muted={playback.muted}
        onToggle={playback.toggle}
        onRestart={playback.restart}
        onMute={() => playback.setMuted((value) => !value)}
        onSeek={playback.seek}
      />
      {exportOpen ? <ExportPanel onClose={() => setExportOpen(false)} /> : null}
      {settingsOpen ? <SettingsPanel onClose={() => setSettingsOpen(false)} /> : null}
      <ProjectManager
        open={projectsOpen}
        onClose={() => setProjectsOpen(false)}
        onOpen={(project) => {
          setProjectsOpen(false);
          onReplace(project);
        }}
        onSaveAs={(name) => {
          void duplicateProjectRecord(studio.project, name).then((copy) => {
            setProjectsOpen(false);
            onReplace(copy);
          });
        }}
      />
    </div>
  );
}
