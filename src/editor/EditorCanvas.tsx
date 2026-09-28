import { useEffect, useRef, useState, type PointerEvent } from "react";
import { resolveFormatSize } from "../formats/formatPresets";
import { useStudio } from "../hooks/useStudio";
import { useSettings } from "../hooks/useSettings";
import { layoutClips } from "../utils/timeline";
import { renderFrame, type RenderState } from "../utils/renderFrame";
import type { TextHitBox } from "../types";
import { COMPANY } from "../branding/company";
import { loadVariantPoster, normalizePortraitPost, type PortraitVariantId } from "../templates/portraitPost";
import { syncVideos } from "../utils/syncVideos";

export function EditorCanvas({
  timeMs,
  playing,
  muted,
}: {
  timeMs: number;
  playing: boolean;
  muted: boolean;
}) {
  const { t } = useSettings();
  const { project, drawables, elementsRef, previewCanvasRef, updateText, selectText } = useStudio();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);
  const postersRef = useRef<Partial<Record<PortraitVariantId, HTMLImageElement>>>({});
  const hitsRef = useRef<TextHitBox[]>([]);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const [logoReady, setLogoReady] = useState(false);
  const [postersReady, setPostersReady] = useState(0);
  const [box, setBox] = useState({ w: 320, h: 400 });
  const size = resolveFormatSize(project.formatId, project.customWidth, project.customHeight);

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      logoRef.current = image;
      setLogoReady(true);
    };
    image.crossOrigin = "anonymous";
    image.src = COMPANY.logoSrc;
  }, []);

  useEffect(() => {
    const ids: PortraitVariantId[] = ["service", "tracking", "cta"];
    for (const id of ids) {
      void loadVariantPoster(id).then((image) => {
        if (!image) return;
        postersRef.current[id] = image;
        setPostersReady((count) => count + 1);
      });
    }
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const update = () => {
      const rect = wrap.getBoundingClientRect();
      setBox({ w: Math.max(80, rect.width), h: Math.max(80, rect.height) });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    for (const element of elementsRef.current.values()) {
      if (element instanceof HTMLVideoElement) element.muted = muted;
    }
    try {
      syncVideos(project, elementsRef.current, timeMs, playing && !muted ? true : playing);
    } catch {
      /* preview playback should not crash export */
    }
    if (muted) {
      for (const element of elementsRef.current.values()) {
        if (element instanceof HTMLVideoElement) element.muted = true;
      }
    }
  }, [elementsRef, muted, playing, project, timeMs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    previewCanvasRef.current = canvas;
    canvas.width = size.width;
    canvas.height = size.height;
    const ratio = size.width / size.height;
    let width = box.w - 48;
    let height = width / ratio;
    if (height > box.h - 48) {
      height = box.h - 48;
      width = height * ratio;
    }
    canvas.style.width = `${Math.max(2, width)}px`;
    canvas.style.height = `${Math.max(2, height)}px`;
    const context = canvas.getContext("2d");
    if (!context) return;
    const state: RenderState = {
      width: size.width,
      height: size.height,
      timeMs,
      items: layoutClips(project.clips).items,
      media: drawables,
      branding: project.branding,
      texts: project.texts,
      logo: logoRef.current,
      formatId: project.formatId,
      post: project.post,
      slotLabel: t("mediaSlot"),
      stockPoster: postersRef.current[normalizePortraitPost(project.post).variantId] ?? null,
    };
    try {
      hitsRef.current = renderFrame(context, state);
    } catch {
      context.fillStyle = "#071525";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [box.h, box.w, drawables, logoReady, postersReady, previewCanvasRef, project, size.height, size.width, t, timeMs]);

  const pointer = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  return (
    <div ref={wrapRef} className="flex h-full min-h-[240px] items-center justify-center p-6">
      <div className="rounded-[28px] border border-white/10 bg-black/25 p-3 shadow-[var(--brand-shadow)]">
      <canvas
        ref={canvasRef}
        aria-label={t("preview")}
        className="block max-h-[min(72vh,820px)] max-w-full rounded-2xl bg-[#050B14]"
        onPointerDown={(event) => {
          const point = pointer(event);
          if (!point) return;
          const hit = [...hitsRef.current].reverse().find((boxHit) => point.x >= boxHit.x && point.x <= boxHit.x + boxHit.w && point.y >= boxHit.y && point.y <= boxHit.y + boxHit.h);
          if (!hit) return;
          selectText(hit.id);
          const overlay = project.texts.find((item) => item.id === hit.id);
          if (!overlay) return;
          dragRef.current = { id: hit.id, dx: point.x / canvasRef.current!.width - overlay.x, dy: point.y / canvasRef.current!.height - overlay.y };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          const canvas = canvasRef.current;
          const point = pointer(event);
          if (!drag || !canvas || !point) return;
          updateText(drag.id, {
            x: Math.min(1, Math.max(0, point.x / canvas.width - drag.dx)),
            y: Math.min(1, Math.max(0, point.y / canvas.height - drag.dy)),
          });
        }}
        onPointerUp={() => {
          dragRef.current = null;
        }}
      />
      <p className="mt-2 text-center text-xs text-cyan">
        {size.width} × {size.height}
      </p>
      </div>
    </div>
  );
}
