import { NextResponse } from 'next/server';

import { CONTACT_TEXT_FIELDS, type ContactTextField } from '@/features/contacts/domain/contact';
import { withCors } from '@/lib/cors';

export { OPTIONS } from '@/lib/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** A spoken self-introduction rarely runs past a minute; well over ten times that margin. */
const MAX_AUDIO_BYTES = 15_000_000;
const REQUEST_TIMEOUT_MS = 30_000;

/** What n8n's "Parse & Match" Code node is expected to hand back. */
type WorkflowResponse = {
  readonly transcript?: unknown;
  readonly fields?: unknown;
  readonly missing?: unknown;
};

export type VoiceContactResult = {
  readonly transcript: string;
  readonly fields: Readonly<Record<ContactTextField, string>>;
  readonly missing: readonly string[];
};

/**
 * HTTP adapter for the voice-to-contact pipeline.
 *
 * The browser posts the raw recording here rather than straight to n8n, for the same
 * reason contacts go through `/api/contacts` instead of hitting the Google Sheets webhook
 * directly: the n8n URL — and, more importantly, whatever OpenAI usage it triggers — stays
 * server-side, behind one place that can cap request size and time out cleanly.
 */
export async function POST(request: Request) {
  return withCors(await handlePost(request), request);
}

async function handlePost(request: Request) {
  const webhookUrl = process.env.N8N_VOICE_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    console.error('[voice-contact] N8N_VOICE_WEBHOOK_URL is not configured.');
    return NextResponse.json(
      { ok: false, message: 'El registro por voz aún no está conectado.' },
      { status: 503 },
    );
  }

  const contentType = request.headers.get('content-type') ?? 'audio/webm';
  const audio = await request.arrayBuffer();

  if (audio.byteLength === 0) {
    return NextResponse.json({ ok: false, message: 'No se recibió audio.' }, { status: 400 });
  }
  if (audio.byteLength > MAX_AUDIO_BYTES) {
    return NextResponse.json({ ok: false, message: 'La grabación es demasiado larga.' }, { status: 413 });
  }

  const form = new FormData();
  form.set('audio', new Blob([audio], { type: contentType }), 'recording.webm');

  let workflow: WorkflowResponse;
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`n8n respondió ${response.status}`);
    }

    workflow = (await response.json()) as WorkflowResponse;
  } catch (error) {
    console.error('[voice-contact] Workflow call failed:', error);
    return NextResponse.json(
      { ok: false, message: 'No se pudo procesar el audio. Inténtalo de nuevo.' },
      { status: 502 },
    );
  }

  const result = normaliseWorkflowResponse(workflow);
  if (result === null) {
    console.error('[voice-contact] Unexpected workflow response shape:', workflow);
    return NextResponse.json(
      { ok: false, message: 'El registro por voz devolvió una respuesta inesperada.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, ...result });
}

/**
 * Defensive parsing: the workflow lives outside this codebase, so nothing about its
 * shape is trusted blindly — every field is coerced to the type the rest of the app
 * expects, same posture as validating a contact submitted from the browser.
 */
function normaliseWorkflowResponse(workflow: WorkflowResponse): VoiceContactResult | null {
  if (typeof workflow.transcript !== 'string') return null;
  if (workflow.fields === null || typeof workflow.fields !== 'object') return null;

  const rawFields = workflow.fields as Record<string, unknown>;
  const fields = Object.fromEntries(
    CONTACT_TEXT_FIELDS.map((field) => [field, typeof rawFields[field] === 'string' ? rawFields[field] : '']),
  ) as Record<ContactTextField, string>;

  const missing = Array.isArray(workflow.missing)
    ? workflow.missing.filter((entry): entry is string => typeof entry === 'string')
    : [];

  return { transcript: workflow.transcript, fields, missing };
}
