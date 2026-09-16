'use client';

import type { MouseEvent } from 'react';

import { useWheel } from '@/context/WheelContext';
import { COMPANIES } from '@/data/companies';

/**
 * Primary call to action.
 *
 * A real anchor rather than a button, for two reasons that matter here:
 * a native `target="_blank"` navigation is never refused by the popup blocker, and it
 * hands the user Ctrl/Cmd-click and middle-click to open a background tab for free.
 * The click handler therefore only plays the confirmation — the browser owns the
 * navigation, and calling `window.open` here as well would open a second tab.
 */
export function EnterButton() {
  const { activeIndex, isTransitioning, confirmSelection } = useWheel();
  const company = COMPANIES[activeIndex];

  if (company === undefined) return null;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Modifier and middle clicks have their own browser semantics (background tab,
    // new window, download). Animating over them would misrepresent what happened.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (event.button !== 0) return;
    confirmSelection(activeIndex);
  };

  return (
    <a
      href={company.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      aria-disabled={isTransitioning}
      aria-label={`Entrar a ${company.name}, se abre en una pestaña nueva`}
      className={[
        'group relative inline-flex items-center justify-center gap-2.5',
        'rounded-full border border-white/20 bg-white/10 px-7 py-3',
        'text-sm font-medium tracking-wide text-white no-underline',
        'backdrop-blur-md transition-all duration-300 ease-out',
        'hover:border-white/40 hover:bg-white/20',
        'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white',
        'active:scale-[0.97]',
        isTransitioning ? 'pointer-events-none opacity-40' : '',
      ].join(' ')}
    >
      <span>Entrar a la empresa</span>
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="h-3.5 w-3.5 transition-transform duration-300 ease-out group-hover:translate-x-1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 8h11M9 4l4 4-4 4" />
      </svg>
    </a>
  );
}

export default EnterButton;
