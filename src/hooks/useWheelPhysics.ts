'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useWheel } from '@/context/WheelContext';
import { COMPANY_COUNT } from '@/data/companies';
import {
  DRAG_SENSITIVITY,
  FRICTION,
  MAX_VELOCITY,
  POINTER_IDLE_RESET_MS,
  SNAP_DURATION,
  SNAP_EPSILON,
  SNAP_VELOCITY_THRESHOLD,
  TAP_THRESHOLD_PX,
  VELOCITY_SMOOTHING,
  WHEEL_LINE_HEIGHT,
  WHEEL_PAGE_HEIGHT,
  WHEEL_SENSITIVITY,
} from '@/lib/constants';
import { angleStep, clamp } from '@/lib/math';

/**
 * Advances the wheel rotation by one frame.
 *
 * Returns a stable callback rather than registering its own `useFrame`, so the whole
 * experience runs from a single frame loop owned by `<CompanyWheel>`. That removes any
 * ambiguity about whether physics ran before the cards read the rotation.
 *
 * Ownership of `rotation.current` is exclusive and moves between three writers:
 *  - the GSAP selection timeline while a transition is playing,
 *  - the GSAP snap tween while snapping,
 *  - this integrator otherwise (and the pointer handler during an active drag).
 */
export function useWheelPhysics(): (delta: number) => number {
  const { rotation, velocity, isDragging, isSnapping, isTransitioningRef, snapToRotation } =
    useWheel();

  return useCallback(
    (delta: number): number => {
      // A tween owns the rotation; do not fight it.
      if (isTransitioningRef.current || isSnapping.current) return rotation.current;

      // During a drag the pointer handler writes the rotation directly.
      if (isDragging.current) return rotation.current;

      if (velocity.current !== 0) {
        rotation.current += velocity.current * delta;
        // Frame-rate independent decay: FRICTION is defined per 1/60 s.
        velocity.current *= Math.pow(FRICTION, delta * 60);
      }

      if (Math.abs(velocity.current) < SNAP_VELOCITY_THRESHOLD) {
        velocity.current = 0;

        // Stateless snap trigger: if the wheel is at rest but off-grid, commit a snap.
        // Once the tween lands on an exact multiple of the step this is a no-op.
        const step = angleStep(COMPANY_COUNT);
        const nearest = Math.round(rotation.current / step) * step;
        if (Math.abs(rotation.current - nearest) > SNAP_EPSILON) {
          snapToRotation(nearest, SNAP_DURATION);
        }
      }

      return rotation.current;
    },
    [rotation, velocity, isDragging, isSnapping, isTransitioningRef, snapToRotation],
  );
}

/** Converts a `wheel` event into a consistent pixel delta regardless of `deltaMode`. */
function normalizeWheelDelta(event: WheelEvent): number {
  switch (event.deltaMode) {
    case 1: // DOM_DELTA_LINE
      return event.deltaY * WHEEL_LINE_HEIGHT;
    case 2: // DOM_DELTA_PAGE
      return event.deltaY * WHEEL_PAGE_HEIGHT;
    default: // DOM_DELTA_PIXEL
      return event.deltaY;
  }
}

/**
 * Binds wheel, pointer-drag and keyboard input to the full-screen capture layer.
 *
 * Runs outside the `<Canvas>`. A tap (pointer travel under `TAP_THRESHOLD_PX`) is
 * forwarded to the raycast handler that `<CompanyWheel>` registers, because the capture
 * layer sits above the canvas and would otherwise swallow every R3F pointer event.
 *
 * Direction contract:
 *  - dragging follows the finger (drag down, cards travel down),
 *  - wheel and arrow keys follow list-scrolling convention (scroll down, cards travel up).
 */
