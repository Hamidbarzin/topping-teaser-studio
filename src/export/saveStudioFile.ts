export function downloadBlob(blob: Blob, filename: string): string {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => link.remove(), 0);
  return url;
}

export function nativeDownload(file: File): string {
  return downloadBlob(file, file.name);
}

export function studioFilename(name: string, extension: string, platform = "instagram"): string {
  const stem = (name || "Topping_Post").replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "") || "Topping_Post";
  return `${stem}_${platform}.${extension}`;
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: "image/png" });
}

export function isEmbeddedBrowser(): boolean {
  return /Electron|Cursor|ToDesktop/i.test(navigator.userAgent);
}

export async function saveBlobWithPicker(blob: Blob, filename: string): Promise<"saved" | "cancelled" | "unavailable"> {
  const picker = (
    window as unknown as {
      showSaveFilePicker?: (options: {
        suggestedName: string;
        types: Array<{ description: string; accept: Record<string, string[]> }>;
      }) => Promise<{
        createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }>;
      }>;
    }
  ).showSaveFilePicker;
  if (!picker) return "unavailable";
  const png = filename.endsWith(".png");
  const webm = filename.endsWith(".webm");
  try {
    const handle = await picker({
      suggestedName: filename,
      types: [
        png
          ? { description: "PNG", accept: { "image/png": [".png"] } }
          : webm
            ? { description: "WebM", accept: { "video/webm": [".webm"] } }
            : { description: "MP4", accept: { "video/mp4": [".mp4"] } },
      ],
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return "saved";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    return "unavailable";
  }
}

export async function saveToDownloads(blob: Blob, filename: string): Promise<string | null> {
  const endpoints = [`${import.meta.env.BASE_URL}__export`, "/__export"];
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "X-Filename": filename },
        body: blob,
      });
      if (!response.ok) continue;
      const data = (await response.json()) as { path?: string; filename?: string };
      return data.path ?? data.filename ?? filename;
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function persistStudioFile(blob: Blob, filename: string): Promise<"disk" | "picked" | "link"> {
  const disk = await saveToDownloads(blob, filename);
  if (disk) return "disk";
  const picked = await saveBlobWithPicker(blob, filename);
  if (picked === "saved") return "picked";
  downloadBlob(blob, filename);
  return "link";
}
