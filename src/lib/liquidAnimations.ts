import { useEffect, useRef, useState } from 'react';

export const CONTINUOUS_ANIMATION_FPS = 28;
export const CONTINUOUS_FRAME_INTERVAL_MS = 1000 / CONTINUOUS_ANIMATION_FPS;

/**
 * Creates a deterministic timestamp gate limiting custom continuous
 * requestAnimationFrame loops to ~28 FPS without drift or excessive repaints.
 */
export function createFpsFrameGate(targetFps = CONTINUOUS_ANIMATION_FPS) {
  const intervalMs = 1000 / Math.max(1, targetFps);
  let lastFrameMs = -Infinity;

  return (timestampMs: number): boolean => {
    if (timestampMs - lastFrameMs < intervalMs) {
      return false;
    }
    lastFrameMs = timestampMs - ((timestampMs - lastFrameMs) % intervalMs || 0);
    if (!Number.isFinite(lastFrameMs)) {
      lastFrameMs = timestampMs;
    }
    return true;
  };
}

/**
 * Subscribes to OS prefers-reduced-motion so all decorative continuous motion
 * and CSS transitions automatically calm down when requested.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(media.matches);
    onChange();
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);

  return reduced;
}

/**
 * Runs a lightweight GPU-friendly custom animation callback capped at ~28 FPS,
 * automatically pausing when the tab is hidden or prefers-reduced-motion is on.
 */
export function use28FpsAmbientLoop(
  onTick: (elapsedSeconds: number) => void,
  enabled = true
) {
  const reducedMotion = usePrefersReducedMotion();
  const callbackRef = useRef(onTick);
  callbackRef.current = onTick;

  useEffect(() => {
    if (!enabled || reducedMotion || typeof window === 'undefined') {
      return;
    }

    let rafId = 0;
    let startTimeMs: number | null = null;
    const shouldRenderFrame = createFpsFrameGate(CONTINUOUS_ANIMATION_FPS);

    const step = (timestampMs: number) => {
      if (!document.hidden && shouldRenderFrame(timestampMs)) {
        if (startTimeMs === null) {
          startTimeMs = timestampMs;
        }
        callbackRef.current((timestampMs - startTimeMs) / 1000);
      }
      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [enabled, reducedMotion]);
}
