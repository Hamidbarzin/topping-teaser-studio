import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Plugin } from "vite";

const MAX_BYTES = 400 * 1024 * 1024;

export function exportToDownloadsPlugin(): Plugin {
  return {
    name: "export-to-downloads",
    configureServer(server) {
      server.middlewares.use("/__export", (req, res, next) => {
        if (req.method !== "POST") {
          next();
          return;
        }
        const raw = String(req.headers["x-filename"] ?? "Topping_Post.png");
        const safe = raw.replace(/[^\w.-]+/g, "_").replace(/^\.+/g, "");
        const ext = path.extname(safe).toLowerCase();
        if (![".png", ".mp4", ".webm"].includes(ext)) {
          res.statusCode = 400;
          res.end("bad type");
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        req.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BYTES) {
            res.statusCode = 413;
            res.end("too large");
            req.destroy();
            return;
          }
          chunks.push(chunk);
        });
        req.on("end", () => {
          try {
            const folder = path.join(os.homedir(), "Downloads");
            fs.mkdirSync(folder, { recursive: true });
            const dest = uniquePath(folder, safe);
            fs.writeFileSync(dest, Buffer.concat(chunks));
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true, path: dest, filename: path.basename(dest) }));
          } catch {
            res.statusCode = 500;
            res.end("write failed");
          }
        });
      });
    },
  };
}

function uniquePath(folder: string, name: string): string {
  const ext = path.extname(name);
  const base = path.basename(name, ext);
  let dest = path.join(folder, name);
  let index = 1;
  while (fs.existsSync(dest)) {
    dest = path.join(folder, `${base} (${index})${ext}`);
    index += 1;
  }
  return dest;
}
