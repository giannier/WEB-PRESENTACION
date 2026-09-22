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
  // Inverted from the earlier WCAG-picked ink/white choice: the client wants every
  // painted stroke to carry white text regardless of how light the brand colour is.
  const textColor = '#ffffff';
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
            One stroke under the whole headline block — lead, accent word and tail
            together with the subtitle — so every line of text above the divider sits on
            painted colour, the accent word included. It used to be left bare because it
            was already rendered in the brand colour; now that every line reads in white,
            leaving it uncovered would mean it was the only line without a background.
          */}
          {(profile.lead !== '' || profile.highlight !== '' || profile.tail !== '' || profile.subtitle !== '') && (
            <div className="relative px-4 py-2.5 sm:px-5 sm:py-3">
              <BrushStroke color={color} />
              {profile.lead !== '' && (
                <p
                  className="relative text-balance text-2xl font-light leading-[1.3] sm:text-3xl lg:text-[2.6rem]"
                  style={{ color: textColor }}
                >
                  {profile.lead}
                </p>
              )}
              {profile.highlight !== '' && (
                <p
                  className={`relative text-2xl font-bold leading-[1.3] sm:text-3xl lg:text-[2.6rem] ${profile.lead !== '' ? 'mt-1' : ''}`}
                  style={{ color: textColor }}
                >
                  {profile.highlight}
                </p>
              )}
              {profile.tail !== '' && (
                <p
                  className={`relative text-balance text-2xl font-bold leading-[1.3] sm:text-3xl lg:text-[2.6rem] ${profile.highlight !== '' || profile.lead !== '' ? 'mt-1' : ''}`}
                  style={{ color: textColor }}
                >
                  {profile.tail}
                </p>
              )}
              {profile.subtitle !== '' && (
                // Clamped as a safety net, not a routine limit — every subtitle on file
                // already fits on one or two lines; this only guards a future long one.
                <p
                  className={`relative line-clamp-2 text-sm sm:text-base ${profile.tail !== '' || profile.highlight !== '' || profile.lead !== '' ? 'mt-2 sm:mt-3' : ''}`}
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
 * A real photographed watercolour texture (`public/texturas/pincelada.png`, a white
 * shape on a transparent ground) recoloured through `mask-image`: the shape's alpha
 * channel decides what is visible, and `background-color` decides the colour, so one
 * shared asset renders in any of the nineteen brand colours without shipping nineteen
 * separate images. The source file is cropped tight to its own ink, but a hand-painted
 * stroke still fades out at its torn top and bottom edge rather than stopping cleanly —
 * fine for a short, two-line block, but on a five-line headline (corporacionyanayacu,
 * somostributa) that natural fade landed right on the first and last line of text.
 *
 * Four copies fix it: one anchored to the top of the box and one to the bottom, each a
 * bit more than half the height so they overlap through the middle, plus a smaller one
 * anchored to each of those same edges — reinforcing the exact strip along the very top
 * and very bottom, which is still that wider copy's own faded tip even once anchored
 * there. Whichever line of text sits near an edge is covered by a layer's solid core
 * rather than its fade; the overlaps read as extra brush passes, which is the "add one
 * more above and one more below" look real layered watercolour has anyway. Shared by
 * both the header chip and the headline block — and by every one of the nineteen
 * companies, since none of them render their own copy of this component.
 */
function BrushStroke({ color }: { readonly color: string }) {
  const layer = (verticalAnchor: 'top' | 'bottom', heightPercent: number): React.CSSProperties => ({
    backgroundColor: color,
    maskImage: 'url(/texturas/pincelada.png)',
    maskSize: `100% ${heightPercent}%`,
    maskRepeat: 'no-repeat',
    maskPosition: `center ${verticalAnchor}`,
    WebkitMaskImage: 'url(/texturas/pincelada.png)',
    WebkitMaskSize: `100% ${heightPercent}%`,
    WebkitMaskRepeat: 'no-repeat',
    WebkitMaskPosition: `center ${verticalAnchor}`,
  });

  return (
    <>
      <span aria-hidden="true" className="absolute inset-0 -z-10" style={layer('top', 62)} />
      <span aria-hidden="true" className="absolute inset-0 -z-10" style={layer('bottom', 62)} />
      <span aria-hidden="true" className="absolute inset-0 -z-10" style={layer('top', 35)} />
      <span aria-hidden="true" className="absolute inset-0 -z-10" style={layer('bottom', 35)} />
    </>
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
