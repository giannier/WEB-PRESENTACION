/**
 * These contact/voice routes are also called cross-origin by the static-export fork
 * (portafolio.corporacionyanayacu.com), so they need explicit CORS. An allow-list rather
 * than `*`: they accept POST with no other auth.
 */
const ALLOWED_ORIGINS = new Set([
  'https://portafolio.corporacionyanayacu.com',
  'https://web-presentacion-seven.vercel.app',
  'http://localhost:3100',
]);

export function withCors(response: Response, request: Request): Response {
  const origin = request.headers.get('origin');
  if (origin !== null && ALLOWED_ORIGINS.has(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  }
  return response;
}

export function OPTIONS(request: Request): Response {
  return withCors(new Response(null, { status: 204 }), request);
}
