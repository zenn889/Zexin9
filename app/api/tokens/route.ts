import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const tokens = db.getTokens();
  return new Response(JSON.stringify({ success: true, tokens }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name || typeof name !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'Token name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const created = db.addToken(name.trim());
    return new Response(JSON.stringify({ success: true, token: created }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return new Response(JSON.stringify({ success: false, error: 'ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const deleted = db.deleteToken(id);
    return new Response(JSON.stringify({ success: deleted }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
