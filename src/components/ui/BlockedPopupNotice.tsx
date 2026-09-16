'use client';

import { useEffect, useRef } from 'react';

import { useWheel } from '@/context/WheelContext';

/**
 * Shown only when the browser refused the programmatic `window.open` from a 3D card
 * tap — aggressive popup blockers and some in-app browsers do this unconditionally.
 *
 * The recovery is a real anchor: clicking it is a fresh user gesture, so the
 * navigation cannot be refused a second time. The wheel stays fully interactive
 * behind the notice; this never becomes a dead end.
 */
export function BlockedPopupNotice() {
  const { blockedCompany, dismissBlockedNotice } = useWheel();
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (blockedCompany === null) return;

    linkRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismissBlockedNotice();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [blockedCompany, dismissBlockedNotice]);

  if (blockedCompany === null) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="false"
      aria-labelledby="blocked-popup-title"
      className={[
        'fixed inset-x-4 top-6 z-40 mx-auto max-w-md',
        'rounded-2xl border border-white/20 bg-black/80 p-5',
        'text-center shadow-2xl backdrop-blur-xl',
      ].join(' ')}
    >
      <p id="blocked-popup-title" className="text-sm font-medium text-white">
        El navegador bloqueó la ventana emergente
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-white/50">
        Abrí el sitio manualmente desde el enlace de abajo. La rueda sigue disponible.
      </p>

      <div className="mt-4 flex flex-col items-center gap-2.5">
        <a
          ref={linkRef}
          href={blockedCompany.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={dismissBlockedNotice}
          className={[
            'inline-flex items-center justify-center rounded-full',
            'border border-white/30 bg-white/15 px-5 py-2.5',
            'text-sm font-medium text-white no-underline',
            'transition-colors duration-200 hover:border-white/50 hover:bg-white/25',
            'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white',
          ].join(' ')}
        >
          Abrir {blockedCompany.name} en una pestaña nueva
        </a>

        <button
          type="button"
          onClick={dismissBlockedNotice}
          className="text-[0.7rem] uppercase tracking-[0.2em] text-white/40 transition-colors hover:text-white/70"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

export default BlockedPopupNotice;
