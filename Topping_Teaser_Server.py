#!/usr/bin/env python3
"""Local-only Topping teaser editor. Run: python3 Topping_Teaser_Server.py"""
import json
import mimetypes
import shutil
import subprocess
import tempfile
import threading
import uuid
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
WORK = Path(tempfile.mkdtemp(prefix="topping-teaser-"))
FORMATS = {
    "reel": (1080, 1920, 150, 150),
    "post": (1080, 1350, 135, 135),
    "square": (1080, 1080, 108, 108),
    "linkedin": (1200, 627, 63, 63),
}
EXTENSIONS = {".mp4", ".mov", ".webm", ".mkv", ".jpg", ".jpeg", ".png", ".webp"}
MAX_UPLOAD = 1_500_000_000


def run(command):
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr[-1800:] or "FFmpeg failed")


def has_audio(path):
    result = subprocess.run([
        "ffprobe", "-v", "error", "-select_streams", "a:0",
        "-show_entries", "stream=codec_type", "-of", "csv=p=0", str(path),
    ], capture_output=True, text=True)
    return "audio" in (result.stdout or "")


def render(payload):
    fmt = payload.get("format")
    if fmt not in FORMATS:
        raise ValueError("Unknown video format")
    clips = payload.get("clips")
    if not isinstance(clips, list) or not 1 <= len(clips) <= 30:
        raise ValueError("Choose between 1 and 30 scenes")
    width, height, header, footer = FORMATS[fmt]
    media_height = height - header - footer
    export_id = uuid.uuid4().hex
    job = WORK / export_id
    job.mkdir()
    overlay = ROOT / "assets" / f"frame_{fmt}.png"
    segments = []
    for index, item in enumerate(clips):
        clip_id = item.get("id", "")
        source = next((p for p in WORK.glob(f"{clip_id}.*") if p.suffix.lower() in EXTENSIONS), None) if len(clip_id) == 32 else None
        if not source:
            raise ValueError(f"Scene {index + 1} was not uploaded")
        seconds = float(item.get("seconds", 0))
        if not .5 <= seconds <= 30:
            raise ValueError("Each scene must last between 0.5 and 30 seconds")
        duration = f"{seconds:.3f}"
        still = source.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
        silent = still or not has_audio(source)
        command = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"]
        if still:
            command += ["-loop", "1", "-framerate", "30", "-t", duration, "-i", str(source)]
        else:
            command += ["-t", duration, "-i", str(source)]
        command += ["-loop", "1", "-t", duration, "-i", str(overlay)]
        if silent:
            command += ["-f", "lavfi", "-t", duration, "-i", "anullsrc=r=44100:cl=stereo"]
        audio_input = 2 if silent else 0
        video_filter = (
            f"[0:v]fps=30,scale={width}:{media_height}:force_original_aspect_ratio=increase,"
            f"crop={width}:{media_height},"
            f"pad={width}:{height}:0:{header}:color=0x171A51[base];"
            f"[base][1:v]overlay=0:0:eof_action=repeat:shortest=1,setsar=1,format=yuv420p[v]"
        )
        audio_filter = (
            f"[{audio_input}:a]aresample=44100,"
            f"aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,"
            f"apad,atrim=duration={duration},asetpts=PTS-STARTPTS[a]"
        )
        dest = job / f"scene_{index:02d}.mp4"
        command += ["-filter_complex", video_filter + ";" + audio_filter,
                    "-map", "[v]", "-map", "[a]", "-t", duration,
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-r", "30",
                    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "44100",
                    "-ac", "2", str(dest)]
        run(command)
        segments.append(dest)
    concat_file = job / "segments.txt"
    concat_file.write_text("".join(f"file '{path}'\n" for path in segments))
    final = WORK / f"{export_id}.mp4"
    run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0",
         "-i", str(concat_file), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
         "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2",
         "-movflags", "+faststart", str(final)])
    shutil.rmtree(job, ignore_errors=True)
    return final


class Handler(BaseHTTPRequestHandler):
    def reply(self, code, body, mime="application/json", headers=None):
        data = body if isinstance(body, bytes) else body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        for key, value in (headers or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        route = urlparse(self.path).path
        if route == "/":
            return self.reply(200, (ROOT / "index.html").read_bytes(), "text/html; charset=utf-8")
        if route == "/app.js":
            return self.reply(200, (ROOT / "app.js").read_bytes(), "text/javascript; charset=utf-8")
        if route.startswith("/assets/") and Path(route).name in {f"frame_{f}.png" for f in FORMATS} | {"logo.png"}:
            return self.reply(200, (ROOT / "assets" / Path(route).name).read_bytes(), "image/png")
        if route.startswith("/download/"):
            key = Path(route).name
            path = WORK / key
            if len(key) == 36 and key.endswith(".mp4") and path.is_file():
                self.send_response(200)
                self.send_header("Content-Type", "video/mp4")
                self.send_header("Content-Length", str(path.stat().st_size))
                self.send_header("Content-Disposition", 'attachment; filename="Topping_Teaser.mp4"')
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                with path.open("rb") as source:
                    shutil.copyfileobj(source, self.wfile, length=1024 * 1024)
                return
        self.reply(404, b"Not found", "text/plain")

    def do_POST(self):
        route = urlparse(self.path)
        if route.path == "/upload":
            name = parse_qs(route.query).get("name", [""])[0]
            suffix = Path(name).suffix.lower()
            length = int(self.headers.get("Content-Length", "0"))
            if suffix not in EXTENSIONS or not 0 < length <= MAX_UPLOAD:
                return self.reply(400, json.dumps({"error": "Unsupported file or size"}))
            key = uuid.uuid4().hex
            target = WORK / (key + suffix)
            with target.open("wb") as out:
                remaining = length
                while remaining:
                    chunk = self.rfile.read(min(1024 * 1024, remaining))
                    if not chunk:
                        target.unlink(missing_ok=True)
                        return self.reply(400, json.dumps({"error": "Upload interrupted"}))
                    out.write(chunk)
                    remaining -= len(chunk)
            return self.reply(200, json.dumps({"id": key}))
        if route.path == "/render":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if length > 100_000:
                    raise ValueError("Too many scenes")
                result = render(json.loads(self.rfile.read(length)))
                return self.reply(200, json.dumps({"url": f"/download/{result.name}"}))
            except Exception as exc:
                return self.reply(400, json.dumps({"error": str(exc)}))
        self.reply(404, b"Not found", "text/plain")


if __name__ == "__main__":
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        raise SystemExit("FFmpeg is required. Install it first, then run this script again. https://ffmpeg.org/download.html")
    server = ThreadingHTTPServer(("127.0.0.1", 8765), Handler)
    print("Topping Teaser Studio: http://127.0.0.1:8765")
    threading.Timer(1, lambda: webbrowser.open("http://127.0.0.1:8765")).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()
