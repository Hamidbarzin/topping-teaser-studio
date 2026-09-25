import { createBranding } from "../branding/brandingPresets";
import type { AppSettings, ExportQuality, MediaAsset, Project, StoredMedia } from "../types";
import { createId } from "../utils/id";

const DB_NAME = "topping-teaser-studio";
const DB_VERSION = 1;
const SETTINGS_KEY = "topping-settings";

const DEFAULT_SETTINGS: AppSettings = {
  language: "en",
  theme: "dark",
  defaultFormatId: "reel",
  defaultExportQuality: "high",
  autoSave: true,
  brandingEnabledByDefault: true,
};

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("storage"));
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("projects")) {
        db.createObjectStore("projects", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("media")) {
        const store = db.createObjectStore("media", { keyPath: "id" });
        store.createIndex("projectId", "projectId");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("storage"));
  });
}

export function readSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function writeSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function createEmptyProject(settings: AppSettings, name: string): Project {
  const now = Date.now();
  return {
    id: createId(),
    name,
    createdAt: now,
    updatedAt: now,
    formatId: settings.defaultFormatId,
    customWidth: 1080,
    customHeight: 1920,
    clips: [],
    branding: createBranding(settings.brandingEnabledByDefault),
    texts: [],
    exportSettings: {
      resolution: "1080p",
      fps: 30,
      quality: settings.defaultExportQuality,
    },
  };
}

export async function saveProject(project: Project): Promise<void> {
  const db = await openDb();
  const next = { ...project, updatedAt: Date.now() };
  await requestToPromise(db.transaction("projects", "readwrite").objectStore("projects").put(next));
  db.close();
}

export async function listProjects(): Promise<Project[]> {
  const db = await openDb();
  const rows = await requestToPromise(db.transaction("projects").objectStore("projects").getAll());
  db.close();
  return (rows as Project[]).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getProject(id: string): Promise<Project | null> {
  const db = await openDb();
  const row = await requestToPromise(db.transaction("projects").objectStore("projects").get(id));
  db.close();
  return (row as Project | undefined) ?? null;
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(["projects", "media"], "readwrite");
  tx.objectStore("projects").delete(id);
  const index = tx.objectStore("media").index("projectId");
  const media = (await requestToPromise(index.getAll(id))) as StoredMedia[];
  for (const item of media) tx.objectStore("media").delete(item.id);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("storage"));
  });
  db.close();
}

export async function saveMedia(record: StoredMedia): Promise<void> {
  const db = await openDb();
  await requestToPromise(db.transaction("media", "readwrite").objectStore("media").put(record));
  db.close();
}

export async function deleteMedia(id: string): Promise<void> {
  const db = await openDb();
  await requestToPromise(db.transaction("media", "readwrite").objectStore("media").delete(id));
  db.close();
}

export async function loadProjectMedia(projectId: string): Promise<MediaAsset[]> {
  const db = await openDb();
  const rows = (await requestToPromise(
    db.transaction("media").objectStore("media").index("projectId").getAll(projectId),
  )) as StoredMedia[];
  db.close();
  return rows.map((row) => ({
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    kind: row.kind,
    mimeType: row.mimeType,
    intrinsicDurationMs: row.intrinsicDurationMs,
    width: row.width,
    height: row.height,
    objectUrl: URL.createObjectURL(row.blob),
    thumbnailUrl: URL.createObjectURL(row.thumbnail),
  }));
}

export async function duplicateProjectRecord(source: Project, name: string): Promise<Project> {
  const copy = createEmptyProject(readSettings(), name);
  copy.formatId = source.formatId;
  copy.customWidth = source.customWidth;
  copy.customHeight = source.customHeight;
  copy.branding = structuredClone(source.branding);
  copy.texts = source.texts.map((text) => ({ ...text, id: createId() }));
  copy.exportSettings = { ...source.exportSettings };
  const db = await openDb();
  const media = (await requestToPromise(
    db.transaction("media").objectStore("media").index("projectId").getAll(source.id),
  )) as StoredMedia[];
  const idMap = new Map<string, string>();
  const tx = db.transaction("media", "readwrite");
  for (const item of media) {
    const id = createId();
    idMap.set(item.id, id);
    tx.objectStore("media").put({ ...item, id, projectId: copy.id, blob: item.blob, thumbnail: item.thumbnail });
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("storage"));
  });
  db.close();
  copy.clips = source.clips.map((clip) => ({
    ...clip,
    id: createId(),
    mediaId: idMap.get(clip.mediaId) ?? clip.mediaId,
    transition: { ...clip.transition },
  }));
  await saveProject(copy);
  return copy;
}

export function qualityBitrate(quality: ExportQuality, pixels: number): number {
  const base = quality === "low" ? 2_500_000 : quality === "medium" ? 5_000_000 : 8_000_000;
  return Math.round(base * Math.max(0.45, pixels / (1080 * 1920)));
}
