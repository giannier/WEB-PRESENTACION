'use client';

import { useWheel } from '@/context/WheelContext';

/**
 * Full-bleed white flash fired near the peak of the selection transition.
 *
 * Kept as a DOM element rather than a scene object: GSAP can drive its opacity
 * directly and it costs nothing while idle. It never intercepts pointer events.
 */
export function FlashOverlay() {
  const { flashRef } = useWheel();

  return (
    <div
      ref={(node) => {
        flashRef.current = node;
      }}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 bg-white opacity-0"
      style={{ willChange: 'opacity' }}
    />
  );
}

export default FlashOverlay;
