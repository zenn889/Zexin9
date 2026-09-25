import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DEFAULT_PROVIDERS, getProviderApiKey } from '@/lib/config';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const settings = db.getProviderSettings();

    // Map which providers are configured in server DB or process.env
    const statusMap: Record<string, boolean> = {};
    DEFAULT_PROVIDERS.forEach((p) => {
      const hasKey = Boolean(getProviderApiKey(p.id));
      statusMap[p.id] = hasKey;
    });

    return NextResponse.json({
      keys: settings.keys,
      baseUrls: settings.baseUrls,
      cfAccountId: settings.cfAccountId,
      statusMap,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to retrieve provider configuration', details: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { keys = {}, baseUrls = {}, cfAccountId = '' } = body;

    db.setProviderSettings(keys, baseUrls, cfAccountId);

    const updated = db.getProviderSettings();
    const activeCount = Object.keys(updated.keys).filter((k) => updated.keys[k]?.trim()).length;

    return NextResponse.json({
      success: true,
      message: `Berhasil menyimpan ${activeCount} provider keys ke database cloud!`,
      activeCount,
      settings: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Gagal menyimpan konfigurasi provider', details: error?.message },
      { status: 500 }
    );
  }
}
