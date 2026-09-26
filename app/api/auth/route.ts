import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const secret = db.getMasterKey();
  const hasMasterKey = Boolean(secret && secret.length > 0);

  // If no master key configured: open access — automatically authenticated
  if (!hasMasterKey) {
    return new Response(
      JSON.stringify({
        authRequired: false,
        hasMasterKey: false,
        isAuthenticated: true,
        currentKey: undefined,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }

  // If master key is set, check auth cookie against master key
  const authCookie = req.cookies.get('zexin9_auth')?.value || req.cookies.get('9router_auth')?.value;
  const isAuthenticated = Boolean(authCookie && authCookie === secret);

  return new Response(
    JSON.stringify({
      authRequired: true,
      hasMasterKey,
      isAuthenticated,
      currentKey: isAuthenticated ? secret : undefined,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const { password, action, newKey } = await req.json();
    const currentSecret = db.getMasterKey();

    const jsonHeaders = { 'Content-Type': 'application/json', ...CORS_HEADERS };

    // 1. Initial Key Setup (if no key is set yet)
    if (action === 'setup' || !currentSecret) {
      const keyToSet = (newKey || password || '').trim();
      if (!keyToSet || keyToSet.length < 3) {
        return new Response(
          JSON.stringify({ success: false, error: 'Access Key minimal 3 karakter.' }),
          { status: 400, headers: jsonHeaders }
        );
      }

      db.setMasterKey(keyToSet);

      const response = new Response(
        JSON.stringify({ success: true, message: 'Access Key berhasil dibuat!' }),
        { status: 200, headers: jsonHeaders }
      );
      // Set cookie for 30 days
      response.headers.append(
        'Set-Cookie',
        `zexin9_auth=${encodeURIComponent(keyToSet)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 3600}`
      );
      response.headers.append(
        'Set-Cookie',
        `9router_auth=${encodeURIComponent(keyToSet)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 3600}`
      );
      return response;
    }

    // 2. Change Key (if logged in and wants to update key)
    if (action === 'change') {
      const authCookie = req.cookies.get('zexin9_auth')?.value || req.cookies.get('9router_auth')?.value;
      if (authCookie !== currentSecret) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized to change key' }),
          { status: 401, headers: jsonHeaders }
        );
      }
      if (!newKey || newKey.trim().length < 3) {
        return new Response(
          JSON.stringify({ success: false, error: 'Access Key baru minimal 3 karakter.' }),
          { status: 400, headers: jsonHeaders }
        );
      }
      db.setMasterKey(newKey.trim());
      const response = new Response(
        JSON.stringify({ success: true, message: 'Access Key berhasil diperbarui!' }),
        { status: 200, headers: jsonHeaders }
      );
      response.headers.append(
        'Set-Cookie',
        `zexin9_auth=${encodeURIComponent(newKey.trim())}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 3600}`
      );
      response.headers.append(
        'Set-Cookie',
        `9router_auth=${encodeURIComponent(newKey.trim())}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 3600}`
      );
      return response;
    }

    // 3. Regular Unlock / Login
    if (password && password.trim() === currentSecret) {
      const response = new Response(
        JSON.stringify({ success: true, message: 'Akses Diberikan!' }),
        { status: 200, headers: jsonHeaders }
      );
      response.headers.append(
        'Set-Cookie',
        `zexin9_auth=${encodeURIComponent(currentSecret)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 3600}`
      );
      response.headers.append(
        'Set-Cookie',
        `9router_auth=${encodeURIComponent(currentSecret)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 3600}`
      );
      return response;
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Kunci Akses (Access Key) salah!' }),
      { status: 401, headers: jsonHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Authentication error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}

export async function DELETE() {
  const response = new Response(
    JSON.stringify({ success: true, message: 'Logged out & Locked' }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
  );
  response.headers.append('Set-Cookie', 'zexin9_auth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  response.headers.append('Set-Cookie', '9router_auth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  return response;
}
