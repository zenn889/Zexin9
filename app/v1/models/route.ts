import { DEFAULT_FALLBACK_GROUPS, DEFAULT_PROVIDERS } from '@/lib/config';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET() {
  const models: any[] = [];

  // Add virtual fallback groups first
  for (const group of DEFAULT_FALLBACK_GROUPS) {
    models.push({
      id: group.id,
      object: 'model',
      created: 1700000000,
      owned_by: 'zexin9-gateway',
      permission: [],
      root: group.id,
      parent: null,
      description: group.description,
      tag: group.tag,
      is_fallback_group: true,
      chain: group.providers.map((p) => `${p.provider}:${p.model}`),
    });
  }

  // Add individual provider models
  for (const provider of DEFAULT_PROVIDERS) {
    for (const model of provider.models) {
      models.push({
        id: model,
        object: 'model',
        created: 1700000000,
        owned_by: provider.id,
        permission: [],
        root: model,
        parent: null,
        provider: provider.name,
      });
    }
  }

  // Models discovered on the user's own accounts (custom endpoints, Cloudflare
  // Workers AI catalog, ...) so external clients (bot WA, Hermes, IDE plugins,
  // n8n, ...) can list and pick what actually works on this gateway.
  try {
    await db.ensureCloudConfigLoaded();
    const seen = new Set(models.map((m: any) => String(m.id)));

    const addModels = (providerId: string, list?: string[]) => {
      for (const raw of list || []) {
        const id = String(raw || '').trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        models.push({
          id,
          object: 'model',
          created: 1700000000,
          owned_by: providerId,
          permission: [],
          root: id,
          parent: null,
        });
      }
    };

    for (const acc of db.getProviderAccounts()) {
      if (acc.enabled === false) continue;
      addModels(acc.provider, [...(acc.verifiedModels || []), ...(acc.detectedModels || [])]);
    }
    const settings = db.getProviderSettings();
    for (const cf of settings.cfAccounts || []) {
      if (cf.enabled === false) continue;
      addModels('cloudflare', [...(cf.verifiedModels || []), ...(cf.detectedModels || [])]);
    }
  } catch {
    // Best effort: a listing failure must never break the endpoint.
  }

  return new Response(
    JSON.stringify({
      object: 'list',
      data: models,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    }
  );
}
