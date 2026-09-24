'use client';

import { ExternalIcon } from '@/components/ui/icons';
import { Modal } from '@/components/ui/Modal';
import type { Company } from '@/data/companies';
import { portfolioFor } from '@/data/companyPortfolio';

type PortfolioDialogProps = {
  readonly company: Company;
  readonly open: boolean;
  readonly onClose: () => void;
};

/**
 * "Portafolio": flyers, catalogues or product sheets a company dropped into its own
 * `public/portafolio/<slug>/` folder (see `scripts/scan-portfolio.mjs`). Each item opens
 * full-size in a new tab — an image as itself, a PDF the way every browser already
 * renders one natively, so no in-page viewer is needed.
 */
export function PortfolioDialog({ company, open, onClose }: PortfolioDialogProps) {
  const items = portfolioFor(company.slug);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Portafolio de ${company.name}`}
      description="Flyers, catálogos y fichas de producto."
    >
      {items.length === 0 ? (
        <p className="text-center text-sm text-neutral-500">
          Esta empresa aún no tiene portafolio cargado.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <li key={item.src}>
              <a
                href={item.src}
                target="_blank"
                rel="noopener noreferrer"
                className="group block overflow-hidden rounded-2xl border border-neutral-200 transition-colors hover:border-neutral-300"
              >
                {item.type === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.src}
                    alt={`${item.name} — ${company.name}`}
                    className="aspect-[3/4] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 bg-neutral-50 p-3 text-center">
                    <ExternalIcon className="h-6 w-6 text-neutral-400 transition-colors group-hover:text-neutral-600" />
                    <span className="text-xs font-medium text-neutral-600">{item.name}</span>
                  </div>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
