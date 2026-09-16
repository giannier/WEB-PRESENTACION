'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { useQuality } from '@/context/QualityContext';
import { fitLogoSize } from '@/components/wheel/cardGeometry';
import {
  FOCUS_OPACITY_FAR,
  GLASS_COLOR,
  GLASS_HIGH,
  GLASS_LOW,
  GLOW_SCALE,
  GLOW_Z_OFFSET,
  LOGO_MAX_HEIGHT,
  LOGO_MAX_WIDTH,
  LOGO_Z_OFFSET,
} from '@/lib/constants';

/**
 * Everything the parent frame loop needs to drive one card.
 * Mutating these objects is the ONLY way a card ever animates; the component itself
 * renders exactly once per quality tier.
 */
export type CardHandle = {
  readonly index: number;
  readonly angle: number;
  readonly sinAngle: number;
  readonly cosAngle: number;
  readonly group: THREE.Group;
  readonly cardMesh: THREE.Mesh;
  readonly cardMaterial: THREE.MeshPhysicalMaterial;
  readonly logoMaterial: THREE.MeshPhysicalMaterial;
  readonly glowMaterial: THREE.MeshBasicMaterial | null;
};

type CompanyCardProps = {
  readonly index: number;
  readonly angle: number;
  readonly texture: THREE.Texture;
  readonly cardGeometry: THREE.BufferGeometry;
  readonly logoGeometry: THREE.BufferGeometry;
  readonly register: (index: number, handle: CardHandle | null) => void;
};

function readTextureAspect(texture: THREE.Texture): number {
  const image = texture.image as { width?: number; height?: number } | null;
  if (image == null) return 1;
  const { width, height } = image;
  if (typeof width !== 'number' || typeof height !== 'number' || height === 0) return 1;
  return width / height;
}

export function CompanyCard({
  index,
  angle,
  texture,
  cardGeometry,
  logoGeometry,
  register,
}: CompanyCardProps) {
  const quality = useQuality();

  const groupRef = useRef<THREE.Group>(null);
  const cardMeshRef = useRef<THREE.Mesh>(null);

  /**
   * Frosted glass.
   *
   * High tier uses real `transmission`. Low tier deliberately does NOT: three.js
   * renders a transmission pass whose cost scales with the transmissive render list,
   * and nineteen of them is the difference between smooth and unusable on a
   * mid-range phone. The cheap path leans on the environment map instead, which is
   * what actually sells the glass.
   */
  const cardMaterial = useMemo(() => {
    const base = {
      color: new THREE.Color(GLASS_COLOR),
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
      opacity: FOCUS_OPACITY_FAR,
    };

    return quality.isHigh
      ? new THREE.MeshPhysicalMaterial({ ...base, ...GLASS_HIGH })
      : new THREE.MeshPhysicalMaterial({ ...base, ...GLASS_LOW });
  }, [quality.isHigh]);

  const logoMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      map: texture,
      emissive: new THREE.Color(0xffffff),
      emissiveMap: texture,
      emissiveIntensity: 0,
      transparent: true,
      opacity: FOCUS_OPACITY_FAR,
      alphaTest: 0.02,
      depthWrite: false,
      toneMapped: false,
      roughness: 0.55,
      metalness: 0,
      side: THREE.FrontSide,
    });
  }, [texture]);

  // Low tier only: an additive quad standing in for the bloom pass during selection.
  const glowMaterial = useMemo(() => {
    if (quality.bloom) return null;
    return new THREE.MeshBasicMaterial({
      map: texture,
      color: new THREE.Color(0xffffff),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: THREE.FrontSide,
    });
  }, [quality.bloom, texture]);

  const logoSize = useMemo(
    () => fitLogoSize(readTextureAspect(texture), LOGO_MAX_WIDTH, LOGO_MAX_HEIGHT),
    [texture],
  );

  const trig = useMemo(
    () => ({ sin: Math.sin(angle), cos: Math.cos(angle) }),
    [angle],
  );

  // Publish the handle to the parent loop. A layout effect runs before the first
  // rendered frame, so no card is ever painted sitting at the untransformed origin.
  useLayoutEffect(() => {
    const group = groupRef.current;
    const cardMesh = cardMeshRef.current;
    if (group === null || cardMesh === null) return;

    cardMesh.userData.cardIndex = index;

    register(index, {
      index,
      angle,
      sinAngle: trig.sin,
      cosAngle: trig.cos,
      group,
      cardMesh,
      cardMaterial,
      logoMaterial,
      glowMaterial,
    });

    return () => {
      register(index, null);
    };
  }, [index, angle, trig, cardMaterial, logoMaterial, glowMaterial, register]);

  useEffect(() => {
    return () => {
      cardMaterial.dispose();
      logoMaterial.dispose();
      glowMaterial?.dispose();
    };
  }, [cardMaterial, logoMaterial, glowMaterial]);

  return (
    <group ref={groupRef}>
      <mesh
        ref={cardMeshRef}
        geometry={cardGeometry}
        material={cardMaterial}
        castShadow={quality.shadows}
        receiveShadow={quality.shadows}
      />

      {glowMaterial !== null && (
        <mesh
          geometry={logoGeometry}
          material={glowMaterial}
          position={[0, 0, GLOW_Z_OFFSET]}
          scale={[logoSize.width * GLOW_SCALE, logoSize.height * GLOW_SCALE, 1]}
        />
      )}

      <mesh
        geometry={logoGeometry}
        material={logoMaterial}
        position={[0, 0, LOGO_Z_OFFSET]}
        scale={[logoSize.width, logoSize.height, 1]}
      />
    </group>
  );
}
