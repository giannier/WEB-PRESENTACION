'use client';

import gsap from 'gsap';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';

import { useQuality } from '@/context/QualityContext';
import { COMPANIES, COMPANY_COUNT, type Company } from '@/data/companies';
import {
  BLOOM_PEAK,
  CONFIRM_SCALE,
  CONFIRM_Z_OFFSET,
  FOCUS_SNAP_DURATION,
  SELECT_CONFIRM_DURATION,
  SELECT_CONFIRM_FADE,
  SELECT_CONFIRM_FADE_DURATION,
  SELECT_CONFIRM_FLARE_DURATION,
  SELECT_CONFIRM_FLARE_START,
  SELECT_CONFIRM_FLASH_IN_DURATION,
  SELECT_CONFIRM_FLASH_OUT_DURATION,
  SELECT_CONFIRM_FLASH_PEAK,
  SELECT_CONFIRM_FLASH_START,
  SELECT_CONFIRM_PULSE_DURATION,
  SELECT_RESTORE_DURATION,
  SELECT_ROTATION_SNAP_DURATION,
  SELECT_SCALE,
  SNAP_DURATION,
  SNAP_EASE,
} from '@/lib/constants';
import { angleStep, rotationForIndex } from '@/lib/math';

/**
 * Animatable scalars for the selection transition.
 *
 * GSAP only ever writes into this plain object; `useFrame` is the single place that
 * pushes the values onto the scene graph. Keeping the tween target inert is what lets
 * the whole transition run with zero React re-renders.
 */
export type SelectionProxy = {
  /** 0 -> 1 fade-out progress of the 18 non-selected cards. */
  fade: number;
  /** Outward travel of the hero card along the cylinder normal. */
  z: number;
  /** Absolute scale of the hero card. */
  scale: number;
  /** `emissiveIntensity` of the hero logo. */
  emissive: number;
  /** Bloom effect intensity (high tier only). */
  bloom: number;
};

/** Minimal structural type for the postprocessing BloomEffect instance we drive. */
export type BloomHandle = { intensity: number };

/** Screen-space tap forwarded from the DOM capture layer into the R3F raycaster. */
export type TapHandler = (clientX: number, clientY: number) => void;

export type WheelContextValue = {
  /* --- mutable per-frame state (never triggers a render) --- */
  readonly rotation: RefObject<number>;
  readonly velocity: RefObject<number>;
  readonly isDragging: RefObject<boolean>;
  readonly isSnapping: RefObject<boolean>;
  readonly isTransitioningRef: RefObject<boolean>;
  readonly activeIndexRef: RefObject<number>;
  readonly selectedIndexRef: RefObject<number>;
  readonly selection: RefObject<SelectionProxy>;
  readonly bloomRef: RefObject<BloomHandle | null>;
  readonly flashRef: RefObject<HTMLElement | null>;
  readonly tapHandlerRef: RefObject<TapHandler | null>;
  /** Hero scale solved against the live viewport by `<CameraRig>`. */
  readonly heroScaleRef: RefObject<number>;

  /* --- rendered state (changes rarely, on purpose) --- */
  readonly activeIndex: number;
  readonly isTransitioning: boolean;
  readonly hasInteracted: boolean;
  /** Set when the browser refused the new tab, so the HUD can offer a manual link. */
  readonly blockedCompany: Company | null;

  /* --- commands --- */
  readonly reportActiveIndex: (index: number) => void;
  readonly markInteracted: () => void;
  readonly killSnap: () => void;
  readonly snapToRotation: (target: number, duration?: number) => void;
  readonly snapToIndex: (index: number, duration?: number) => void;
  readonly nudge: (direction: number) => void;
  /** Tap on the 3D card: opens the tab itself, then plays the confirmation. */
  readonly selectCompany: (index: number) => void;
  /** Anchor click: the browser already opened the tab, so this only plays the confirmation. */
  readonly confirmSelection: (index: number) => void;
  readonly resetSelection: () => void;
  readonly dismissBlockedNotice: () => void;
};

