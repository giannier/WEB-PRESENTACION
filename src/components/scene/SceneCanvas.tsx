'use client';

import { AdaptiveDpr, AdaptiveEvents, PerformanceMonitor } from '@react-three/drei';
import { Canvas, useThree, type RootState } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';

import { Lighting } from '@/components/scene/Lighting';
import { SceneLoader } from '@/components/scene/Loader';
import { StudioEnvironment } from '@/components/scene/StudioEnvironment';
import { CompanyHud } from '@/components/ui/CompanyHud';
import { FlashOverlay } from '@/components/ui/FlashOverlay';
import { CompanyWheel } from '@/components/wheel/CompanyWheel';
import { QualityProvider, useQuality } from '@/context/QualityContext';
import { WheelProvider, useWheel, type BloomHandle } from '@/context/WheelContext';
import { preloadCompanyTextures } from '@/hooks/useCompanyTextures';
import { useWheelInput } from '@/hooks/useWheelPhysics';
import {
  BLOOM_LUMINANCE_SMOOTHING,
  BLOOM_LUMINANCE_THRESHOLD,
  BLOOM_MIPMAP_BLUR,
  CAMERA_BASE_DISTANCE,
  CAMERA_FAR,
  CAMERA_FOV,
  CAMERA_HEIGHT_MARGIN,
  CAMERA_MAX_DISTANCE,
  CAMERA_MIN_DISTANCE,
  CAMERA_NEAR,
  CAMERA_WIDTH_MARGIN,
  CARD_HEIGHT,
  CARD_WIDTH,
  HERO_FILL_RATIO,
  HERO_MIN_SCALE,
  LOGO_MAX_HEIGHT,
  LOGO_MAX_WIDTH,
  PERF_DPR_FLOOR,
  RADIUS,
  SELECT_SCALE,
  SELECT_Z_OFFSET,
  TRANSMISSION_RESOLUTION_SCALE,
} from '@/lib/constants';
import { clamp } from '@/lib/math';

// Start fetching the logo atlas the moment this client chunk evaluates, which is
// well before the WebGL context is ready.
preloadCompanyTextures();

/* ------------------------------------------------------------------ *
 * Environment resilience
 * ------------------------------------------------------------------ */

/**
 * The environment is baked locally, so there is no network dependency left to fail.
 * The boundary stays as a last-resort guard: if the cube-map bake throws on an
 * unusual driver, the scene must still render — only the reflections are lost, and
 * the discrete lights carry the look on their own.
 */
class EnvironmentBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  public override state = { failed: false };

  public static getDerivedStateFromError() {
    return { failed: true };
  }

  public override render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

/* ------------------------------------------------------------------ *
 * Responsive framing
 * ------------------------------------------------------------------ */

/**
 * Solves the camera distance from the live viewport so the focused card is always
 * fully framed — a 9:16 phone needs far more pull-back than a 16:9 desktop.
 *
 * Also solves the hero scale for the selection transition. `SELECT_SCALE` is the
 * desktop target; on a narrow viewport it is clamped down so the logo never leaves
 * the frame at the peak of the money shot.
 */
function CameraRig() {
  const camera = useThree((state) => state.camera);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const { heroScaleRef } = useWheel();

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    if (width === 0 || height === 0) return;

    const aspect = width / height;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);

    const byHeight = (CARD_HEIGHT * 0.5 * CAMERA_HEIGHT_MARGIN) / tan;
    const byWidth = (CARD_WIDTH * 0.5 * CAMERA_WIDTH_MARGIN) / (tan * aspect);
    const distance = clamp(
      Math.max(byWidth, byHeight),
      CAMERA_MIN_DISTANCE,
      CAMERA_MAX_DISTANCE,
    );

    camera.position.set(0, 0, RADIUS + distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    const heroDistance = Math.max(distance - SELECT_Z_OFFSET, 0.5);
    const visibleHeight = 2 * heroDistance * tan;
    const visibleWidth = visibleHeight * aspect;

    heroScaleRef.current = clamp(
      Math.min(
        SELECT_SCALE,
        (visibleWidth * HERO_FILL_RATIO) / LOGO_MAX_WIDTH,
        (visibleHeight * HERO_FILL_RATIO) / LOGO_MAX_HEIGHT,
      ),
      HERO_MIN_SCALE,
      SELECT_SCALE,
    );
  }, [camera, width, height, heroScaleRef]);

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
 * Selective bloom
 * ------------------------------------------------------------------ */

/**
 * Mounted ONLY while a selection transition is playing.
 *
 * A composer running during normal browsing would cost a full-screen pass every
 * frame for an effect that is invisible 99% of the time. Because the wheel is frozen
 * once the transition starts, the GPU has the headroom exactly when it is needed.
 */
function SelectionEffects() {
  const { bloomRef } = useWheel();

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        ref={(instance) => {
          bloomRef.current = instance as unknown as BloomHandle | null;
        }}
        intensity={0}
        luminanceThreshold={BLOOM_LUMINANCE_THRESHOLD}
        luminanceSmoothing={BLOOM_LUMINANCE_SMOOTHING}
        mipmapBlur={BLOOM_MIPMAP_BLUR}
      />
    </EffectComposer>
  );
}

/* ------------------------------------------------------------------ *
 * Scene graph
 * ------------------------------------------------------------------ */

function Scene() {
  const quality = useQuality();
  const { isTransitioning } = useWheel();

  return (
    <>
      <CameraRig />
      <Lighting />

      <Suspense fallback={<SceneLoader />}>
        <CompanyWheel />
      </Suspense>

      <EnvironmentBoundary>
        <Suspense fallback={null}>
          <StudioEnvironment />
        </Suspense>
      </EnvironmentBoundary>

      {quality.bloom && isTransitioning && <SelectionEffects />}

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

  const handleCreated = useCallback(
    (state: RootState) => {
      state.gl.toneMapping = THREE.ACESFilmicToneMapping;
      state.gl.toneMappingExposure = 1.05;

      if (quality.isHigh) {
        // Halving the transmission render target is invisible on frosted glass and
        // roughly quarters the cost of the transmission pass.
        const renderer = state.gl as THREE.WebGLRenderer & {
          transmissionResolutionScale?: number;
        };
        if (typeof renderer.transmissionResolutionScale === 'number') {
          renderer.transmissionResolutionScale = TRANSMISSION_RESOLUTION_SCALE;
        }
      }
    },
    [quality.isHigh],
  );

  return (
    <div className="fixed inset-0">
      <Canvas
        dpr={dpr}
        shadows={quality.shadows ? 'soft' : false}
        frameloop="always"
        gl={{
          antialias: quality.antialias,
          powerPreference: 'high-performance',
          alpha: true,
        }}
        camera={{
          fov: CAMERA_FOV,
          near: CAMERA_NEAR,
          far: CAMERA_FAR,
          position: [0, 0, RADIUS + CAMERA_BASE_DISTANCE],
        }}
        onCreated={handleCreated}
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
      <FlashOverlay />
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
