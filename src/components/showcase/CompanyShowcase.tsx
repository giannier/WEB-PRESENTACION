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
          Protective vignette: dark near the top (behind the brand line) and near the
          bottom (behind the headline and contacts), clear through the middle so the
          photo still reads. White text sits directly on unknown artwork — without this,
          a bright cover makes it unreadable; the previous all-over wash protected it too
          bluntly and muddied every photo, even the dark ones that never needed it.
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
        <header>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.42em] text-white sm:text-[0.68rem]">
            Grupo Corporativo
          </p>
          <p className="mt-1 text-[0.68rem] font-light tracking-wide text-white/70">
            Diecinueve empresas, un solo ecosistema
          </p>
          <span className="mt-3 block h-[3px] w-14 rounded-full" style={{ backgroundColor: color }} />
        </header>

        <div ref={contentRef} className="max-w-xl">
          <h2 className="text-balance text-2xl font-bold leading-[1.15] text-white sm:text-3xl lg:text-[2.6rem]">
            {profile.lead !== '' && (
              <span className="block font-light">{profile.lead}</span>
            )}
            {profile.highlight !== '' && (
              <span className="block" style={{ color }}>
                {profile.highlight}
              </span>
            )}
            {profile.tail !== '' && <span className="block">{profile.tail}</span>}
          </h2>

          {profile.subtitle !== '' && (
            <p className="mt-3 max-w-md text-sm text-white/80 sm:text-base">{profile.subtitle}</p>
          )}

          <div className="mt-5 h-px w-full max-w-md bg-white/20" />

          <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-[0.72rem] text-white/85 sm:text-xs">
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
