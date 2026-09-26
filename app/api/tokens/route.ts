import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const denied = requireAuth(req, CORS_HEADERS);
  if (denied) return denied;

  const tokens = db.getTokens();
  return new Response(
    JSON.stringify({ success: true, tokens }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
  );
}

export async function POST(req: NextRequest) {
  const denied = requireAuth(req, CORS_HEADERS);
  if (denied) return denied;

  try {
    const { name } = await req.json();
    if (!name || typeof name !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Token name is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const created = db.addToken(name.trim());
    return new Response(
      JSON.stringify({ success: true, token: created }),
      { status: 201, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const denied = requireAuth(req, CORS_HEADERS);
  if (denied) return denied;

  try {
    const { id } = await req.json();
    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const deleted = db.deleteToken(id);
    return new Response(
      JSON.stringify({ success: deleted }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}
