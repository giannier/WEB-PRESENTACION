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
import { companyColor } from '@/data/companyColors';
import {
  HINT_FADE_DURATION,
  HUD_DIM_DURATION,
  HUD_DIM_OPACITY,
  HUD_RESTORE_DURATION,
} from '@/lib/constants';

type OpenDialog = 'qr' | 'form' | null;

/**
 * Chrome over the wheel panel: the active company, the position counter and the three
 * actions.
 *
 *   "Ingresar a la web"  -> company website in a new tab
 *   "QR de información"  -> QR code to the company's social links page
 *   "Formulario"         -> networking contact form
 *
 * Re-renders only when `activeIndex`, `hasInteracted` or `isTransitioning` change —
 * never per frame. The wrapper is `pointer-events-none` so drags pass straight through
 * to the capture layer underneath; only the buttons opt back in.
 */
export function CompanyHud() {
  const { activeIndex, hasInteracted, isTransitioning } = useWheel();
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);

  const company = COMPANIES[activeIndex];
  const closeDialog = useCallback(() => setOpenDialog(null), []);

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

  const color = companyColor(company.slug);

  return (
    <>
      <div ref={rootRef} className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-end">

        {/* On a very short screen (a phone on its side) the chrome tightens up so it
            never grows into the space the logo needs. */}
        <footer className="px-4 pb-6 sm:px-8 sm:pb-8 [@media(max-height:450px)]:pb-3">
          <div className="mb-5 flex flex-col items-center text-center [@media(max-height:450px)]:mb-2">
            <p
              ref={hintRef}
              aria-hidden="true"
              className="mb-3 text-[0.6rem] uppercase tracking-[0.3em] text-neutral-400 [@media(max-height:450px)]:hidden"
            >
              Desliza para explorar
            </p>

            {/*
              The 3D logo directly above already says the company's name — repeating it
              here as text was pure redundancy. Kept for screen readers only: the visual
              identity a sighted visitor gets from the mark and the showcase panel has no
              equivalent for someone who cannot see it.
            */}
            <p aria-live="polite" className="sr-only">
              {company.name}
            </p>

            <div className="flex items-center gap-3">
              <span className="h-[2px] w-10 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[0.65rem] tracking-[0.3em] text-neutral-400">
                {String(activeIndex + 1).padStart(2, '0')} / {COMPANY_COUNT}
              </span>
              <span className="h-[2px] w-10 rounded-full" style={{ backgroundColor: color }} />
            </div>
          </div>

          <nav
            aria-label={`Acciones de ${company.name}`}
            className="flex flex-wrap items-center justify-center gap-2 sm:gap-3"
          >
            <div className="pointer-events-auto">
              <WebsiteButton company={company} index={activeIndex} />
            </div>

            <div className="pointer-events-auto">
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

            <div className="pointer-events-auto">
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
