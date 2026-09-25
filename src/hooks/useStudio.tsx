import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type {
  DrawableMedia,
  MediaAsset,
  Project,
  StoredMedia,
  TextOverlay,
  TimelineClip,
  ToolId,
} from "../types";
import { createId } from "../utils/id";
import { inspectFile, loadImage, loadVideoMeta, makeThumbnail } from "../utils/media";
import { deleteMedia, saveMedia, saveProject, loadProjectMedia } from "../projects/projectStorage";
import { normalizeBranding } from "../branding/brandingPresets";
import { useSettings } from "./useSettings";
import { useToast } from "./useToast";

interface StudioValue {
  project: Project;
  media: MediaAsset[];
  tool: ToolId;
  selectedClipId: string | null;
  selectedTextId: string | null;
  elementsRef: RefObject<Map<string, HTMLImageElement | HTMLVideoElement>>;
  drawables: Map<string, DrawableMedia>;
  setTool: (tool: ToolId) => void;
  selectClip: (id: string | null) => void;
  selectText: (id: string | null) => void;
  rename: (name: string) => void;
  patchProject: (recipe: (project: Project) => Project) => void;
  addFiles: (files: File[]) => Promise<void>;
  removeClip: (clipId: string) => void;
  duplicateClip: (clipId: string) => void;
  moveClip: (clipId: string, direction: -1 | 1) => void;
  reorderClip: (fromIndex: number, toIndex: number) => void;
  updateClip: (clipId: string, patch: Partial<TimelineClip>) => void;
  updateText: (textId: string, patch: Partial<TextOverlay>) => void;
  addText: () => void;
  removeText: (textId: string) => void;
  save: () => Promise<void>;
  busy: boolean;
}

const StudioContext = createContext<StudioValue | null>(null);

