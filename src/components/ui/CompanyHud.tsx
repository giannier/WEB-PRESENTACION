'use client';

import gsap from 'gsap';
import { useEffect, useRef } from 'react';

import { BlockedPopupNotice } from '@/components/ui/BlockedPopupNotice';
import { EnterButton } from '@/components/ui/EnterButton';
import { useWheel } from '@/context/WheelContext';
import { COMPANIES, COMPANY_COUNT } from '@/data/companies';
import {
  HINT_FADE_DURATION,
  HUD_DIM_DURATION,
  HUD_DIM_OPACITY,
  HUD_RESTORE_DURATION,
  HUD_SWAP_DURATION,
  HUD_SWAP_OFFSET_Y,
} from '@/lib/constants';

/**
 * Fixed HTML chrome around the canvas.
 *
 * Re-renders only when `activeIndex`, `hasInteracted` or `isTransitioning` change —
 * never per frame. The wrapper is `pointer-events-none` so drags pass straight
 * through to the capture layer underneath; only the button opts back in.
 */
export function CompanyHud() {
  const { activeIndex, hasInteracted, isTransitioning } = useWheel();

  const rootRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLParagraphElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  const company = COMPANIES[activeIndex];

  // Swap animation on the active company name.
  useEffect(() => {
    const element = nameRef.current;
    if (element === null) return;

    const tween = gsap.fromTo(
      element,
      { opacity: 0, y: HUD_SWAP_OFFSET_Y },
      {
        opacity: 1,
        y: 0,
        duration: HUD_SWAP_DURATION,
        ease: 'power2.out',
        overwrite: true,
      },
    );

    // Strict Mode double-invokes this effect; killing the previous tween keeps a
    // single source of truth for the element's transform.
    return () => {
      tween.kill();
    };
  }, [activeIndex]);

  // The swipe hint retires permanently after the first interaction.
  useEffect(() => {
    const element = hintRef.current;
    if (element === null || !hasInteracted) return;

    const tween = gsap.to(element, {
      opacity: 0,
      duration: HINT_FADE_DURATION,
      ease: 'power2.out',
      overwrite: true,
    });

    return () => {
      tween.kill();
    };
  }, [hasInteracted]);

  // Step the chrome back while the confirmation plays, then bring it straight back.
  // Both directions are driven from the same effect on purpose: an earlier version
  // only ever faded out, which left the HUD invisible for good once the transition
  // ended.
  useEffect(() => {
    const element = rootRef.current;
    if (element === null) return;

    const tween = gsap.to(element, {
      opacity: isTransitioning ? HUD_DIM_OPACITY : 1,
      duration: isTransitioning ? HUD_DIM_DURATION : HUD_RESTORE_DURATION,
      ease: isTransitioning ? 'power2.in' : 'power2.out',
      overwrite: true,
    });

    return () => {
      tween.kill();
    };
  }, [isTransitioning]);

  if (company === undefined) return null;

  return (
    <>
      <BlockedPopupNotice />

      <div
        ref={rootRef}
        className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between"
      >
        {/* Brand */}
      <header className="px-6 pt-7 sm:px-10 sm:pt-9">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.42em] text-white/70">
          Grupo Corporativo
        </p>
        <p className="mt-1.5 text-[0.7rem] font-light tracking-wide text-white/35">
          Diecinueve empresas, un solo ecosistema
        </p>
      </header>

      {/* Active company + call to action */}
      <footer className="px-6 pb-9 sm:px-10 sm:pb-12">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-5 text-center">
          <div className="min-h-[3.25rem]">
            <p
              ref={nameRef}
              aria-live="polite"
              className="text-2xl font-light tracking-tight text-white sm:text-3xl"
            >
              {company.name}
            </p>
            <p className="mt-1.5 text-[0.65rem] uppercase tracking-[0.3em] text-white/35">
              {String(activeIndex + 1).padStart(2, '0')} / {COMPANY_COUNT}
            </p>
          </div>

          <div className="pointer-events-auto">
            <EnterButton />
          </div>

          <div
            ref={hintRef}
            aria-hidden="true"
            className="text-[0.65rem] uppercase tracking-[0.3em] text-white/30"
          >
            Desliza para explorar
          </div>
          </div>
        </footer>
      </div>
    </>
  );
}

export default CompanyHud;
