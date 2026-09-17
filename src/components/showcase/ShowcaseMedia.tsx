'use client';

import { useEffect, useState } from 'react';

import { getLogoPath, type Company } from '@/data/companies';
import { defaultMediaFor, profileFor } from '@/data/companyProfiles';

type ShowcaseMediaProps = {
  readonly company: Company;
  readonly color: string;
};

/**
 * Reference artwork for the focused company: image, video, or a branded fallback.
 *
 * The file is looked up by convention (`/media/<slug>.jpg`) unless the profile declares
 * something else, and a missing file simply falls back to a gradient built from the
 * company's own colour. Dropping artwork into `public/media` is therefore all it takes
 * to light a company up — no code change, and no broken image if it is not there yet.
 */
export function ShowcaseMedia({ company, color }: ShowcaseMediaProps) {
  const media = profileFor(company.slug).media ?? defaultMediaFor(company.slug);
  const [failed, setFailed] = useState(false);

  // Each company gets a fresh attempt; otherwise the first missing file would keep
  // every later company on the fallback.
  useEffect(() => {
    setFailed(false);
  }, [company.slug]);

  if (failed) {
    return (
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(120% 90% at 20% 15%, ${color}f2 0%, ${color}b8 45%, #050807 100%)`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getLogoPath(company.slug)}
          alt=""
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 w-[62%] max-w-md -translate-x-1/2 -translate-y-1/2 object-contain opacity-15 mix-blend-luminosity"
        />
      </div>
    );
  }

  if (media.type === 'video') {
    return (
      <video
        key={media.src}
        src={media.src}
        poster={media.poster}
        autoPlay
        muted
        loop
        playsInline
        onError={() => setFailed(true)}
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={media.src}
      src={media.src}
      alt={`Imagen referencial de ${company.name}`}
      onError={() => setFailed(true)}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}
