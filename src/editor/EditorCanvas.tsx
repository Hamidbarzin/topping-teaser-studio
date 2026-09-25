import { useEffect, useRef, useState, type PointerEvent } from "react";
import { resolveFormatSize } from "../formats/formatPresets";
import { useStudio } from "../hooks/useStudio";
import { useSettings } from "../hooks/useSettings";
import { layoutClips } from "../utils/timeline";
import { renderFrame, type RenderState } from "../utils/renderFrame";
import type { TextHitBox } from "../types";
import { COMPANY } from "../branding/company";
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
  const { project, drawables, elementsRef, updateText, selectText } = useStudio();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);
  const hitsRef = useRef<TextHitBox[]>([]);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const [logoReady, setLogoReady] = useState(false);
  const size = resolveFormatSize(project.formatId, project.customWidth, project.customHeight);

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      logoRef.current = image;
      setLogoReady(true);
    };
    image.src = COMPANY.logoSrc;
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
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const ratio = size.width / size.height;
    let width = rect.width;
    let height = width / ratio;
    if (height > rect.height) {
      height = rect.height;
      width = height * ratio;
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(2, Math.round(width * dpr));
    canvas.height = Math.max(2, Math.round(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const context = canvas.getContext("2d");
    if (!context) return;
    const state: RenderState = {
      width: canvas.width,
      height: canvas.height,
      timeMs,
      items: layoutClips(project.clips).items,
      media: drawables,
      branding: project.branding,
      texts: project.texts,
      logo: logoRef.current,
    };
    try {
      hitsRef.current = renderFrame(context, state);
    } catch {
      context.fillStyle = "#071525";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [drawables, logoReady, project, size.height, size.width, timeMs]);

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
          const hit = [...hitsRef.current].reverse().find((box) => point.x >= box.x && point.x <= box.x + box.w && point.y >= box.y && point.y <= box.y + box.h);
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
      </div>
    </div>
  );
}
