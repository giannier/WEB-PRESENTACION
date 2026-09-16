'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useQuality } from '@/context/QualityContext';
import { useWheel, type TapHandler } from '@/context/WheelContext';
import { COMPANIES, COMPANY_COUNT } from '@/data/companies';
import { useCompanyTextures } from '@/hooks/useCompanyTextures';
import { useWheelPhysics } from '@/hooks/useWheelPhysics';
import { CompanyCard, type CardHandle } from '@/components/wheel/CompanyCard';
import { createCardGeometry, createLogoGeometry } from '@/components/wheel/cardGeometry';
import {
  BACKFACE_DIM,
  BACKFACE_EDGE,
  BILLBOARD_BLEND,
  EMISSIVE_PEAK_LOW,
  FOCUS_DAMP_LAMBDA,
  FOCUS_INNER,
  FOCUS_OPACITY_FAR,
  FOCUS_OPACITY_NEAR,
  FOCUS_OUTER,
  FOCUS_SCALE_FAR,
  FOCUS_SCALE_NEAR,
  GLOW_MAX_OPACITY,
  MAX_FRAME_DELTA,
  RADIUS,
  SELECT_OTHERS_SCALE,
} from '@/lib/constants';
import { angleStep, damp, normalizeIndex, smoothstep, wrapAngle } from '@/lib/math';

/* Scratch objects hoisted to module scope: nothing is allocated per frame or per tap. */
const POINTER = new THREE.Vector2();
const RAYCASTER = new THREE.Raycaster();
const RAY_TARGETS: THREE.Object3D[] = [];

/**
 * The cylinder.
 *
 * Owns the ONLY `useFrame` callback of the experience. Physics, the active-index
 * resolution, every per-card transform, the selection transition and the bloom
 * intensity are all driven from this single loop over plain refs. No card component
 * re-renders while the wheel is in motion.
 */
