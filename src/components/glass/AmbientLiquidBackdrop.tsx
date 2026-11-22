import { useRef } from 'react';
import { use28FpsAmbientLoop } from '@/lib/liquidAnimations';

/**
 * Renders subtle ambient lighting reflections behind glass panels using only
 * transform and opacity updates throttled cleanly to 28 FPS via rAF.
 */
export function AmbientLiquidBackdrop() {
  const topLightRef = useRef<HTMLDivElement | null>(null);
  const bottomLightRef = useRef<HTMLDivElement | null>(null);

  use28FpsAmbientLoop((t) => {
    if (topLightRef.current) {
      const tx = Math.sin(t * 0.24) * 18;
      const ty = Math.cos(t * 0.19) * 12;
      const op = 0.54 + Math.sin(t * 0.31) * 0.12;
      topLightRef.current.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0)`;
      topLightRef.current.style.opacity = op.toFixed(2);
    }
    if (bottomLightRef.current) {
      const bx = Math.cos(t * 0.21) * 16;
      const by = Math.sin(t * 0.17) * 10;
      const op = 0.48 + Math.cos(t * 0.27) * 0.10;
      bottomLightRef.current.style.transform = `translate3d(${bx.toFixed(1)}px, ${by.toFixed(1)}px, 0)`;
      bottomLightRef.current.style.opacity = op.toFixed(2);
    }
  });

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden z-0"
    >
      <div
        ref={topLightRef}
        className="absolute -left-20 -top-24 h-80 w-80 sm:h-96 sm:w-96 rounded-full will-change-transform"
        style={{
          background:
            'radial-gradient(circle, rgba(255,255,255,0.44) 0%, rgba(248,231,234,0.28) 45%, transparent 72%)',
        }}
      />
      <div
        ref={bottomLightRef}
        className="absolute -right-16 bottom-[-6%] h-72 w-72 sm:h-96 sm:w-96 rounded-full will-change-transform"
        style={{
          background:
            'radial-gradient(circle, rgba(201,24,43,0.16) 0%, rgba(248,231,234,0.22) 48%, transparent 74%)',
        }}
      />
    </div>
  );
}
