import { FFmpeg } from "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/+esm";
import { fetchFile, toBlobURL } from "https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/+esm";

const $ = (id) => document.getElementById(id);
const canvas = $("canvas");
const ctx = canvas.getContext("2d");
const sizes = {
  reel: [1080, 1920, 150, 150],
  post: [1080, 1350, 135, 135],
  square: [1080, 1080, 108, 108],
  linkedin: [1200, 627, 63, 63],
};

let scenes = [];
let selected = 0;
let playing = false;
let started = 0;
let playIndex = 0;
let frame = new Image();
const ffmpeg = new FFmpeg();
let ffmpegReady = false;

function status(t) {
  $("status").textContent = t;
}

function frameLoad() {
  frame = new Image();
  frame.onload = draw;
  frame.src = "assets/frame_" + $("format").value + ".png";
}

function fit(media, x, y, w, h) {
  const iw = media.videoWidth || media.naturalWidth;
  const ih = media.videoHeight || media.naturalHeight;
  if (!iw || !ih) return;
  const f = Math.max(w / iw, h / ih);
  const dw = iw * f;
  const dh = ih * f;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(media, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

function draw() {
  const [w, h, top, bottom] = sizes[$("format").value];
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  ctx.fillStyle = "#171a51";
  ctx.fillRect(0, 0, w, h);
  const s = scenes[selected];
  if (s && s.ready) {
    if (s.type === "image" || s.el.readyState >= 2) fit(s.el, 0, top, w, h - top - bottom);
  } else if (!s) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#d8d9f6";
    ctx.font = "24px Arial";
    ctx.fillText("Add photos or videos", w / 2, h / 2);
  }
  if (frame.complete && frame.naturalWidth) ctx.drawImage(frame, 0, 0, w, h);
}

function cards() {
  const root = $("timeline");
  root.replaceChildren();
  scenes.forEach((s, i) => {
    const card = document.createElement("div");
    card.className = "scene" + (i === selected ? " active" : "");
    const title = document.createElement("strong");
    title.textContent = s.file.name;
    card.append(title);
    const input = document.createElement("input");
    input.type = "number";
    input.min = ".5";
    input.max = "30";
    input.step = ".5";
    input.value = s.seconds;
    input.title = "Seconds";
    input.oninput = () => {
      s.seconds = Math.min(30, Math.max(0.5, Number(input.value) || 3));
    };
    card.append(input, document.createTextNode(" sec"));
    const row = document.createElement("div");
    for (const [label, fn] of [
      ["←", () => move(i, -1)],
      ["→", () => move(i, 1)],
      ["×", () => remove(i)],
    ]) {
      const b = document.createElement("button");
      b.className = "secondary";
      b.textContent = label;
      b.onclick = (e) => {
        e.stopPropagation();
        fn();
      };
      row.append(b);
    }
    card.append(row);
    card.onclick = () => {
      stop();
      selected = i;
      seekSelected();
      cards();
      draw();
    };
    root.append(card);
  });
}

function move(i, n) {
  const j = i + n;
  if (j < 0 || j >= scenes.length) return;
  [scenes[i], scenes[j]] = [scenes[j], scenes[i]];
  selected = j;
  cards();
  draw();
}

function remove(i) {
  stop();
  URL.revokeObjectURL(scenes[i].url);
  scenes.splice(i, 1);
  selected = Math.min(selected, scenes.length - 1);
  selected = Math.max(0, selected);
  cards();
  draw();
}

function seekSelected() {
  const s = scenes[selected];
  if (s?.type === "video") {
    try {
      s.el.currentTime = 0.08;
    } catch {}
  }
}

$("files").onchange = (e) => {
  const fresh = [];
  for (const file of e.target.files) {
    const name = (file.name || "").toLowerCase();
    const type =
      /(\.mp4|\.mov|\.webm|\.mkv)$/.test(name) || file.type.startsWith("video/")
        ? "video"
        : "image";
    const url = URL.createObjectURL(file);
    const el = type === "image" ? new Image() : document.createElement("video");
    const s = { file, url, type, el, seconds: type === "image" ? 3 : 5, ready: false };
    if (type === "image") {
      el.onload = () => {
        s.ready = true;
        draw();
      };
      el.onerror = () => status("Cannot open " + file.name + "; try JPG or PNG.");
      el.src = url;
    } else {
      el.preload = "auto";
      el.playsInline = true;
      el.muted = false;
      el.volume = 1;
      el.onloadedmetadata = () => {
        s.seconds = Math.min(8, Math.max(0.5, el.duration || 5));
        cards();
        try {
          el.currentTime = 0.08;
        } catch {}
      };
      el.onloadeddata = () => {
        s.ready = true;
        if (scenes[selected] === s) draw();
      };
      el.onseeked = () => {
        s.ready = true;
        if (scenes[selected] === s) draw();
      };
      el.ontimeupdate = () => {
        if (playing && scenes[playIndex] === s) draw();
      };
      el.onerror = () => status("Cannot decode " + file.name + "; convert it to H.264 MP4.");
      el.src = url;
    }
    fresh.push(s);
  }
  scenes.push(...fresh);
  selected = scenes.length - fresh.length;
  cards();
  draw();
  status(`${fresh.length} file(s) added. Pick a social size, then Create MP4.`);
  $("files").value = "";
};

function stop() {
  playing = false;
  scenes.forEach((s) => {
    if (s.type === "video") {
      s.el.pause();
      s.el.muted = true;
    }
  });
}

function play(i = 0) {
  if (!scenes[i]) {
    stop();
    return;
  }
  playing = true;
  playIndex = i;
  selected = i;
  cards();
  const s = scenes[i];
  started = performance.now();
  if (s.type === "video") {
    s.el.muted = false;
    s.el.volume = 1;
    try {
      s.el.currentTime = 0;
    } catch {}
    s.el.play().catch(() => status("Click Preview again to allow sound."));
  }
  requestAnimationFrame(tick);
}

function tick() {
  if (!playing) return;
  const s = scenes[playIndex];
  const elapsed = (performance.now() - started) / 1000;
  if (elapsed >= s.seconds) {
    if (s.type === "video") {
      s.el.pause();
      s.el.muted = true;
    }
    play(playIndex + 1);
    return;
  }
  draw();
  requestAnimationFrame(tick);
}

$("play").onclick = () => {
  stop();
  play();
};
$("stop").onclick = stop;
document.querySelectorAll(".fmt").forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll(".fmt").forEach((b) => b.classList.toggle("on", b === btn));
    $("format").value = btn.dataset.format;
    frameLoad();
  };
});

