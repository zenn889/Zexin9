import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '100', 10);

  const logs = db.getLogs(limit);
  const stats = db.getStats();

  return new Response(
    JSON.stringify({
      success: true,
      logs,
      stats,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

export async function DELETE() {
  db.clearLogs();
  return new Response(JSON.stringify({ success: true, message: 'Logs cleared' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
