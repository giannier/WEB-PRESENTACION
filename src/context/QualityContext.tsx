'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { useQualityTier, type QualityTier } from '@/hooks/useQualityTier';
import {
  ANISOTROPY_HIGH,
  ANISOTROPY_LOW,
  DPR_HIGH,
  DPR_LOW,
  EMISSIVE_PEAK_HIGH,
  EMISSIVE_PEAK_LOW,
  ENVIRONMENT_RESOLUTION_HIGH,
  ENVIRONMENT_RESOLUTION_LOW,
  SHADOW_MAP_SIZE_HIGH,
  SHADOW_MAP_SIZE_LOW,
} from '@/lib/constants';

export type QualitySettings = {
  readonly tier: QualityTier;
  readonly isHigh: boolean;
  readonly dpr: readonly [number, number];
  readonly anisotropy: number;
  readonly shadows: boolean;
  readonly shadowMapSize: number;
  readonly environmentResolution: number;
  readonly bloom: boolean;
  readonly emissivePeak: number;
  readonly antialias: boolean;
};

const QualityContext = createContext<QualitySettings | null>(null);

export function QualityProvider({ children }: { children: ReactNode }) {
  const tier = useQualityTier();

  const value = useMemo<QualitySettings>(() => {
    const isHigh = tier === 'high';
    return {
      tier,
      isHigh,
      dpr: isHigh ? DPR_HIGH : DPR_LOW,
      anisotropy: isHigh ? ANISOTROPY_HIGH : ANISOTROPY_LOW,
      shadows: isHigh,
      shadowMapSize: isHigh ? SHADOW_MAP_SIZE_HIGH : SHADOW_MAP_SIZE_LOW,
      environmentResolution: isHigh ? ENVIRONMENT_RESOLUTION_HIGH : ENVIRONMENT_RESOLUTION_LOW,
      bloom: isHigh,
      emissivePeak: isHigh ? EMISSIVE_PEAK_HIGH : EMISSIVE_PEAK_LOW,
      antialias: isHigh,
    };
  }, [tier]);

  return <QualityContext.Provider value={value}>{children}</QualityContext.Provider>;
}

export function useQuality(): QualitySettings {
  const value = useContext(QualityContext);
  if (value === null) {
    throw new Error('useQuality must be used inside a <QualityProvider>.');
  }
  return value;
}