async function loadFfmpeg() {
  if (ffmpegReady) return;
  status("Loading video engine in the browser… first time can take a minute.");
  const base = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm";
  await ffmpeg.load({
    coreURL: await toBlobURL(base + "/ffmpeg-core.js", "text/javascript"),
    wasmURL: await toBlobURL(base + "/ffmpeg-core.wasm", "application/wasm"),
    classWorkerURL: await toBlobURL(
      "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/worker.js",
      "text/javascript"
    ),
  });
  ffmpegReady = true;
}

function fileExt(file, type) {
  const match = (file.name || "").toLowerCase().match(/\.[a-z0-9]+$/);
  if (match) return match[0];
  return type === "image" ? ".jpg" : ".mp4";
}

async function probeAudio(inputName) {
  let log = "";
  const onLog = ({ message }) => {
    log += message + "\n";
  };
  ffmpeg.on("log", onLog);
  try {
    await ffmpeg.exec(["-hide_banner", "-i", inputName, "-f", "null", "-t", "0.05", "-"]);
  } catch {}
  ffmpeg.off("log", onLog);
  return /Audio:/.test(log);
}

async function renderMp4() {
  if (!scenes.length) {
    status("Add at least one scene.");
    return;
  }
  const button = $("render");
  button.disabled = true;
  stop();
  $("result").replaceChildren();
  try {
    await loadFfmpeg();
    const fmt = $("format").value;
    const [width, height, header, footer] = sizes[fmt];
    let mediaHeight = height - header - footer;
    if (mediaHeight % 2) mediaHeight -= 1;
    const overlayBytes = await fetchFile("assets/frame_" + fmt + ".png");
    await ffmpeg.writeFile("overlay.png", overlayBytes);
    const parts = [];
    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i];
      const seconds = Math.min(30, Math.max(0.5, Number(s.seconds) || 3));
      const duration = seconds.toFixed(3);
      const inputName = `in_${i}${fileExt(s.file, s.type)}`;
      const outName = `scene_${String(i).padStart(2, "0")}.mp4`;
      status(`Creating scene ${i + 1} of ${scenes.length}…`);
      await ffmpeg.writeFile(inputName, await fetchFile(s.file));
      const silent = s.type === "image" || !(await probeAudio(inputName));
      const args = ["-hide_banner", "-y"];
      if (s.type === "image") args.push("-loop", "1", "-framerate", "30", "-t", duration, "-i", inputName);
      else args.push("-t", duration, "-i", inputName);
      args.push("-loop", "1", "-t", duration, "-i", "overlay.png");
      if (silent) args.push("-f", "lavfi", "-t", duration, "-i", "anullsrc=r=44100:cl=stereo");
      const audioInput = silent ? 2 : 0;
      const videoFilter =
        `[0:v]fps=30,scale=${width}:${mediaHeight}:force_original_aspect_ratio=increase,` +
        `crop=${width}:${mediaHeight},pad=${width}:${height}:0:${header}:color=0x171A51[base];` +
        `[base][1:v]overlay=0:0:eof_action=repeat:shortest=1,setsar=1,format=yuv420p[v]`;
      const audioFilter =
        `[${audioInput}:a]aresample=44100,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,` +
        `apad,atrim=duration=${duration},asetpts=PTS-STARTPTS[a]`;
      args.push(
        "-filter_complex",
        videoFilter + ";" + audioFilter,
        "-map",
        "[v]",
        "-map",
        "[a]",
        "-t",
        duration,
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "23",
        "-r",
        "30",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-ar",
        "44100",
        "-ac",
        "2",
        outName
      );
      const code = await ffmpeg.exec(args);
      if (code) throw Error("Could not encode scene " + (i + 1));
      parts.push(outName);
    }
    status("Joining scenes…");
    await ffmpeg.writeFile("list.txt", parts.map((p) => `file '${p}'`).join("\n"));
    const join = await ffmpeg.exec([
      "-hide_banner",
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      "list.txt",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      "Topping_Teaser.mp4",
    ]);
    if (join) throw Error("Could not join scenes");
    const data = await ffmpeg.readFile("Topping_Teaser.mp4");
    const blob = new Blob([data.buffer], { type: "video/mp4" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "Topping_Teaser.mp4";
    a.className = "download";
    a.textContent = "⬇ Save MP4 to this computer";
    $("result").append(a);
    status("MP4 is ready. Click the orange Save MP4 button below.");
  } catch (err) {
    status("Export failed: " + (err.message || err));
  } finally {
    button.disabled = false;
  }
}

$("render").onclick = renderMp4;
frameLoad();
