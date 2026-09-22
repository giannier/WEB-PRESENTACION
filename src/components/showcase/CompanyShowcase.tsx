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
  // end, exactly the problem this whole background is meant to solve.
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
      </div>

      <div className="relative flex h-full flex-col justify-between p-6 sm:p-8 lg:p-10">
        {/*
          Trial run: a solid chip in the company's own brand colour behind every piece of
          text above the divider line, instead of relying on a gradient wash over an
          unknown photo. `self-start` keeps the chip hugging the text instead of
          stretching to the panel's full width.
        */}
        <header
          className="inline-block self-start rounded-lg px-3 py-2"
          style={{ backgroundColor: color }}
        >
          <p
            className="text-[0.62rem] font-semibold uppercase tracking-[0.42em] sm:text-[0.68rem]"
            style={{ color: textColor }}
          >
            Grupo Corporativo
          </p>
          {/* Boilerplate repeated identically on all nineteen cards — worth the room on
              a tall landscape column, not worth it on a cramped phone screen. */}
          <p
            className="mt-1 hidden text-[0.68rem] font-light tracking-wide sm:block"
            style={{ color: textColor, opacity: 0.75 }}
          >
            Diecinueve empresas, un solo ecosistema
          </p>
          <span
            className="mt-2 block h-[3px] w-14 rounded-full sm:mt-3"
            style={{ backgroundColor: textColor }}
          />
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
          <div
            className="inline-block rounded-lg px-3 py-2.5 sm:px-4 sm:py-3"
            style={{ backgroundColor: color }}
          >
            <h2
              className="text-balance text-2xl font-bold leading-[1.15] sm:text-3xl lg:text-[2.6rem]"
              style={{ color: textColor }}
            >
              {profile.lead !== '' && (
                <span className="block font-light">{profile.lead}</span>
              )}
              {/* Coloured-word emphasis does not survive sitting on its own colour, so
                  weight carries it instead: lead is light, highlight and tail are the
                  same bold the rest of the headline already is. */}
              {profile.highlight !== '' && <span className="block">{profile.highlight}</span>}
              {profile.tail !== '' && <span className="block">{profile.tail}</span>}
            </h2>

            {profile.subtitle !== '' && (
              // Clamped as a safety net, not a routine limit — every subtitle on file
              // already fits on one or two lines; this only guards a future long one.
              <p
                className="mt-2 line-clamp-2 text-sm sm:mt-3 sm:text-base"
                style={{ color: textColor, opacity: 0.85 }}
              >
                {profile.subtitle}
              </p>
            )}
          </div>

          <div className="mt-3 h-px w-full bg-white/20 sm:mt-5" />

          {/*
            Dark gradient strictly below the divider — transparent right at its own top
            edge so it never bleeds upward past the line, solid by the bottom where the
            contact text sits. Everything above the divider gets the brand-colour chips
            instead; this is the other half of that split, not a leftover of the old
            all-over wash.
          */}
          <div
            className="rounded-b-xl pb-1 pt-4"
            style={{
              backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.78) 65%)',
            }}
          >
            {/*
              One contact per row, always — not a wrapping chip row that happened to
              break nicely for a company with a long email and ran as one long line for
              a company with a short one. A fixed vertical list looks identically
              organised for every company regardless of how long its phone, email or
              domain are.
            */}
            <ul className="flex flex-col items-start gap-2 text-[0.72rem] text-white/90 sm:gap-2.5 sm:text-xs">
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
      </div>
    </section>
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
