import { Muxer, ArrayBufferTarget } from "https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.2/+esm";

const $ = (id) => document.getElementById(id);
const canvas = $("canvas");
const ctx = canvas.getContext("2d", { alpha: false });
const FORMATS = {
  reel: { w: 1080, h: 1920, label: "Instagram Reel" },
  post: { w: 1080, h: 1350, label: "Instagram Post" },
  square: { w: 1080, h: 1080, label: "Square / Feed" },
  linkedin: { w: 1200, h: 627, label: "LinkedIn" },
};
const HEADER_PCT = 0.14;
const FOOTER_PCT = 0.13;
const GAP_PCT = 0.018;
const PLATE = "#F4F7FB";
const LINE = "#F7931E";
const INK = "#1D1F56";
const NAVY = "#050B14";
const FOOTER_TEXT = "toppingcourier.ca";

let scenes = [];
let selected = 0;
let playing = false;
let started = 0;
let playIndex = 0;
let exportKind = "mp4";
const logo = new Image();
logo.onload = draw;
logo.src = "assets/logo.png";

function status(t) {
  $("status").textContent = t;
}

function even(n) {
  return Math.max(2, Math.round(n / 2) * 2);
}

function designSize() {
  return FORMATS[$("format").value] || FORMATS.reel;
}

function exportPixels() {
  const { w, h } = designSize();
  if ($("resolution").value === "720p") {
    const scale = 720 / 1080;
    return { w: even(w * scale), h: even(h * scale) };
  }
  return { w: even(w), h: even(h) };
}

function updatePixelLabel() {
  const { w, h } = exportPixels();
  const instagram = w === 1080 && h === 1920;
  $("pixels").textContent = instagram ? `${w} × ${h} · Instagram Reel` : `${w} × ${h} · ${designSize().label}`;
}

function bars(width, height) {
  const header = even(height * HEADER_PCT);
  const footer = even(height * FOOTER_PCT);
  const gap = Math.max(4, even(height * GAP_PCT));
  return {
    header,
    footer,
    gap,
    x: 0,
    y: header + gap,
    w: width,
    h: Math.max(2, even(height - header - footer - gap * 2)),
  };
}

