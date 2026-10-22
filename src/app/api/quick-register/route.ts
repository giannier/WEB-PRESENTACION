import { NextResponse } from 'next/server';

import { withCors } from '@/lib/cors';

export { OPTIONS } from '@/lib/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The running transcript of one conversation; generous, but not unbounded. */
const MAX_BODY_BYTES = 20_000;
const REQUEST_TIMEOUT_MS = 15_000;

const FIELD_KEYS = ['fullName', 'phone', 'industry'] as const;

export type QuickRegisterFields = Readonly<Record<(typeof FIELD_KEYS)[number], string>>;
export type QuickRegisterResult = {
  readonly fields: QuickRegisterFields;
  readonly missing: readonly string[];
};

type WorkflowResponse = {
  readonly fields?: unknown;
  readonly missing?: unknown;
};

/**
 * HTTP adapter for the "registrar cliente" quick voice flow.
 *
 * Unlike `/api/voice-contact`, this never touches audio: the browser's own
 * SpeechRecognition already produced the transcript (see `useSpeechRecognizer`), so this
 * route only forwards accumulated TEXT to n8n for the extraction step (GPT only, no
 * Whisper) and normalises the response — same reasoning as every other server-side proxy
 * here: the workflow URL, and whatever OpenAI usage it triggers, stay off the client.
 */
export async function POST(request: Request) {
  return withCors(await handlePost(request), request);
}

async function handlePost(request: Request) {
  const webhookUrl = process.env.N8N_QUICK_REGISTER_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    console.error('[quick-register] N8N_QUICK_REGISTER_WEBHOOK_URL is not configured.');
    return NextResponse.json({ ok: false, message: 'El registro rápido aún no está conectado.' }, { status: 503 });
  }

  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, message: 'La transcripción es demasiado larga.' }, { status: 413 });
  }

  let transcript: string;
  try {
    const parsed: unknown = JSON.parse(body);
    const candidate = (parsed as { transcript?: unknown } | null)?.transcript;
    if (typeof candidate !== 'string' || candidate.trim() === '') throw new Error();
    transcript = candidate;
  } catch {
    return NextResponse.json({ ok: false, message: 'Solicitud no válida.' }, { status: 400 });
  }

  let workflow: WorkflowResponse;
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`n8n respondió ${response.status}`);
    workflow = (await response.json()) as WorkflowResponse;
  } catch (error) {
    console.error('[quick-register] Workflow call failed:', error);
    return NextResponse.json({ ok: false, message: 'No se pudo procesar el audio.' }, { status: 502 });
  }

  const result = normaliseWorkflowResponse(workflow);
  if (result === null) {
    console.error('[quick-register] Unexpected workflow response shape:', workflow);
    return NextResponse.json({ ok: false, message: 'Respuesta inesperada del registro rápido.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, ...result });
}

function normaliseWorkflowResponse(workflow: WorkflowResponse): QuickRegisterResult | null {
  if (workflow.fields === null || typeof workflow.fields !== 'object') return null;

  const rawFields = workflow.fields as Record<string, unknown>;
  const fields = Object.fromEntries(
    FIELD_KEYS.map((key) => [key, typeof rawFields[key] === 'string' ? rawFields[key] : '']),
  ) as QuickRegisterFields;

  const missing = Array.isArray(workflow.missing)
    ? workflow.missing.filter((entry): entry is string => typeof entry === 'string')
    : [];

  return { fields, missing };
}
