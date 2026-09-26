import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

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

export async function GET(req: Request) {
  const denied = requireAuth(req, CORS_HEADERS);
  if (denied) return denied;

  try {
    const status = await db.getDatabaseStatus();
    return NextResponse.json(status, { headers: CORS_HEADERS });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to retrieve database status', details: error?.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function POST(req: Request) {
  const denied = requireAuth(req, CORS_HEADERS);
  if (denied) return denied;

  try {
    const body = await req.json();
    const { action } = body;

    // 1. Test MongoDB connection
    if (action === 'test_mongo') {
      const result = await db.testMongoConnection(body.uri, body.dbName);
      return NextResponse.json(result, { headers: CORS_HEADERS });
    }

    // 2. Test Supabase connection
    if (action === 'test_supabase') {
      const result = await db.testSupabaseConnection(body.url, body.key, body.table);
      return NextResponse.json(result, { headers: CORS_HEADERS });
    }

    // 3. Save DB Configuration
    if (action === 'save_config') {
      db.saveDatabaseConfig({
        preferredEngine: body.preferredEngine,
        mongodbUri: body.mongodbUri,
        mongodbDb: body.mongodbDb,
        supabaseUrl: body.supabaseUrl,
        supabaseKey: body.supabaseKey,
        supabaseTable: body.supabaseTable,
      });

      const syncResult = await db.syncFromCloud();
      const updatedStatus = await db.getDatabaseStatus();

      return NextResponse.json(
        {
          success: true,
          message: 'Konfigurasi database berhasil disimpan dan disinkronkan!',
          syncResult,
          status: updatedStatus,
        },
        { headers: CORS_HEADERS }
      );
    }

    // 4. Force sync from cloud DB
    if (action === 'sync') {
      const result = await db.syncFromCloud();
      return NextResponse.json(
        { success: true, message: `Sinkronisasi berhasil dari sumber: ${result.source}`, result },
        { headers: CORS_HEADERS }
      );
    }

    // 5. Export full database dump
    if (action === 'export') {
      const data = db.exportAllData();
      return NextResponse.json(data, { headers: CORS_HEADERS });
    }

    return NextResponse.json(
      { error: 'Action tidak dikenal' },
      { status: 400, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Gagal memproses request database', details: error?.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
