import { DEFAULT_PROVIDERS, getGatewaySecret, getProviderApiKey } from '@/lib/config';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const host = req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  const baseUrl = `${proto}://${host}`;

  const providersStatus = DEFAULT_PROVIDERS.map((p) => {
    const hasEnvKey = Boolean(getProviderApiKey(p.id));
    return {
      id: p.id,
      name: p.name,
      configuredInEnv: hasEnvKey,
      defaultBaseUrl: p.baseUrl,
      modelsCount: p.models.length,
    };
  });

  const hasGatewaySecret = Boolean(getGatewaySecret());

  return new Response(
    JSON.stringify({
      status: 'online',
      gatewayName: '9Router Cloud',
      version: '1.0.0',
      baseUrl,
      authRequired: hasGatewaySecret,
      providers: providersStatus,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
