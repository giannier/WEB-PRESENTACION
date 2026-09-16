'use client';

import { Environment, Lightformer } from '@react-three/drei';

import { useQuality } from '@/context/QualityContext';
import {
  ENVIRONMENT_FRAMES,
  ENVIRONMENT_INTENSITY,
  STUDIO_LIGHTFORMERS,
} from '@/lib/constants';

/**
 * Procedural studio environment.
 *
 * Replaces drei's `preset` presets, which resolve to an HDR hosted on a third-party
 * CDN and therefore turn a runtime network request into a hard dependency of the
 * look. Here the cube map is baked locally from the emissive rig in `constants.ts`.
 *
 * `frames={1}` bakes exactly once on mount: the rig is static, so re-rendering it
 * every frame would burn six camera passes per frame for an identical result.
 */
export function StudioEnvironment() {
  const { environmentResolution } = useQuality();

  return (
    <Environment
      frames={ENVIRONMENT_FRAMES}
      resolution={environmentResolution}
      background={false}
      environmentIntensity={ENVIRONMENT_INTENSITY}
    >
      {STUDIO_LIGHTFORMERS.map((light) => (
        <Lightformer
          key={light.id}
          form={light.form}
          intensity={light.intensity}
          color={light.color}
          position={[light.position[0], light.position[1], light.position[2]]}
          scale={[light.scale[0], light.scale[1], light.scale[2]]}
        />
      ))}
    </Environment>
  );
}

export default StudioEnvironment;
