import { useCallback, useEffect, useRef, useState } from "react";

export function usePlayback(durationMs: number) {
  const [timeMs, setTimeMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const timeRef = useRef(0);

  useEffect(() => {
    if (timeRef.current > durationMs) {
      timeRef.current = 0;
      setTimeMs(0);
    }
  }, [durationMs]);

  useEffect(() => {
    if (!playing) return undefined;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const delta = now - last;
      last = now;
      const next = Math.min(durationMs, timeRef.current + delta);
      timeRef.current = next;
      setTimeMs(next);
      if (next >= durationMs) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [playing, durationMs]);

  const seek = useCallback((ms: number) => {
    const next = Math.min(durationMs, Math.max(0, ms));
    timeRef.current = next;
    setTimeMs(next);
  }, [durationMs]);

  const restart = useCallback(() => {
    timeRef.current = 0;
    setTimeMs(0);
    setPlaying(true);
  }, []);

  const toggle = useCallback(() => {
    if (timeRef.current >= durationMs) {
      timeRef.current = 0;
      setTimeMs(0);
    }
    setPlaying((value) => !value);
  }, [durationMs]);

  return { timeMs, playing, setPlaying, muted, setMuted, seek, restart, toggle };
}
