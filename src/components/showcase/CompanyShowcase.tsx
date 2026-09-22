'use client';

import gsap from 'gsap';
import { useEffect, useRef } from 'react';

import { ShowcaseMedia } from '@/components/showcase/ShowcaseMedia';
import { GlobeIcon, MailIcon, PhoneIcon } from '@/components/ui/icons';
import { useWheel } from '@/context/WheelContext';
import { COMPANIES } from '@/data/companies';
import { companyColor } from '@/data/companyColors';
import { profileFor } from '@/data/companyProfiles';
import { SHOWCASE_SWAP_DURATION, SHOWCASE_SWAP_OFFSET_X } from '@/lib/constants';
import { readableTextColor } from '@/lib/color';

/**
 * Left panel: reference artwork for the focused company, its headline and its contacts.
 *
 * The angled edge is two stacked clip paths — the outer one painted in the company's
 * brand colour, the inner one carrying the artwork and inset by a few pixels — so the
 * diagonal reads as a coloured band that changes with every company.
 *
 * It reads the active company from context itself rather than taking it as a prop, so a
 * company change re-renders this panel without touching the canvas subtree.
 */
export function CompanyShowcase() {
  const { activeIndex } = useWheel();
  const contentRef = useRef<HTMLDivElement>(null);
  const company = COMPANIES[activeIndex];

  useEffect(() => {
    const element = contentRef.current;
    if (element === null) return;

    const tween = gsap.fromTo(
      element,
      { opacity: 0, x: SHOWCASE_SWAP_OFFSET_X },
      { opacity: 1, x: 0, duration: SHOWCASE_SWAP_DURATION, ease: 'power2.out', overwrite: true },
    );

    return () => {
      tween.kill();
    };
  }, [activeIndex]);

  if (company === undefined) return null;

  const color = companyColor(company.slug);
  // The brand palette spans light and dark alike (Escuela Capacita's gold next to
  // Convive 360's near-black blue) — a fixed white would go unreadable on the light
  // end, exactly the problem this background is meant to solve.
  const textColor = readableTextColor(color);
  const profile = profileFor(company.slug);
  const websiteHost = new URL(company.url).host.replace(/^www\./, '');

  return (
    <section
      aria-label={`Presentación de ${company.name}`}
      className="showcase-panel relative shrink-0 overflow-hidden bg-neutral-950"
      style={{ backgroundColor: color }}
    >
      <div className="showcase-media absolute inset-0 overflow-hidden bg-neutral-950">
        <ShowcaseMedia company={company} color={color} />
        {/*
          Protective vignette: dark near the top and bottom, clear through the middle so
          the photo still reads. Kept as a base layer under the highlighter marks below —
          it is what still protects the coloured accent word, which deliberately gets no
          marker of its own.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 24%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.72) 100%)',
          }}
        />
      </div>

      <div className="relative flex h-full flex-col justify-between p-6 sm:p-8 lg:p-10">
        <header className="relative inline-block self-start px-4 py-2.5">
          <BrushStroke color={color} />
          <p
            className="relative text-[0.62rem] font-semibold uppercase tracking-[0.42em] sm:text-[0.68rem]"
            style={{ color: textColor }}
          >
            Grupo Corporativo
          </p>
          {/* Boilerplate repeated identically on all nineteen cards — worth the room on
              a tall landscape column, not worth it on a cramped phone screen. */}
          <p
            className="relative mt-1 hidden text-[0.68rem] font-light tracking-wide sm:block"
            style={{ color: textColor, opacity: 0.8 }}
          >
            Diecinueve empresas, un solo ecosistema
          </p>
        </header>

        {/*
          One consistent width for the headline, subtitle and contacts — previously the
          headline alone stretched to max-w-xl while everything below it was capped at
          max-w-md, so a long lead/highlight/tail ran as one wide line on a company whose
          copy happened to be long, while a shorter company's headline broke tidily. A
          narrower, shared cap makes every company's copy wrap into short lines instead
          of only some of them getting that by accident of their own word count.
        */}
        <div ref={contentRef} className="max-w-md">
          {/*
            Two brush strokes, not one per line: everything before the accent word, and
            everything after it together with the subtitle — matching the reference the
            client sent, where a title and its subtitle share a single painted stroke. The
            accent word itself sits between them, uncovered: it is already rendered in the
            brand colour, so a saturated hue sitting directly on the photo already reads on
            its own, and a stroke in that same colour behind it would erase it rather than
            set it apart. Splitting the stroke in two is what keeps the accent word in its
            original reading position instead of pushing it to the end.
          */}
          {profile.lead !== '' && (
            <div className="relative inline-block px-4 py-2.5 sm:px-5 sm:py-3">
              <BrushStroke color={color} />
              <p
                className="relative text-balance text-2xl font-light leading-[1.3] sm:text-3xl lg:text-[2.6rem]"
                style={{ color: textColor }}
              >
                {profile.lead}
              </p>
            </div>
          )}

          {profile.highlight !== '' && (
            <p
              className={`text-2xl font-bold leading-[1.3] sm:text-3xl lg:text-[2.6rem] ${profile.lead !== '' ? 'mt-1' : ''}`}
              style={{ color }}
            >
              {profile.highlight}
            </p>
          )}

          {(profile.tail !== '' || profile.subtitle !== '') && (
            <div
              className={`relative px-4 py-2.5 sm:px-5 sm:py-3 ${profile.highlight !== '' || profile.lead !== '' ? 'mt-1' : ''}`}
            >
              <BrushStroke color={color} />
              {profile.tail !== '' && (
                <p
                  className="relative text-balance text-2xl font-bold leading-[1.3] sm:text-3xl lg:text-[2.6rem]"
                  style={{ color: textColor }}
                >
                  {profile.tail}
                </p>
              )}
              {profile.subtitle !== '' && (
                // Clamped as a safety net, not a routine limit — every subtitle on file
                // already fits on one or two lines; this only guards a future long one.
                <p
                  className={`relative line-clamp-2 text-sm sm:text-base ${profile.tail !== '' ? 'mt-2 sm:mt-3' : ''}`}
                  style={{ color: textColor, opacity: 0.85 }}
                >
                  {profile.subtitle}
                </p>
              )}
            </div>
          )}

          <div className="mt-3 h-px w-full bg-white/20 sm:mt-5" />

          {/*
            One contact per row, always — not a wrapping chip row that happened to break
            nicely for a company with a long email and ran as one long line for a company
            with a short one. A fixed vertical list looks identically organised for every
            company regardless of how long its phone, email or domain are.
          */}
          <ul className="mt-3 flex flex-col items-start gap-2 text-[0.72rem] text-white/85 sm:mt-4 sm:gap-2.5 sm:text-xs">
            {profile.phone !== '' && (
              <ContactItem
                href={`tel:${profile.phone.replace(/\s/g, '')}`}
                color={color}
                icon={<PhoneIcon className="h-3 w-3" />}
                label={`Cel. ${profile.phone}`}
              />
            )}
            {profile.email !== '' && (
              <ContactItem
                href={`mailto:${profile.email}`}
                color={color}
                icon={<MailIcon className="h-3 w-3" />}
                label={profile.email}
              />
            )}
            <ContactItem
              href={company.url}
              color={color}
              external
              icon={<GlobeIcon className="h-3 w-3" />}
              label={websiteHost}
            />
          </ul>
        </div>
      </div>
    </section>
  );
}