const WheelContext = createContext<WheelContextValue | null>(null);

function createSelectionProxy(): SelectionProxy {
  return { fade: 0, z: 0, scale: 1, emissive: 0, bloom: 0 };
}

export function WheelProvider({ children }: { children: ReactNode }) {
  const quality = useQuality();

  const rotation = useRef(0);
  const velocity = useRef(0);
  const isDragging = useRef(false);
  const isSnapping = useRef(false);
  const isTransitioningRef = useRef(false);
  const activeIndexRef = useRef(0);
  const selectedIndexRef = useRef(-1);
  const selection = useRef<SelectionProxy>(createSelectionProxy());
  const bloomRef = useRef<BloomHandle | null>(null);
  const flashRef = useRef<HTMLElement | null>(null);
  const tapHandlerRef = useRef<TapHandler | null>(null);
  const heroScaleRef = useRef<number>(SELECT_SCALE);

  const rotationProxy = useRef({ value: 0 });
  const snapTween = useRef<gsap.core.Tween | null>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const hasNavigated = useRef(false);
  const hasInteractedRef = useRef(false);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [blockedCompany, setBlockedCompany] = useState<Company | null>(null);

  const reportActiveIndex = useCallback((index: number) => {
    if (activeIndexRef.current === index) return;
    activeIndexRef.current = index;
    setActiveIndex(index);
  }, []);

  const markInteracted = useCallback(() => {
    if (hasInteractedRef.current) return;
    hasInteractedRef.current = true;
    setHasInteracted(true);
  }, []);

  const killSnap = useCallback(() => {
    if (snapTween.current !== null) {
      snapTween.current.kill();
      snapTween.current = null;
    }
    isSnapping.current = false;
  }, []);

  const snapToRotation = useCallback(
    (target: number, duration: number = SNAP_DURATION) => {
      killSnap();
      isSnapping.current = true;
      velocity.current = 0;
      rotationProxy.current.value = rotation.current;

      snapTween.current = gsap.to(rotationProxy.current, {
        value: target,
        duration,
        ease: SNAP_EASE,
        overwrite: true,
        onUpdate: () => {
          rotation.current = rotationProxy.current.value;
        },
        onComplete: () => {
          isSnapping.current = false;
          snapTween.current = null;
        },
      });
    },
    [killSnap],
  );

  const snapToIndex = useCallback(
    (index: number, duration: number = FOCUS_SNAP_DURATION) => {
      snapToRotation(rotationForIndex(index, rotation.current, COMPANY_COUNT), duration);
    },
    [snapToRotation],
  );

  const nudge = useCallback(
    (direction: number) => {
      if (isTransitioningRef.current) return;
      markInteracted();
      const step = angleStep(COMPANY_COUNT);
      const target = (Math.round(rotation.current / step) + direction) * step;
      snapToRotation(target, SNAP_DURATION);
    },
    [markInteracted, snapToRotation],
  );

  /**
   * Returns every selection scalar to rest and unlocks input.
   *
   * Idempotent and safe to call at any moment — including when nothing is in flight,
   * which is exactly what the bfcache and visibility recovery handlers below rely on.
   */
  const resetSelection = useCallback(() => {
    if (timeline.current !== null) {
      timeline.current.kill();
      timeline.current = null;
    }
    if (snapTween.current !== null) {
      snapTween.current.kill();
      snapTween.current = null;
    }

    const proxy = selection.current;
    proxy.fade = 0;
    proxy.z = 0;
    proxy.scale = 1;
    proxy.emissive = 0;
    proxy.bloom = 0;

    // A killed tween can leave the overlay stranded mid-fade, and the bloom effect is
    // outside the proxy's reach, so both are written back explicitly.
    if (flashRef.current !== null) gsap.set(flashRef.current, { opacity: 0 });
    if (bloomRef.current !== null) bloomRef.current.intensity = 0;

    selectedIndexRef.current = -1;
    isTransitioningRef.current = false;
    hasNavigated.current = false;
    velocity.current = 0;
    isDragging.current = false;
    isSnapping.current = false;

    setIsTransitioning(false);
  }, []);

  const dismissBlockedNotice = useCallback(() => {
    setBlockedCompany(null);
  }, []);

  /**
   * Phase 1 (confirm) + phase 2 (restore).
   *
   * The navigation has already been handed to the browser by the time this runs, so
   * the animation is an acknowledgement rather than a departure: the other cards only
   * dim, and everything returns to rest on its own. That self-restore is what keeps
   * the wheel usable when the user switches back to this tab.
   */
  const runConfirmation = useCallback(
    (index: number) => {
      if (isTransitioningRef.current) return;

      isTransitioningRef.current = true;
      selectedIndexRef.current = index;
      setIsTransitioning(true);
      markInteracted();

      killSnap();
      velocity.current = 0;
      isDragging.current = false;

      const proxy = selection.current;
      proxy.fade = 0;
      proxy.z = 0;
      proxy.scale = 1;
      proxy.emissive = 0;
      proxy.bloom = 0;

      rotationProxy.current.value = rotation.current;
      const rotationTarget = rotationForIndex(index, rotation.current, COMPANY_COUNT);

      const tl = gsap.timeline({ onComplete: resetSelection });
      timeline.current = tl;

      // 1. Centre the chosen card exactly, in case the snap had not fully resolved.
      tl.to(
        rotationProxy.current,
        {
          value: rotationTarget,
          duration: SELECT_ROTATION_SNAP_DURATION,
          ease: 'power2.out',
          onUpdate: () => {
            rotation.current = rotationProxy.current.value;
          },
        },
        0,
      );

      // 2. Dim the other eighteen cards. Never to zero — the user is coming back.
      tl.to(
        proxy,
        { fade: SELECT_CONFIRM_FADE, duration: SELECT_CONFIRM_FADE_DURATION, ease: 'power2.out' },
        0,
      );

      // 3. Pulse the chosen card forward. A nod of acknowledgement, not a zoom.
      tl.to(
        proxy,
        {
          z: CONFIRM_Z_OFFSET,
          scale: CONFIRM_SCALE,
          duration: SELECT_CONFIRM_PULSE_DURATION,
          ease: 'power3.out',
        },
        0,
      );

      // 4. Logo flare (plus bloom on the high tier only).
      tl.to(
        proxy,
        {
          emissive: quality.emissivePeak,
          duration: SELECT_CONFIRM_FLARE_DURATION,
          ease: 'power2.out',
        },
        SELECT_CONFIRM_FLARE_START,
      );

      if (quality.bloom) {
        tl.to(
          proxy,
          { bloom: BLOOM_PEAK, duration: SELECT_CONFIRM_FLARE_DURATION, ease: 'power2.out' },
          SELECT_CONFIRM_FLARE_START,
        );
      }

      // 5. White wink at the peak of the flare.
      const flash = flashRef.current;
      if (flash !== null) {
        tl.to(
          flash,
          {
            opacity: SELECT_CONFIRM_FLASH_PEAK,
            duration: SELECT_CONFIRM_FLASH_IN_DURATION,
            ease: 'power2.out',
          },
          SELECT_CONFIRM_FLASH_START,
        );
        tl.to(
          flash,
          { opacity: 0, duration: SELECT_CONFIRM_FLASH_OUT_DURATION, ease: 'power2.in' },
          SELECT_CONFIRM_FLASH_START + SELECT_CONFIRM_FLASH_IN_DURATION,
        );
      }

      // 6. Phase 2: everything back to rest, then unlock.
      tl.to(
        proxy,
        {
          fade: 0,
          z: 0,
          scale: 1,
          emissive: 0,
          bloom: 0,
          duration: SELECT_RESTORE_DURATION,
          ease: 'power2.out',
        },
        SELECT_CONFIRM_DURATION,
      );
    },
    [killSnap, markInteracted, quality.bloom, quality.emissivePeak, resetSelection],
  );

  /**
   * Tap on the 3D card. There is no anchor here, so the tab is opened in code.
   *
   * The `window.open` call MUST stay synchronous inside this handler: moving it into
   * the timeline's `onComplete` would put it hundreds of milliseconds past the gesture,
   * outside the transient user activation window, and the popup blocker would eat it.
   */
  const selectCompany = useCallback(
    (index: number) => {
      // Guard against a double fire: anchor click landing on the same frame as a tap.
      if (isTransitioningRef.current) return;
      const company = COMPANIES[index];
      if (company === undefined) return;
      if (hasNavigated.current) return;
      hasNavigated.current = true;

      const tab = window.open(company.url, '_blank');

      if (tab === null) {
        // Blocked. Keep the wheel alive and offer a real anchor instead — a direct
        // click on one is a fresh gesture and cannot be refused.
        hasNavigated.current = false;
        setBlockedCompany(company);
        return;
      }

      // Sever the back-reference so the destination cannot reach into this page via
      // `window.opener`. Passing 'noopener' to `window.open` would have returned null
      // and made a blocked popup indistinguishable from a successful one.
      tab.opener = null;

      setBlockedCompany(null);
      runConfirmation(index);
    },
    [runConfirmation],
  );

  /** Anchor click path: the browser performs the navigation, this only animates. */
  const confirmSelection = useCallback(
    (index: number) => {
      if (COMPANIES[index] === undefined) return;
      setBlockedCompany(null);
      runConfirmation(index);
    },
    [runConfirmation],
  );

  // Strict Mode double-invokes effects; every tween is created from an event handler,
  // so the only thing to do here is guarantee nothing survives an unmount.
  useEffect(() => {
    return () => {
      if (snapTween.current !== null) {
        snapTween.current.kill();
        snapTween.current = null;
      }
      if (timeline.current !== null) {
        timeline.current.kill();
        timeline.current = null;
      }
    };
  }, []);

  /**
   * Recovery: a locked wheel must never outlive the user leaving the page.
   *
   * `pageshow` with `persisted` is the important one. Following a link restores this
   * page from the back/forward cache with its JS heap frozen exactly as it was left —
   * mid-transition, input locked, cards dimmed — and no React state update or effect
   * would otherwise fire to clear it. Visibility and focus cover tab switching, and
   * are guarded so an ordinary refocus never disturbs a running confirmation.
   */
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) resetSelection();
    };
    const handleReturn = () => {
      if (isTransitioningRef.current) resetSelection();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') handleReturn();
    };

    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', handleReturn);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', handleReturn);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [resetSelection]);

  const value = useMemo<WheelContextValue>(
    () => ({
      rotation,
      velocity,
      isDragging,
      isSnapping,
      isTransitioningRef,
      activeIndexRef,
      selectedIndexRef,
      selection,
      bloomRef,
      flashRef,
      tapHandlerRef,
      heroScaleRef,
      activeIndex,
      isTransitioning,
      hasInteracted,
      blockedCompany,
      reportActiveIndex,
      markInteracted,
      killSnap,
      snapToRotation,
      snapToIndex,
      nudge,
      selectCompany,
      confirmSelection,
      resetSelection,
      dismissBlockedNotice,
    }),
    [
      activeIndex,
      isTransitioning,
      hasInteracted,
      blockedCompany,
      reportActiveIndex,
      markInteracted,
      killSnap,
      snapToRotation,
      snapToIndex,
      nudge,
      selectCompany,
      confirmSelection,
      resetSelection,
      dismissBlockedNotice,
    ],
  );

  return <WheelContext.Provider value={value}>{children}</WheelContext.Provider>;
}

export function useWheel(): WheelContextValue {
  const value = useContext(WheelContext);
  if (value === null) {
    throw new Error('useWheel must be used inside a <WheelProvider>.');
  }
  return value;
}