export function CompanyWheel() {
  const quality = useQuality();
  const wheel = useWheel();
  const advance = useWheelPhysics();
  const textures = useCompanyTextures();

  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);

  const groupRef = useRef<THREE.Group>(null);
  const handles = useRef<Array<CardHandle | null>>(
    Array.from({ length: COMPANY_COUNT }, () => null),
  );

  const cardGeometry = useMemo(() => createCardGeometry(), []);
  const logoGeometry = useMemo(() => createLogoGeometry(), []);

  useEffect(() => {
    return () => {
      cardGeometry.dispose();
      logoGeometry.dispose();
    };
  }, [cardGeometry, logoGeometry]);

  const angles = useMemo(() => {
    const step = angleStep(COMPANY_COUNT);
    return COMPANIES.map((_, index) => index * step);
  }, []);

  const register = useCallback((index: number, handle: CardHandle | null) => {
    handles.current[index] = handle;
  }, []);

  /* ------------------------------------------------------------------ *
   * Tap handling
   *
   * The DOM capture layer sits above the canvas and swallows pointer events, so R3F
   * never sees a click. Instead the capture layer forwards taps here and we raycast
   * manually. This is also cheaper than R3F's built-in events: we raycast once per
   * tap instead of on every pointer move.
   * ------------------------------------------------------------------ */
  const { tapHandlerRef, activeIndexRef, selectCompany, snapToIndex } = wheel;

  useEffect(() => {
    const handleTap: TapHandler = (clientX, clientY) => {
      const rect = gl.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      POINTER.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      );
      RAYCASTER.setFromCamera(POINTER, camera);

      RAY_TARGETS.length = 0;
      for (const handle of handles.current) {
        if (handle !== null) RAY_TARGETS.push(handle.cardMesh);
      }

      const hit = RAYCASTER.intersectObjects(RAY_TARGETS, false)[0];
      RAY_TARGETS.length = 0;
      if (hit === undefined) return;

      const index = hit.object.userData.cardIndex;
      if (typeof index !== 'number') return;

      // Only the focused card can be entered. Tapping any other card brings it
      // to the front instead of navigating away unexpectedly.
      if (index === activeIndexRef.current) {
        selectCompany(index);
      } else {
        snapToIndex(index);
      }
    };

    tapHandlerRef.current = handleTap;
    return () => {
      if (tapHandlerRef.current === handleTap) tapHandlerRef.current = null;
    };
  }, [gl, camera, tapHandlerRef, activeIndexRef, selectCompany, snapToIndex]);

  /* ------------------------------------------------------------------ *
   * The single frame loop
   * ------------------------------------------------------------------ */
  useFrame((_, rawDelta) => {
    const group = groupRef.current;
    if (group === null) return;

    // Clamp so a backgrounded tab cannot teleport the wheel on return.
    const delta = Math.min(rawDelta, MAX_FRAME_DELTA);

    const rotation = advance(delta);
    group.rotation.x = rotation;

    const step = angleStep(COMPANY_COUNT);
    wheel.reportActiveIndex(normalizeIndex(Math.round(rotation / step), COMPANY_COUNT));

    const selection = wheel.selection.current;
    const selectedIndex = wheel.selectedIndexRef.current;
    const isTransitioning = wheel.isTransitioningRef.current;

    if (isTransitioning && wheel.bloomRef.current !== null) {
      wheel.bloomRef.current.intensity = selection.bloom;
    }

    const list = handles.current;

    for (let index = 0; index < list.length; index += 1) {
      const handle = list[index];
      // `noUncheckedIndexedAccess` widens the element type, and a card that has not
      // registered yet is legitimately absent for its first frame.
      if (handle === null || handle === undefined) continue;

      const offset = wrapAngle(rotation - handle.angle);
      const distance = Math.abs(offset) / Math.PI;
      const focus = 1 - smoothstep(FOCUS_INNER, FOCUS_OUTER, distance);

      // Billboard on the X axis only: the card keeps orbiting the cylinder but its
      // face stays square to the camera. Blend 0 would leave the raw cylinder normal.
      const cylinderRotation = -handle.angle;
      const billboardRotation = -rotation;
      handle.group.rotation.x =
        cylinderRotation + (billboardRotation - cylinderRotation) * BILLBOARD_BLEND;

      let targetScale = FOCUS_SCALE_FAR + (FOCUS_SCALE_NEAR - FOCUS_SCALE_FAR) * focus;
      let targetOpacity = FOCUS_OPACITY_FAR + (FOCUS_OPACITY_NEAR - FOCUS_OPACITY_FAR) * focus;

      // Cards on the far side of the cylinder read as depth, not as clutter.
      const facing = Math.cos(offset);
      targetOpacity *=
        BACKFACE_DIM + (1 - BACKFACE_DIM) * smoothstep(-BACKFACE_EDGE, BACKFACE_EDGE, facing);

      let radius = RADIUS;

      if (isTransitioning && index === selectedIndex) {
        // Hero card: GSAP owns these values outright, so no damping.
        radius = RADIUS + selection.z;
        handle.group.scale.setScalar(selection.scale);
        handle.cardMaterial.opacity = 1;
        handle.logoMaterial.opacity = 1;
        handle.logoMaterial.emissiveIntensity = selection.emissive;

        if (handle.glowMaterial !== null) {
          handle.glowMaterial.opacity =
            (selection.emissive / EMISSIVE_PEAK_LOW) * GLOW_MAX_OPACITY;
        }
      } else if (isTransitioning) {
        // The other eighteen collapse and dissolve.
        const scale = targetScale + (SELECT_OTHERS_SCALE - targetScale) * selection.fade;
        const opacity = targetOpacity * (1 - selection.fade);
        handle.group.scale.setScalar(scale);
        handle.cardMaterial.opacity = opacity;
        handle.logoMaterial.opacity = opacity;
      } else {
        const scale = damp(handle.group.scale.x, targetScale, FOCUS_DAMP_LAMBDA, delta);
        handle.group.scale.setScalar(scale);

        const opacity = damp(
          handle.cardMaterial.opacity,
          targetOpacity,
          FOCUS_DAMP_LAMBDA,
          delta,
        );
        handle.cardMaterial.opacity = opacity;
        handle.logoMaterial.opacity = opacity;
      }

      handle.group.position.set(0, handle.sinAngle * radius, handle.cosAngle * radius);
    }
  });

  return (
    <group ref={groupRef}>
      {COMPANIES.map((company, index) => {
        const texture = textures[index];
        const angle = angles[index];
        if (texture === undefined || angle === undefined) return null;

        return (
          <CompanyCard
            key={company.slug}
            index={index}
            angle={angle}
            texture={texture}
            cardGeometry={cardGeometry}
            logoGeometry={logoGeometry}
            register={register}
          />
        );
      })}
    </group>
  );
}

export default CompanyWheel;