/**
 * Painted brush-stroke background, filling whatever box its parent gives it.
 *
 * Hand-drawn once as an SVG path rather than a photo: it needs to recolour to any of the
 * nineteen brand colours and to stretch to fit text of very different lengths, neither of
 * which a raster texture can do without either shipping nineteen images or losing the
 * authentic torn-edge shape to a uniform tint. `preserveAspectRatio="none"` is what lets
 * the same path fill a short, wide box or a taller, narrower one without keeping its own
 * proportions — the two small satellite streaks are what read as "brush", not a flat blob.
 *
 * A real photographed watercolour texture would look more convincingly painted than a
 * vector path ever will; see the prompt provided alongside this change to try that
 * version instead.
 */
function BrushStroke({ color }: { readonly color: string }) {
  return (
    <svg
      viewBox="0 0 400 120"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="absolute inset-0 -z-10 h-full w-full"
    >
      <path
        d="M10,54 C16,28 42,10 88,16 C124,21 148,4 192,13 C232,21 268,2 312,15 C352,26 390,32 393,58
           C396,82 368,90 324,84 C286,79 252,96 208,89 C168,82 132,98 92,90 C56,83 22,76 12,58
           C9,57 8,55 10,54 Z"
        fill={color}
      />
      <ellipse cx="58" cy="9" rx="32" ry="7" fill={color} opacity="0.85" transform="rotate(-8 58 9)" />
      <ellipse cx="342" cy="107" rx="28" ry="6.5" fill={color} opacity="0.8" transform="rotate(6 342 107)" />
    </svg>
  );
}

function ContactItem({
  href,
  color,
  icon,
  label,
  external = false,
}: {
  readonly href: string;
  readonly color: string;
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly external?: boolean;
}) {
  return (
    <li>
      <a
        href={href}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className="inline-flex items-center gap-2 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      >
        <span
          aria-hidden="true"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: color }}
        >
          {icon}
        </span>
        {label}
      </a>
    </li>
  );
}