export function StudioProvider({ project: initial, children }: { project: Project; children: ReactNode }) {
  const { t, settings } = useSettings();
  const { notify } = useToast();
  const [project, setProject] = useState(() => ({
    ...initial,
    branding: normalizeBranding(initial.branding),
  }));
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [tool, setTool] = useState<ToolId>("media");
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [readyTick, setReadyTick] = useState(0);
  const dirty = useRef(false);
  const elementsRef = useRef(new Map<string, HTMLImageElement | HTMLVideoElement>());
  const projectRef = useRef(project);
  projectRef.current = project;

  const patchProject = useCallback((recipe: (current: Project) => Project) => {
    dirty.current = true;
    setProject((current) => recipe(current));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];
    loadProjectMedia(initial.id)
      .then((assets) => {
        if (cancelled) {
          assets.forEach((asset) => {
            URL.revokeObjectURL(asset.objectUrl);
            URL.revokeObjectURL(asset.thumbnailUrl);
          });
          return;
        }
        created.push(...assets.flatMap((asset) => [asset.objectUrl, asset.thumbnailUrl]));
        setMedia(assets);
      })
      .catch(() => notify(t("storageFailed"), "error"));
    return () => {
      cancelled = true;
      for (const element of elementsRef.current.values()) {
        if (element instanceof HTMLVideoElement) {
          element.pause();
          element.removeAttribute("src");
          element.load();
        }
      }
      elementsRef.current.clear();
      created.forEach((url) => URL.revokeObjectURL(url));
    };
      // Reload only when the project changes. Language updates must not revoke media URLs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.id]);

  useEffect(() => {
    const known = new Set(media.map((asset) => asset.id));
    for (const [id, element] of elementsRef.current) {
      if (!known.has(id)) {
        if (element instanceof HTMLVideoElement) {
          element.pause();
          element.removeAttribute("src");
          element.load();
        }
        elementsRef.current.delete(id);
      }
    }
    for (const asset of media) {
      if (elementsRef.current.has(asset.id)) continue;
      if (asset.kind === "image") {
        const image = new Image();
        image.onload = () => setReadyTick((value) => value + 1);
        image.onerror = () => notify(t("canvasError"), "error");
        image.src = asset.objectUrl;
        elementsRef.current.set(asset.id, image);
      } else {
        const video = document.createElement("video");
        video.preload = "auto";
        video.playsInline = true;
        video.muted = false;
        video.onloadeddata = () => setReadyTick((value) => value + 1);
        video.onerror = () => notify(t("videoLoadFailed"), "error");
        video.src = asset.objectUrl;
        elementsRef.current.set(asset.id, video);
      }
    }
  }, [media, notify, t]);

  const drawables = useMemo(() => {
    const map = new Map<string, DrawableMedia>();
    if (readyTick < 0) return map;
    for (const asset of media) {
      const element = elementsRef.current.get(asset.id) ?? null;
      map.set(asset.id, {
        kind: asset.kind,
        source: element,
        width: asset.width,
        height: asset.height,
      });
    }
    return map;
  }, [media, readyTick]);

  const save = useCallback(async () => {
    try {
      await saveProject(projectRef.current);
      dirty.current = false;
      notify(t("saved"));
    } catch {
      notify(t("saveFailed"), "error");
    }
  }, [notify, t]);

  useEffect(() => {
    if (!settings.autoSave || !dirty.current) return undefined;
    const timer = window.setTimeout(() => {
      saveProject(projectRef.current)
        .then(() => {
          dirty.current = false;
        })
        .catch(() => notify(t("saveFailed"), "error"));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [project, notify, t, settings.autoSave]);

  const addFiles = useCallback(
    async (files: File[]) => {
      setBusy(true);
      try {
        for (const file of files) {
          const inspected = inspectFile(file);
          if ("error" in inspected) {
            notify(inspected.error === "large" ? t("fileTooLarge") : t("unsupportedFile"), "error");
            continue;
          }
          const objectUrl = URL.createObjectURL(file);
          try {
            let width = 1080;
            let height = 1920;
            let intrinsicDurationMs = 3000;
            if (inspected.kind === "image") {
              const image = await loadImage(objectUrl);
              width = image.naturalWidth || 1080;
              height = image.naturalHeight || 1080;
            } else {
              const meta = await loadVideoMeta(objectUrl);
              width = meta.width;
              height = meta.height;
              intrinsicDurationMs = meta.durationMs;
            }
            const thumbnail = await makeThumbnail(inspected.kind, objectUrl, width, height);
            const id = createId();
            const record: StoredMedia = {
              id,
              projectId: projectRef.current.id,
              name: sanitizeText(file.name, 120),
              kind: inspected.kind,
              mimeType: file.type || "application/octet-stream",
              intrinsicDurationMs,
              width,
              height,
              blob: file,
              thumbnail,
            };
            await saveMedia(record);
            const asset: MediaAsset = {
              id,
              projectId: record.projectId,
              name: record.name,
              kind: record.kind,
              mimeType: record.mimeType,
              intrinsicDurationMs,
              width,
              height,
              objectUrl,
              thumbnailUrl: URL.createObjectURL(thumbnail),
            };
            const clip: TimelineClip = {
              id: createId(),
              mediaId: id,
              durationMs: inspected.kind === "image" ? 3000 : intrinsicDurationMs,
              transition: { type: "dissolve", durationMs: 400 },
              animation: inspected.kind === "image" ? "kenBurns" : "none",
            };
            setMedia((current) => [...current, asset]);
            patchProject((current) => ({ ...current, clips: [...current.clips, clip] }));
            setSelectedClipId(clip.id);
            notify(t("mediaAdded"));
          } catch {
            URL.revokeObjectURL(objectUrl);
            notify(inspected.kind === "video" ? t("invalidVideo") : t("canvasError"), "error");
          }
        }
      } finally {
        setBusy(false);
      }
    },
    [notify, patchProject, t],
  );

  const removeClip = useCallback(
    (clipId: string) => {
      const clip = projectRef.current.clips.find((item) => item.id === clipId);
      if (!clip) return;
      const stillUsed = projectRef.current.clips.some((item) => item.id !== clipId && item.mediaId === clip.mediaId);
      patchProject((current) => ({ ...current, clips: current.clips.filter((item) => item.id !== clipId) }));
      setSelectedClipId((current) => (current === clipId ? null : current));
      if (!stillUsed) {
        const asset = media.find((item) => item.id === clip.mediaId);
        if (asset) {
          URL.revokeObjectURL(asset.objectUrl);
          URL.revokeObjectURL(asset.thumbnailUrl);
        }
        setMedia((current) => current.filter((item) => item.id !== clip.mediaId));
        void deleteMedia(clip.mediaId).catch(() => notify(t("storageFailed"), "error"));
      }
      notify(t("removed"));
    },
    [media, notify, patchProject, t],
  );

  const duplicateClip = useCallback(
    (clipId: string) => {
      const index = projectRef.current.clips.findIndex((item) => item.id === clipId);
      const clip = projectRef.current.clips[index];
      if (!clip) return;
      const copy: TimelineClip = { ...clip, id: createId(), transition: { ...clip.transition } };
      patchProject((current) => {
        const clips = [...current.clips];
        clips.splice(index + 1, 0, copy);
        return { ...current, clips };
      });
      setSelectedClipId(copy.id);
      notify(t("copied"));
    },
    [notify, patchProject, t],
  );

  const reorderClip = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      patchProject((current) => {
        const clips = [...current.clips];
        const [moved] = clips.splice(fromIndex, 1);
        if (!moved) return current;
        clips.splice(toIndex, 0, moved);
        return { ...current, clips };
      });
    },
    [patchProject],
  );

  const moveClip = useCallback(
    (clipId: string, direction: -1 | 1) => {
      const index = projectRef.current.clips.findIndex((item) => item.id === clipId);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= projectRef.current.clips.length) return;
      reorderClip(index, next);
    },
    [reorderClip],
  );

  const updateClip = useCallback(
    (clipId: string, patch: Partial<TimelineClip>) => {
      patchProject((current) => ({
        ...current,
        clips: current.clips.map((clip) => (clip.id === clipId ? { ...clip, ...patch } : clip)),
      }));
    },
    [patchProject],
  );

  const addText = useCallback(() => {
    const overlay: TextOverlay = {
      id: createId(),
      text: t("brand"),
      fontFamily: "Sora",
      fontSize: 64,
      fontWeight: 600,
      color: "#FFFFFF",
      x: 0.5,
      y: 0.72,
      align: "center",
      opacity: 1,
      backgroundColor: "#050B14",
      backgroundOpacity: 0,
      borderColor: "#00D9FF",
      borderWidth: 0,
      shadow: true,
      letterSpacing: 1,
      animation: "fade",
      startMs: 0,
      endMs: 4000,
    };
    patchProject((current) => ({ ...current, texts: [...current.texts, overlay] }));
    setSelectedTextId(overlay.id);
    setTool("text");
  }, [patchProject, t]);

  const updateText = useCallback(
    (textId: string, patch: Partial<TextOverlay>) => {
      patchProject((current) => ({
        ...current,
        texts: current.texts.map((item) =>
          item.id === textId ? { ...item, ...patch, text: patch.text === undefined ? item.text : sanitizeText(patch.text) } : item,
        ),
      }));
    },
    [patchProject],
  );

  const removeText = useCallback(
    (textId: string) => {
      patchProject((current) => ({ ...current, texts: current.texts.filter((item) => item.id !== textId) }));
      setSelectedTextId((current) => (current === textId ? null : current));
    },
    [patchProject],
  );

  const value = useMemo<StudioValue>(
    () => ({
      project,
      media,
      tool,
      selectedClipId,
      selectedTextId,
      elementsRef,
      drawables,
      setTool,
      selectClip: setSelectedClipId,
      selectText: setSelectedTextId,
      rename: (name) => patchProject((current) => ({ ...current, name: sanitizeText(name, 80) || current.name })),
      patchProject,
      addFiles,
      removeClip,
      duplicateClip,
      moveClip,
      reorderClip,
      updateClip,
      updateText,
      addText,
      removeText,
      save,
      busy,
    }),
    [
      project,
      media,
      tool,
      selectedClipId,
      selectedTextId,
      drawables,
      patchProject,
      addFiles,
      removeClip,
      duplicateClip,
      moveClip,
      reorderClip,
      updateClip,
      updateText,
      addText,
      removeText,
      save,
      busy,
    ],
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio(): StudioValue {
  const value = useContext(StudioContext);
  if (!value) throw new Error("Studio missing");
  return value;
}
