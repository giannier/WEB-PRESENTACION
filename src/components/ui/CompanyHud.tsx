'use client';

import gsap from 'gsap';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ContactFormDialog } from '@/components/ui/ContactFormDialog';
import { hudButtonClassName } from '@/components/ui/hudButton';
import { FormIcon, QrIcon } from '@/components/ui/icons';
import { QrDialog } from '@/components/ui/QrDialog';
import { WebsiteButton } from '@/components/ui/WebsiteButton';
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

type OpenDialog = 'qr' | 'form' | null;

/**
 * Fixed HTML chrome around the canvas: brand, active company, and the three actions.
 *
 *   left   "Ingresar a la web"  -> company website in a new tab
 *   centre "QR de información"  -> QR code to the company's social links page
 *   right  "Formulario"         -> networking contact form
 *
 * Re-renders only when `activeIndex`, `hasInteracted` or `isTransitioning` change —
 * never per frame. The wrapper is `pointer-events-none` so drags pass straight through
 * to the capture layer underneath; only the buttons opt back in.
 */
export function CompanyHud() {
  const { activeIndex, hasInteracted, isTransitioning } = useWheel();
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLParagraphElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);

  const company = COMPANIES[activeIndex];
  const closeDialog = useCallback(() => setOpenDialog(null), []);

  // Swap animation on the active company name.
  useEffect(() => {
    const element = nameRef.current;
    if (element === null) return;

    const tween = gsap.fromTo(
      element,
      { opacity: 0, y: HUD_SWAP_OFFSET_Y },
      { opacity: 1, y: 0, duration: HUD_SWAP_DURATION, ease: 'power2.out', overwrite: true },
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

  // Step the chrome back while the pulse plays, then bring it straight back. Both
  // directions run from one effect so the HUD can never be stranded half-faded.
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
      <div
        ref={rootRef}
        className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between"
      >
        <header className="px-5 pt-6 sm:px-10 sm:pt-8">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.42em] text-neutral-900">
            Grupo Corporativo
          </p>
          <p className="mt-1.5 text-[0.7rem] tracking-wide text-neutral-500">
            Diecinueve empresas, un solo ecosistema
          </p>
        </header>

        <footer className="px-4 pb-5 sm:px-10 sm:pb-8">
          <div className="mb-4 flex flex-col items-center text-center sm:mb-6">
            <p
              ref={hintRef}
              aria-hidden="true"
              className="mb-3 text-[0.62rem] uppercase tracking-[0.3em] text-neutral-400"
            >
              Desliza para explorar
            </p>
            <p
              ref={nameRef}
              aria-live="polite"
              className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl"
            >
              {company.name}
            </p>
            <p className="mt-1.5 text-[0.65rem] uppercase tracking-[0.3em] text-neutral-400">
              {String(activeIndex + 1).padStart(2, '0')} / {COMPANY_COUNT}
            </p>
          </div>

          <nav aria-label={`Acciones de ${company.name}`} className="grid grid-cols-3 items-end gap-2">
            <div className="pointer-events-auto justify-self-start">
              <WebsiteButton company={company} index={activeIndex} />
            </div>

            <div className="pointer-events-auto justify-self-center">
              <button
                type="button"
                onClick={() => setOpenDialog('qr')}
                aria-haspopup="dialog"
                className={hudButtonClassName('secondary')}
              >
                <QrIcon className="h-5 w-5 shrink-0" />
                <span>QR de información</span>
              </button>
            </div>

            <div className="pointer-events-auto justify-self-end">
              <button
                type="button"
                onClick={() => setOpenDialog('form')}
                aria-haspopup="dialog"
                className={hudButtonClassName('secondary')}
              >
                <FormIcon className="h-5 w-5 shrink-0" />
                <span>Formulario</span>
              </button>
            </div>
          </nav>
        </footer>
      </div>

      <QrDialog company={company} open={openDialog === 'qr'} onClose={closeDialog} />
      <ContactFormDialog company={company} open={openDialog === 'form'} onClose={closeDialog} />
    </>
  );
}

export default CompanyHud;
