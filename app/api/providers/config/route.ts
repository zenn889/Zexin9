import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { DEFAULT_PROVIDERS, getProviderApiKey } from '@/lib/config';

export const runtime = 'nodejs';
export const maxDuration = 30;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const denied = requireAuth(req, CORS_HEADERS);
  if (denied) return denied;

  try {
    // Cold instances read the account list from the cloud database first.
    await db.ensureCloudConfigLoaded();

    const settings = db.getProviderSettings();

    // Map which providers are configured in server DB or process.env
    const statusMap: Record<string, boolean> = {};
    DEFAULT_PROVIDERS.forEach((p) => {
      const hasKey = Boolean(getProviderApiKey(p.id));
      statusMap[p.id] = hasKey;
    });

    return NextResponse.json(
      {
        keys: settings.keys,
        baseUrls: settings.baseUrls,
        cfAccountId: settings.cfAccountId,
        cfAccounts: settings.cfAccounts || [],
        providerAccounts: settings.providerAccounts || [],
        statusMap,
        persistence: db.getPersistenceSummary(),
      },
      { headers: CORS_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to retrieve provider configuration', details: error?.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function POST(req: Request) {
  const denied = requireAuth(req, CORS_HEADERS);
  if (denied) return denied;

  try {
    const body = await req.json();
    const {
      keys = {},
      baseUrls = {},
      cfAccountId = '',
      cfAccounts = [],
      providerAccounts = [],
    } = body;

    db.setProviderSettings(keys, baseUrls, cfAccountId, cfAccounts, providerAccounts);

    const updated = db.getProviderSettings();
    const activeCount = Object.keys(updated.keys).filter((k) => updated.keys[k]?.trim()).length;

    return NextResponse.json(
      {
        success: true,
        message: `Berhasil menyimpan konfigurasi dan ${updated.providerAccounts?.length || 0} akun multi-provider!`,
        activeCount,
        settings: updated,
        persistence: db.getPersistenceSummary(),
      },
      { headers: CORS_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Gagal menyimpan konfigurasi provider', details: error?.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
