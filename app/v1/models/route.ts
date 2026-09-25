import { DEFAULT_FALLBACK_GROUPS, DEFAULT_PROVIDERS } from '@/lib/config';

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
      owned_by: '9router-gateway',
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
