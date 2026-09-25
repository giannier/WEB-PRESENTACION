import { NextResponse } from 'next/server';

import { CONTACT_TEXT_FIELDS, type Contact, type ContactTextField } from '@/features/contacts/domain/contact';
import { resolveContactRepository } from '@/features/contacts/infrastructure/resolveContactRepository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 4_000;
const MIN_PHONE_DIGITS = 6;
const MAX_PHONE_DIGITS = 15;

type QuickContactInput = {
  readonly fullName?: unknown;
  readonly phone?: unknown;
  readonly industry?: unknown;
  readonly interestCompany?: unknown;
};

/**
 * HTTP adapter for saving a "registrar cliente" quick voice contact.
 *
 * Deliberately NOT routed through `registerContact()` / `validateContact()`: that
 * validation requires a company name, which this three-field flow never asks for on
 * purpose (see CompanyHud's quick-register capture). Its own minimal check below, then
 * straight to the same `ContactRepository` — Google Sheets — every other contact goes
 * through, so a row from this flow looks the same as any other except for the blank
 * "Empresa" cell.
 */
export async function POST(request: Request) {
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, message: 'La solicitud es demasiado grande.' }, { status: 413 });
  }

  let input: QuickContactInput;
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    input = parsed as QuickContactInput;
  } catch {
    return NextResponse.json({ ok: false, message: 'Solicitud no válida.' }, { status: 400 });
  }

  const fullName = readText(input.fullName, 120);
  const phone = readText(input.phone, 30);
  const industry = readText(input.industry, 120);
  const interestCompany = readText(input.interestCompany, 160);

  const missing: string[] = [];
  if (fullName.length < 2) missing.push('fullName');
  const phoneDigits = phone.replace(/\D/g, '').length;
  if (phoneDigits < MIN_PHONE_DIGITS || phoneDigits > MAX_PHONE_DIGITS) missing.push('phone');
  if (industry.length < 2) missing.push('industry');

  if (missing.length > 0) {
    return NextResponse.json({ ok: false, missing, message: 'Faltan datos obligatorios.' }, { status: 422 });
  }

  const repository = resolveContactRepository();
  if (repository === null) {
    console.error('[quick-contact] Storage is not configured: set GOOGLE_SHEETS_WEBHOOK_URL and GOOGLE_SHEETS_WEBHOOK_SECRET.');
    return NextResponse.json(
      { ok: false, message: 'El registro aún no está conectado a Google Sheets.' },
      { status: 503 },
    );
  }

  const blankFields = Object.fromEntries(
    CONTACT_TEXT_FIELDS.map((field) => [field, '']),
  ) as Record<ContactTextField, string>;

  const contact: Contact = {
    ...blankFields,
    fullName,
    phone,
    industry,
    interestCompany,
    consentAt: new Date().toISOString(),
  };

  try {
    await repository.save(contact);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('[quick-contact] Failed to save contact:', error);
    return NextResponse.json(
      { ok: false, message: 'No se pudo guardar el contacto. Inténtalo de nuevo en un momento.' },
      { status: 502 },
    );
  }
}

function readText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}
