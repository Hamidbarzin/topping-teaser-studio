import { useState } from "react";
import { LandingPage } from "./landing/LandingPage";
import { EditorLayout } from "./editor/EditorLayout";
import { ProjectManager } from "./projects/ProjectManager";
import { SettingsProvider } from "./hooks/useSettings";
import { ToastProvider, useToast } from "./hooks/useToast";
import { StudioProvider } from "./hooks/useStudio";
import { useSettings } from "./hooks/useSettings";
import { createEmptyProject, duplicateProjectRecord, readSettings, saveProject } from "./projects/projectStorage";
import type { Project } from "./types";

function Shell() {
  const { t } = useSettings();
  const { notify } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [openList, setOpenList] = useState(false);

  const create = () => {
    const next = createEmptyProject(readSettings(), t("untitled"));
    void saveProject(next).catch(() => notify(t("storageFailed"), "error"));
    setProject(next);
  };

  return (
    <>
      {project ? (
        <StudioProvider project={project} key={project.id}>
          <EditorLayout onHome={() => setProject(null)} onReplace={setProject} />
        </StudioProvider>
      ) : (
        <LandingPage onCreate={create} onOpen={() => setOpenList(true)} />
      )}
      {!project ? (
        <ProjectManager
          open={openList}
          onClose={() => setOpenList(false)}
          onOpen={(next) => {
            setOpenList(false);
            setProject(next);
          }}
          onSaveAs={(name) => {
            const base = createEmptyProject(readSettings(), name);
            void duplicateProjectRecord(base, name)
              .then((copy) => {
                setOpenList(false);
                setProject(copy);
              })
              .catch(() => notify(t("storageFailed"), "error"));
          }}
        />
      ) : null}
    </>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </SettingsProvider>
  );
}
