import { NextResponse } from 'next/server';

import { registerContact } from '@/features/contacts/application/registerContact';
import { CONTACT_HONEYPOT_FIELD, type ContactInput } from '@/features/contacts/domain/contact';
import { resolveContactRepository } from '@/features/contacts/infrastructure/resolveContactRepository';
import { withCors } from '@/lib/cors';

export { OPTIONS } from '@/lib/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A full contact is well under 4 KB; anything far larger is not a real submission. */
const MAX_BODY_BYTES = 16_000;

/**
 * HTTP adapter for registering a networking contact.
 *
 * Validation happens again here even though the form already validated: the browser
 * is not a trust boundary.
 */
export async function POST(request: Request) {
  return withCors(await handlePost(request), request);
}

async function handlePost(request: Request) {
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, message: 'La solicitud es demasiado grande.' }, { status: 413 });
  }

  let input: ContactInput & Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    input = parsed as ContactInput & Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: 'Solicitud no válida.' }, { status: 400 });
  }

  // Pretend success so the bot has no signal to adapt to, and store nothing.
  const honeypot = input[CONTACT_HONEYPOT_FIELD];
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const repository = resolveContactRepository();
  if (repository === null) {
    console.error('[contacts] Storage is not configured: set GOOGLE_SHEETS_WEBHOOK_URL and GOOGLE_SHEETS_WEBHOOK_SECRET.');
    return NextResponse.json(
      { ok: false, message: 'El formulario aún no está conectado a Google Sheets.' },
      { status: 503 },
    );
  }

  const result = await registerContact(input, repository);

  switch (result.status) {
    case 'saved':
      return NextResponse.json({ ok: true }, { status: 201 });
    case 'invalid':
      return NextResponse.json({ ok: false, errors: result.errors }, { status: 422 });
    case 'failed':
      console.error('[contacts] Failed to save contact:', result.reason);
      return NextResponse.json(
        { ok: false, message: 'No se pudo guardar el contacto. Inténtalo de nuevo en un momento.' },
        { status: 502 },
      );
  }
}
