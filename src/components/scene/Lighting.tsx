'use client';

import { useQuality } from '@/context/QualityContext';
import {
  AMBIENT_INTENSITY,
  DIRECTIONAL_INTENSITY,
  DIRECTIONAL_POSITION,
  DIRECTIONAL_SHADOW_BIAS,
  DIRECTIONAL_SHADOW_BOUNDS,
  DIRECTIONAL_SHADOW_FAR,
  DIRECTIONAL_SHADOW_NEAR,
  FOCUS_LIGHT_COLOR,
  FOCUS_LIGHT_DECAY,
  FOCUS_LIGHT_DISTANCE,
  FOCUS_LIGHT_INTENSITY,
  FOCUS_LIGHT_POSITION,
  RIM_LIGHT_COLOR,
  RIM_LIGHT_INTENSITY,
  RIM_LIGHT_POSITION,
} from '@/lib/constants';

export function Lighting() {
  const { shadows, shadowMapSize } = useQuality();

  return (
    <>
      <ambientLight intensity={AMBIENT_INTENSITY} />

      <directionalLight
        position={DIRECTIONAL_POSITION}
        intensity={DIRECTIONAL_INTENSITY}
        castShadow={shadows}
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-bias={DIRECTIONAL_SHADOW_BIAS}
        shadow-camera-near={DIRECTIONAL_SHADOW_NEAR}
        shadow-camera-far={DIRECTIONAL_SHADOW_FAR}
        shadow-camera-left={-DIRECTIONAL_SHADOW_BOUNDS}
        shadow-camera-right={DIRECTIONAL_SHADOW_BOUNDS}
        shadow-camera-top={DIRECTIONAL_SHADOW_BOUNDS}
        shadow-camera-bottom={-DIRECTIONAL_SHADOW_BOUNDS}
      />

      {/*
        The signature light. Sitting just in front of the focus slot with a short
        distance and a steep decay, it only reaches a card once that card has almost
        arrived at the front — which is what produces the glint as each logo lands.
      */}
      <pointLight
        position={FOCUS_LIGHT_POSITION}
        intensity={FOCUS_LIGHT_INTENSITY}
        color={FOCUS_LIGHT_COLOR}
        distance={FOCUS_LIGHT_DISTANCE}
        decay={FOCUS_LIGHT_DECAY}
      />

      {/* Cool counter-light so the glass edges separate from the dark backdrop. */}
      <pointLight
        position={RIM_LIGHT_POSITION}
        intensity={RIM_LIGHT_INTENSITY}
        color={RIM_LIGHT_COLOR}
      />
    </>
  );
}

export default Lighting;