export function useWheelInput(targetRef: React.RefObject<HTMLElement | null>): void {
  const {
    rotation,
    velocity,
    isDragging,
    isTransitioningRef,
    tapHandlerRef,
    killSnap,
    markInteracted,
    nudge,
  } = useWheel();

  const pointerId = useRef<number | null>(null);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const travelled = useRef(0);
  const smoothedVelocity = useRef(0);

  useEffect(() => {
    const element = targetRef.current;
    if (element === null) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (isTransitioningRef.current) return;
      if (pointerId.current !== null) return;

      pointerId.current = event.pointerId;
      element.setPointerCapture(event.pointerId);

      killSnap();
      markInteracted();

      isDragging.current = true;
      velocity.current = 0;
      smoothedVelocity.current = 0;
      travelled.current = 0;
      startX.current = event.clientX;
      startY.current = event.clientY;
      lastY.current = event.clientY;
      lastTime.current = event.timeStamp;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (pointerId.current !== event.pointerId) return;
      if (!isDragging.current || isTransitioningRef.current) return;

      const deltaPixels = event.clientY - lastY.current;
      const deltaRadians = deltaPixels * DRAG_SENSITIVITY;
      rotation.current += deltaRadians;

      const deltaSeconds = (event.timeStamp - lastTime.current) / 1000;
      if (deltaSeconds > 0) {
        const instantaneous = clamp(deltaRadians / deltaSeconds, -MAX_VELOCITY, MAX_VELOCITY);
        smoothedVelocity.current =
          smoothedVelocity.current * (1 - VELOCITY_SMOOTHING) +
          instantaneous * VELOCITY_SMOOTHING;
      }

      travelled.current += Math.abs(deltaPixels);
      lastY.current = event.clientY;
      lastTime.current = event.timeStamp;
    };

    const endDrag = (event: PointerEvent) => {
      if (pointerId.current !== event.pointerId) return;

      if (element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
      pointerId.current = null;
      isDragging.current = false;

      if (isTransitioningRef.current) return;

      const horizontal = Math.abs(event.clientX - startX.current);
      const vertical = Math.abs(event.clientY - startY.current);
      const isTap = Math.hypot(horizontal, vertical) < TAP_THRESHOLD_PX;

      if (isTap) {
        velocity.current = 0;
        tapHandlerRef.current?.(event.clientX, event.clientY);
        return;
      }

      // A finger that paused before lifting should not launch the wheel.
      const idleMs = event.timeStamp - lastTime.current;
      velocity.current =
        idleMs > POINTER_IDLE_RESET_MS
          ? 0
          : clamp(smoothedVelocity.current, -MAX_VELOCITY, MAX_VELOCITY);
    };

    const handleWheel = (event: WheelEvent) => {
      if (isTransitioningRef.current) return;
      event.preventDefault();

      killSnap();
      markInteracted();

      const next = velocity.current - normalizeWheelDelta(event) * WHEEL_SENSITIVITY;
      velocity.current = clamp(next, -MAX_VELOCITY, MAX_VELOCITY);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTransitioningRef.current) return;
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;

      event.preventDefault();
      nudge(event.key === 'ArrowDown' ? -1 : 1);
    };

    element.addEventListener('pointerdown', handlePointerDown);
    element.addEventListener('pointermove', handlePointerMove);
    element.addEventListener('pointerup', endDrag);
    element.addEventListener('pointercancel', endDrag);
    // Non-passive: the page must not scroll while the wheel is being spun.
    element.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown);
      element.removeEventListener('pointermove', handlePointerMove);
      element.removeEventListener('pointerup', endDrag);
      element.removeEventListener('pointercancel', endDrag);
      element.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);

      if (pointerId.current !== null && element.hasPointerCapture(pointerId.current)) {
        element.releasePointerCapture(pointerId.current);
      }
      pointerId.current = null;
      isDragging.current = false;
    };
  }, [
    targetRef,
    rotation,
    velocity,
    isDragging,
    isTransitioningRef,
    tapHandlerRef,
    killSnap,
    markInteracted,
    nudge,
  ]);
}
