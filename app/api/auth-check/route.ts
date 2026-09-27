import { getGatewaySecret } from '@/lib/config';
import { db } from '@/lib/db';
import { extractClientToken } from '@/lib/auth';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Self-check untuk kredensial gateway — menjawab pertanyaan paling sering saat
 * klien luar (Hermes, bot WA, Cursor, dst) kena 401:
 *   "key yang kupakai ini diterima server atau tidak? dan server menunggu key apa?"
 *
 * Tidak pernah mengembalikan rahasia apa pun (tidak ada master key / token yang
 * dipantulkan) — hanya status cocok/tidak, jenisnya, dan dari mana master key
 * efektif berasal (env vs database), supaya user bisa membandingkan sendiri.
 */
export async function GET(req: NextRequest) {
  return handle(req, '');
}

export async function POST(req: NextRequest) {
  let bodyToken = '';
  try {
    const body = await req.json();
    bodyToken = typeof body?.token === 'string' ? body.token : '';
  } catch {
    bodyToken = '';
  }
  return handle(req, bodyToken);
}

async function handle(req: NextRequest, bodyToken: string) {
  await db.ensureCloudConfigLoaded();

  const headerToken = extractClientToken(req);
  const provided = (bodyToken || headerToken || '').replace(/^Bearer\s+/i, '').trim();

  const envKeyName = process.env.ROUTER_API_KEY
    ? 'ROUTER_API_KEY'
    : process.env.GATEWAY_SECRET
      ? 'GATEWAY_SECRET'
      : null;
  const envSecret = (getGatewaySecret() || '').trim();
  const storedSecret = (db.getMasterKey() || '').trim();
  const masterSource: 'env' | 'database' | 'none' = envKeyName
    ? 'env'
    : storedSecret
      ? 'database'
      : 'none';

  let tokensCount = 0;
  let tokenName: string | null = null;
  try {
    const tokens = db.getTokens();
    tokensCount = tokens.length;
    const match = provided ? tokens.find((t) => t.token === provided) : undefined;
    tokenName = match ? match.name : null;
  } catch {
    tokensCount = 0;
  }

  const valid = provided.length > 0 && db.verifyToken(provided);
  const kind: 'master-env' | 'master-database' | 'client-token' | 'invalid' | 'none' = !provided
    ? 'none'
    : !valid
      ? 'invalid'
      : tokenName
        ? 'client-token'
        : envSecret && provided === envSecret
          ? 'master-env'
          : 'master-database';

  const hints: string[] = [];
  if (!provided) {
    hints.push('Tidak ada key yang dikirim. Klien harus mengirim header Authorization: Bearer <key> (atau x-api-key).');
  } else if (!valid) {
    hints.push('Key ini TIDAK dikenal server — cek salah tempel/spasi, atau key dibuat sebelum deploy terakhir.');
    if (masterSource === 'env') {
      hints.push(`${envKeyName} di environment deploy DIPAKAI dan menang atas key yang disimpan di dashboard. Kalau kamu menyalin key dari dashboard, nilainya bisa berbeda — pakai nilai ${envKeyName} yang di-set di hosting, atau buat Client Bearer Token baru di dashboard.`);
    } else if (masterSource === 'database') {
      hints.push('Master key efektif berasal dari database. Pastikan koneksi database tab Database "Connected" — kalau tidak, token klien yang baru dibuat hanya hidup di instance itu dan instance lain akan menolaknya.');
    } else {
      hints.push('Belum ada master key di server ini (mode terbuka), jadi penolakan ini tidak wajar — laporkan.');
    }
    if (tokensCount === 0) {
      hints.push('Belum ada Client Bearer Token tersimpan di server ini. Buat satu di Dashboard → kartu "Client Bearer Tokens".');
    } else {
      hints.push(`Server punya ${tokensCount} Client Bearer Token tersimpan — token harus sama persis (huruf besar/kecil berpengaruh).`);
    }
    hints.push('Setelah redeploy, token lama tetap valid selama database/penyimpanan config-nya sama.');
  } else {
    hints.push(
      kind === 'client-token'
        ? `Diterima sebagai Client Bearer Token${tokenName ? ` "${tokenName}"` : ''}.`
        : kind === 'master-env'
          ? `Diterima sebagai master key dari environment (${envKeyName}).`
          : 'Diterima sebagai master key dari database dashboard.'
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      provided: provided.length > 0,
      valid,
      kind,
      secretConfigured: Boolean(envSecret || storedSecret),
      masterSource,
      envKeyName,
      tokensSaved: tokensCount,
      hint: hints,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
  );
}
