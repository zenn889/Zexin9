import { getGatewaySecret } from './config';
import { db } from './db';

/**
 * Extracts the client credential from a request:
 * Authorization: Bearer <token>, x-api-key: <token>, or the dashboard auth cookie.
 * The cookie path keeps the web dashboard working without extra headers.
 */
export function extractClientToken(req: Request): string {
  const authHeader = req.headers.get('authorization') || '';
  const xApiKey = req.headers.get('x-api-key') || '';
  let token = authHeader.replace(/^Bearer\s+/i, '').trim() || xApiKey.trim();

  if (!token) {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/(?:zexin9_auth|9router_auth|9router_session)=([^;]+)/);
    if (match) {
      token = decodeURIComponent(match[1]).trim();
    }
  }
  return token;
}

/**
 * Auth guard for management/dashboard API routes.
 * Returns null when the request is allowed, or a ready-to-return 401 Response.
 *
 * Semantics match the /v1 endpoints: while no master key (ROUTER_API_KEY /
 * GATEWAY_SECRET / dashboard Access Key) is configured the gateway runs in
 * zero-config open access mode; once a key is configured, every management
 * route requires a valid master key or client token (header or dashboard cookie).
 */
export function requireAuth(req: Request, extraHeaders: Record<string, string> = {}): Response | null {
  const secret = (getGatewaySecret() || db.getMasterKey() || '').trim();
  if (!secret) return null; // zero-config open access mode

  const token = extractClientToken(req);
  if (token && db.verifyToken(token)) return null;

  return new Response(
    JSON.stringify({
      success: false,
      error:
        'Unauthorized: a valid Router Gateway API Key (Bearer token or dashboard login) is required.',
    }),
    { status: 401, headers: { 'Content-Type': 'application/json', ...extraHeaders } }
  );
}
