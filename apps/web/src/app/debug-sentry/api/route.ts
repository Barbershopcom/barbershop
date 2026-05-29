/**
 * Route handler que dispara erro server-side pra testar Sentry server config.
 * Ativar via NEXT_PUBLIC_DEBUG_SENTRY=true.
 */
export async function GET() {
  if (process.env.NEXT_PUBLIC_DEBUG_SENTRY !== 'true') {
    return new Response('Debug disabled.', { status: 403 });
  }
  throw new Error('Sentry server test error — se aparecer no dashboard, init OK.');
}
