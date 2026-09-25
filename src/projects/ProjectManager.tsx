import { useEffect, useState } from "react";
import type { Project } from "../types";
import { Field, TextInput } from "../components/Controls";
import { useSettings } from "../hooks/useSettings";
import { deleteProject, duplicateProjectRecord, listProjects } from "./projectStorage";
import { useToast } from "../hooks/useToast";

export function ProjectManager({
  open,
  onClose,
  onOpen,
  onSaveAs,
}: {
  open: boolean;
  onClose: () => void;
  onOpen: (project: Project) => void;
  onSaveAs: (name: string) => void;
}) {
  const { t } = useSettings();
  const { notify } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    listProjects().then(setProjects).catch(() => notify(t("storageFailed"), "error"));
  }, [open, notify, t]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={t("projects")}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl border border-line bg-panel p-4 shadow-[var(--brand-shadow)]">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg">{t("projects")}</h2>
          <button type="button" onClick={onClose} className="rounded-lg border border-line px-2 py-1 text-sm">{t("close")}</button>
        </div>
        <Field label={t("saveAs")}>
          <div className="flex gap-2">
            <TextInput value={name} aria-label={t("projectName")} onChange={(event) => setName(event.target.value)} />
            <button type="button" className="rounded-lg bg-blue px-3 py-2 text-sm text-white" onClick={() => name.trim() && onSaveAs(name.trim())}>{t("save")}</button>
          </div>
        </Field>
        {projects.length === 0 ? <p className="text-sm text-muted">{t("noProjects")}</p> : null}
        <ul className="flex flex-col gap-2">
          {projects.map((project) => (
            <li key={project.id} className="rounded-xl border border-line p-3">
              <p className="font-medium">{project.name}</p>
              <p className="text-xs text-muted">{t("clipCount", { n: project.clips.length })} · {new Date(project.updatedAt).toLocaleString()}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="rounded-lg border border-line px-2 py-1 text-xs" onClick={() => onOpen(project)}>{t("open")}</button>
                <button
                  type="button"
                  className="rounded-lg border border-line px-2 py-1 text-xs"
                  onClick={() => {
                    void duplicateProjectRecord(project, `${project.name} 2`)
                      .then((copy) => {
                        notify(t("duplicatedProject"));
                        onOpen(copy);
                      })
                      .catch(() => notify(t("storageFailed"), "error"));
                  }}
                >
                  {t("duplicate")}
                </button>
                {pendingDelete === project.id ? (
                  <>
                    <button type="button" className="rounded-lg border border-maple px-2 py-1 text-xs" onClick={() => {
                      void deleteProject(project.id)
                        .then(() => {
                          setProjects((current) => current.filter((item) => item.id !== project.id));
                          setPendingDelete(null);
                          notify(t("deletedProject"));
                        })
                        .catch(() => notify(t("storageFailed"), "error"));
                    }}>{t("confirm")}</button>
                    <button type="button" className="rounded-lg border border-line px-2 py-1 text-xs" onClick={() => setPendingDelete(null)}>{t("cancel")}</button>
                  </>
                ) : (
                  <button type="button" className="rounded-lg border border-line px-2 py-1 text-xs" onClick={() => setPendingDelete(project.id)}>{t("delete")}</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
