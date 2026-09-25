import { getGatewaySecret } from '@/lib/config';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const secret = getGatewaySecret();
  const authRequired = Boolean(secret && secret.trim().length > 0);

  // Check auth cookie
  const authCookie = req.cookies.get('9router_auth')?.value;
  const isAuthenticated = !authRequired || (authCookie && authCookie === secret);

  return new Response(
    JSON.stringify({
      authRequired,
      isAuthenticated,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const secret = getGatewaySecret();

    if (!secret || secret.trim().length === 0) {
      // No password required
      return new Response(JSON.stringify({ success: true, message: 'Open access' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (password && password.trim() === secret.trim()) {
      const response = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      // Set cookie for 7 days
      response.headers.set(
        'Set-Cookie',
        `9router_auth=${encodeURIComponent(
          secret
        )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`
      );

      return response;
    }

    return new Response(JSON.stringify({ success: false, error: 'Incorrect Admin Password' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE() {
  const response = new Response(JSON.stringify({ success: true, message: 'Logged out' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  response.headers.set(
    'Set-Cookie',
    '9router_auth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  );

  return response;
}