function cover(media, x, y, w, h) {
  const iw = media.videoWidth || media.naturalWidth;
  const ih = media.videoHeight || media.naturalHeight;
  if (!iw || !ih) return;
  const f = Math.max(w / iw, h / ih);
  const dw = iw * f;
  const dh = ih * f;
  ctx.drawImage(media, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function drawBranding(width, height) {
  const { header, footer } = bars(width, height);
  const line = Math.max(2, even(header * 0.015));
  ctx.fillStyle = PLATE;
  ctx.fillRect(0, 0, width, header);
  ctx.fillStyle = LINE;
  ctx.fillRect(0, header - line, width, line);
  if (logo.complete && logo.naturalWidth) {
    const pad = width * 0.026;
    const drawH = header * 0.86;
    const aspect = logo.naturalWidth / logo.naturalHeight;
    let drawW = drawH * aspect;
    if (drawW > width - pad * 2) drawW = width - pad * 2;
    const fittedH = drawW / aspect;
    ctx.drawImage(logo, pad, (header - fittedH) / 2, drawW, fittedH);
  }
  ctx.fillStyle = PLATE;
  ctx.fillRect(0, height - footer, width, footer);
  ctx.fillStyle = LINE;
  ctx.fillRect(0, height - footer, width, line);
  ctx.fillStyle = "#2E3192";
  ctx.fillRect(0, height - line, width, line);
  let fontSize = Math.max(12, footer * 0.28);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${fontSize}px Arial, Helvetica, sans-serif`;
  const limit = width * 0.88;
  while (fontSize > 11 && ctx.measureText(FOOTER_TEXT).width > limit) {
    fontSize *= 0.92;
    ctx.font = `700 ${fontSize}px Arial, Helvetica, sans-serif`;
  }
  ctx.fillStyle = INK;
  ctx.fillText(FOOTER_TEXT, width / 2, height - footer / 2);
}

function draw() {
  const { w, h } = designSize();
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, w, h);
  const frame = bars(w, h);
  const s = scenes[selected];
  ctx.save();
  ctx.beginPath();
  ctx.rect(frame.x, frame.y, frame.w, frame.h);
  ctx.clip();
  if (s && s.ready && (s.type === "image" || s.el.readyState >= 2)) {
    cover(s.el, frame.x, frame.y, frame.w, frame.h);
  } else if (!s) {
    ctx.fillStyle = "#071525";
    ctx.fillRect(frame.x, frame.y, frame.w, frame.h);
    ctx.textAlign = "center";
    ctx.fillStyle = "#d8d9f6";
    ctx.font = "24px Arial";
    ctx.fillText("Add photos or videos", w / 2, h / 2);
  }
  ctx.restore();
  drawBranding(w, h);
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
  selected = Math.max(0, Math.min(selected, scenes.length - 1));
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
      /(\.mp4|\.mov|\.webm|\.mkv)$/.test(name) || file.type.startsWith("video/") ? "video" : "image";
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
  status(`${fresh.length} file(s) added. Pick Instagram Reel, then Create file.`);
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
    updatePixelLabel();
    draw();
  };
});
$("resolution").onchange = updatePixelLabel;
["kindMp4", "kindPng"].forEach((id) => {
  $(id).onclick = () => {
    exportKind = $(id).dataset.kind;
    $("kindMp4").classList.toggle("on", exportKind === "mp4");
    $("kindPng").classList.toggle("on", exportKind === "png");
    updatePixelLabel();
  };
});

function setCanvasSize(w, h) {
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
}

function drawAtSize(w, h, scene) {
  setCanvasSize(w, h);
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, w, h);
  const frame = bars(w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(frame.x, frame.y, frame.w, frame.h);
  ctx.clip();
  if (scene && scene.ready && (scene.type === "image" || scene.el.readyState >= 2)) {
    cover(scene.el, frame.x, frame.y, frame.w, frame.h);
  }
  ctx.restore();
  drawBranding(w, h);
}

function blobDownload(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.className = "download";
  a.textContent = "⬇ Download " + name;
  $("result").replaceChildren(a);
}

async function exportPng(w, h) {
  drawAtSize(w, h, scenes[selected] || scenes[0]);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw Error("Could not make PNG");
  blobDownload(blob, "Topping_Teaser.png");
  status(`PNG ready · ${w} × ${h}`);
}

async function pickAvcCodec(width, height) {
  if (typeof VideoEncoder === "undefined") return null;
  const codecs = ["avc1.640028", "avc1.4d0028", "avc1.42E01E"];
  for (const codec of codecs) {
    const support = await VideoEncoder.isConfigSupported({
      codec,
      width,
      height,
      bitrate: 4_000_000,
      avc: { format: "avc" },
    });
    if (support.supported) return codec;
  }
  return null;
}

async function seekVideo(el, time) {
  if (!(el instanceof HTMLVideoElement)) return;
  const target = Math.min(Math.max(0, time), Math.max(0, (el.duration || 0) - 0.04));
  if (Math.abs(el.currentTime - target) < 0.03 && el.readyState >= 2) return;
  await new Promise((resolve) => {
    const done = () => {
      el.removeEventListener("seeked", done);
      resolve();
    };
    el.addEventListener("seeked", done);
    el.currentTime = target;
  });
}

async function exportMp4(w, h) {
  const codec = await pickAvcCodec(w, h);
  if (!codec) throw Error("This browser cannot encode MP4. Use PNG, or try Chrome/Safari.");
  const fps = 30;
  const duration = scenes.reduce((sum, s) => sum + Math.min(30, Math.max(0.5, Number(s.seconds) || 3)), 0);
  const frameCount = Math.max(1, Math.round(duration * fps));
  const frameDuration = Math.round(1_000_000 / fps);
  const bitrate = Math.round(5_000_000 * Math.max(0.45, (w * h) / (1080 * 1920)));
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: "avc", width: w, height: h, frameRate: fps },
    fastStart: "in-memory",
    firstTimestampBehavior: "offset",
  });
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: () => undefined,
  });
  encoder.configure({ codec, width: w, height: h, bitrate, framerate: fps, avc: { format: "avc" } });

  let cursor = 0;
  const spans = scenes.map((s) => {
    const seconds = Math.min(30, Math.max(0.5, Number(s.seconds) || 3));
    const start = cursor;
    cursor += seconds;
    return { s, start, end: cursor };
  });

  for (let index = 0; index < frameCount; index += 1) {
    const time = index / fps;
    const span = spans.find((item) => time >= item.start && time < item.end) || spans[spans.length - 1];
    if (span.s.type === "video") await seekVideo(span.s.el, time - span.start);
    drawAtSize(w, h, span.s);
    const timestamp = index * frameDuration;
    const frame = new VideoFrame(canvas, { timestamp, duration: frameDuration });
    encoder.encode(frame, { keyFrame: index % (fps * 2) === 0 });
    frame.close();
    if (index % 8 === 0) status(`Rendering MP4… ${Math.round(((index + 1) / frameCount) * 100)}% · ${w} × ${h}`);
    if (encoder.encodeQueueSize > 8) {
      await new Promise((resolve) => encoder.addEventListener("dequeue", () => resolve(), { once: true }));
    }
  }
  await encoder.flush();
  muxer.finalize();
  encoder.close();
  const blob = new Blob([target.buffer], { type: "video/mp4" });
  blobDownload(blob, "Topping_Teaser.mp4");
  status(`MP4 ready · ${w} × ${h}${w === 1080 && h === 1920 ? " · Instagram Reel" : ""}`);
}

$("render").onclick = async () => {
  if (!scenes.length) {
    status("Add at least one scene.");
    return;
  }
  const button = $("render");
  button.disabled = true;
  stop();
  $("result").replaceChildren();
  const { w, h } = exportPixels();
  try {
    if (exportKind === "png") await exportPng(w, h);
    else await exportMp4(w, h);
  } catch (err) {
    status("Export failed: " + (err.message || err));
    if (exportKind === "mp4") {
      try {
        await exportPng(w, h);
        status("MP4 is not available here. PNG still of the same frame is ready.");
      } catch {}
    }
  } finally {
    draw();
    button.disabled = false;
  }
};

updatePixelLabel();
draw();
