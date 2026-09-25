import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const secret = db.getMasterKey();
  const hasMasterKey = Boolean(secret && secret.length > 0);

  // If no master key has been set, auth is required and user must setup initial key!
  // If master key is set, check auth cookie against master key
  const authCookie = req.cookies.get('9router_auth')?.value;
  const isAuthenticated = hasMasterKey && Boolean(authCookie && authCookie === secret);

  return new Response(
    JSON.stringify({
      authRequired: true,
      hasMasterKey,
      isAuthenticated,
      currentKey: isAuthenticated ? secret : undefined,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const { password, action, newKey } = await req.json();
    const currentSecret = db.getMasterKey();

    // 1. Initial Key Setup (if no key is set yet)
    if (action === 'setup' || !currentSecret) {
      const keyToSet = (newKey || password || '').trim();
      if (!keyToSet || keyToSet.length < 3) {
        return new Response(
          JSON.stringify({ success: false, error: 'Access Key minimal 3 karakter.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      db.setMasterKey(keyToSet);

      const response = new Response(
        JSON.stringify({ success: true, message: 'Access Key berhasil dibuat!' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

      // Set cookie for 30 days
      response.headers.set(
        'Set-Cookie',
        `9router_auth=${encodeURIComponent(
          keyToSet
        )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 3600}`
      );

      return response;
    }

    // 2. Change Key (if logged in and wants to update key)
    if (action === 'change') {
      const authCookie = req.cookies.get('9router_auth')?.value;
      if (authCookie !== currentSecret) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized to change key' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (!newKey || newKey.trim().length < 3) {
        return new Response(
          JSON.stringify({ success: false, error: 'Access Key baru minimal 3 karakter.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      db.setMasterKey(newKey.trim());
      const response = new Response(
        JSON.stringify({ success: true, message: 'Access Key berhasil diperbarui!' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
      response.headers.set(
        'Set-Cookie',
        `9router_auth=${encodeURIComponent(
          newKey.trim()
        )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 3600}`
      );
      return response;
    }

    // 3. Regular Unlock / Login
    if (password && password.trim() === currentSecret) {
      const response = new Response(
        JSON.stringify({ success: true, message: 'Akses Diberikan!' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

      response.headers.set(
        'Set-Cookie',
        `9router_auth=${encodeURIComponent(
          currentSecret
        )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 3600}`
      );

      return response;
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Kunci Akses (Access Key) salah!' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Authentication error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function DELETE() {
  const response = new Response(JSON.stringify({ success: true, message: 'Logged out & Locked' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  response.headers.set(
    'Set-Cookie',
    '9router_auth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  );

  return response;
}
