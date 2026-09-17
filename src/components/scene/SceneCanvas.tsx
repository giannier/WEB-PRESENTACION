'use client';

import { AdaptiveDpr, AdaptiveEvents, PerformanceMonitor } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { SceneLoader } from '@/components/scene/Loader';
import { CompanyHud } from '@/components/ui/CompanyHud';
import { CompanyWheel } from '@/components/wheel/CompanyWheel';
import { QualityProvider, useQuality } from '@/context/QualityContext';
import { WheelProvider, useWheel } from '@/context/WheelContext';
import { preloadCompanyTextures } from '@/hooks/useCompanyTextures';
import { useWheelInput } from '@/hooks/useWheelPhysics';
import {
  CAMERA_BASE_DISTANCE,
  CAMERA_FAR,
  CAMERA_FOV,
  CAMERA_HEIGHT_MARGIN,
  CAMERA_MAX_DISTANCE,
  CAMERA_MIN_DISTANCE,
  CAMERA_NEAR,
  CAMERA_WIDTH_MARGIN,
  DRAG_TRACKING_GAIN,
  LOGO_SIZE,
  PERF_DPR_FLOOR,
  RADIUS,
  SCENE_BACKGROUND,
} from '@/lib/constants';
import { clamp } from '@/lib/math';

// Start fetching the logo textures the moment this client chunk evaluates, which is
// well before the WebGL context is ready.
preloadCompanyTextures();

/* ------------------------------------------------------------------ *
 * Responsive framing
 * ------------------------------------------------------------------ */

/**
 * Solves the camera distance from the live viewport so the front logo is always framed:
 * a 9:16 phone needs far more pull-back than a 16:9 desktop. Also solves the drag
 * sensitivity from the same framing, so the logo under the finger follows the finger.
 */
function CameraRig() {
  const camera = useThree((state) => state.camera);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const { dragSensitivityRef } = useWheel();

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    if (width === 0 || height === 0) return;

    const aspect = width / height;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const halfLogo = LOGO_SIZE * 0.5;

    const byHeight = (halfLogo * CAMERA_HEIGHT_MARGIN) / tan;
    const byWidth = (halfLogo * CAMERA_WIDTH_MARGIN) / (tan * aspect);
    const distance = clamp(
      Math.max(byWidth, byHeight),
      CAMERA_MIN_DISTANCE,
      CAMERA_MAX_DISTANCE,
    );

    camera.position.set(0, 0, RADIUS + distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    // Finger tracking. The front logo sits `distance` from the camera, so this is how
    // many CSS pixels one world unit spans on its plane; a small rotation then moves
    // that logo by `RADIUS * angle` units.
    const pixelsPerUnit = height / (2 * distance * tan);
    dragSensitivityRef.current = DRAG_TRACKING_GAIN / (pixelsPerUnit * RADIUS);
  }, [camera, width, height, dragSensitivityRef]);

  return null;
}

/** Steps the device pixel ratio down when the device cannot sustain the frame rate. */
function PerformanceGuard() {
  const setDpr = useThree((state) => state.setDpr);
  const { dpr } = useQuality();
  const maxDpr = dpr[1];

  const handleChange = useCallback(
    ({ factor }: { factor: number }) => {
      setDpr(clamp(PERF_DPR_FLOOR + (maxDpr - PERF_DPR_FLOOR) * factor, PERF_DPR_FLOOR, maxDpr));
    },
    [setDpr, maxDpr],
  );

  const handleFallback = useCallback(() => {
    setDpr(PERF_DPR_FLOOR);
  }, [setDpr]);

  return <PerformanceMonitor flipflops={3} onChange={handleChange} onFallback={handleFallback} />;
}

/* ------------------------------------------------------------------ *
 * Scene graph
 * ------------------------------------------------------------------ */

/**
 * No lights, no environment map, no post-processing. The logos are unlit, so the
 * scene is just textured planes on a white clear colour — the cheapest possible frame.
 */
function Scene() {
  return (
    <>
      <color attach="background" args={[SCENE_BACKGROUND]} />
      <CameraRig />

      <Suspense fallback={<SceneLoader />}>
        <CompanyWheel />
      </Suspense>

      <AdaptiveDpr pixelated />
      <AdaptiveEvents />
      <PerformanceGuard />
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Experience shell
 * ------------------------------------------------------------------ */

function Experience() {
  const quality = useQuality();
  const captureRef = useRef<HTMLDivElement>(null);

  useWheelInput(captureRef);

  const dpr = useMemo<[number, number]>(() => [quality.dpr[0], quality.dpr[1]], [quality.dpr]);

  return (
    <div className="fixed inset-0">
      <Canvas
        dpr={dpr}
        // `flat` disables tone mapping: brand colours must reach the screen unaltered.
        flat
        frameloop="always"
        gl={{ antialias: quality.antialias, powerPreference: 'high-performance' }}
        camera={{
          fov: CAMERA_FOV,
          near: CAMERA_NEAR,
          far: CAMERA_FAR,
          position: [0, 0, RADIUS + CAMERA_BASE_DISTANCE],
        }}
      >
        <Scene />
      </Canvas>

      {/*
        Full-screen input capture. It sits above the canvas and owns every wheel,
        pointer and touch gesture; taps are raycast manually by <CompanyWheel>.
        `touch-none` stops the browser from scrolling the page mid-swipe.
      */}
      <div ref={captureRef} aria-hidden="true" className="absolute inset-0 z-10 touch-none" />

      <CompanyHud />
    </div>
  );
}

/**
 * Client-only root of the 3D experience.
 *
 * Owns both providers because the quality probe must never run on the server, and
 * because the HTML chrome outside the canvas shares the same wheel state as the
 * scene inside it. React context crosses the canvas boundary via the context bridge
 * that react-three-fiber installs.
 */
export function SceneCanvas() {
  return (
    <QualityProvider>
      <WheelProvider>
        <Experience />
      </WheelProvider>
    </QualityProvider>
  );
}

export default SceneCanvas;
