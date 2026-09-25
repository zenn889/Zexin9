'use client';

import React, { useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  ExternalLink,
  Laptop,
  Terminal,
  Zap,
} from 'lucide-react';

interface IntegrationsTabProps {
  baseUrl: string;
  gatewaySecret: string;
}

export function IntegrationsTab({ baseUrl, gatewaySecret }: IntegrationsTabProps) {
  const [activeClient, setActiveClient] = useState('cursor');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const effectiveBaseUrl = baseUrl ? `${baseUrl}/v1` : 'https://your-9router.vercel.app/v1';
  const effectiveAuthKey = gatewaySecret || 'sk-9router';

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const clientConfigs = {
    cursor: {
      title: 'Cursor IDE',
      description: 'Connect Cursor to 9Router for seamless multi-provider fallback without quota limits.',
      steps: [
        'Open Cursor Settings → Models (or Features → Model)',
        'Turn on "Override OpenAI Base URL"',
        `Set Base URL to: ${effectiveBaseUrl}`,
        `Enter your API Key: ${effectiveAuthKey}`,
        'Add Model: "auto-smart" or "auto-code" or "claude-3-5-sonnet"',
      ],
      code: `# Cursor Settings Configuration
Base URL: ${effectiveBaseUrl}
API Key : ${effectiveAuthKey}
Model   : auto-smart`,
    },
    cline: {
      title: 'Cline (VS Code Extension)',
      description: 'Use 9Router as an OpenAI-compatible backend in Cline.',
      steps: [
        'Click the Gear icon in the Cline panel',
        'Set API Provider to: "OpenAI Compatible"',
        `Set Base URL to: ${effectiveBaseUrl}`,
        `Enter API Key: ${effectiveAuthKey}`,
        'Set Model ID to: "auto-smart" (or "auto-code")',
      ],
      code: `# Cline Configuration
API Provider : OpenAI Compatible
Base URL     : ${effectiveBaseUrl}
API Key      : ${effectiveAuthKey}
Model ID     : auto-smart`,
    },
    claudecode: {
      title: 'Claude Code CLI',
      description: 'Run Anthropic\'s Claude Code CLI with any AI model (Gemini, DeepSeek, OpenAI) via 9Router.',
      steps: [
        'Install Claude Code: npm install -g @anthropic-ai/claude-code',
        `Set ANTHROPIC_BASE_URL to your gateway base URL (without /v1)`,
        'Set ANTHROPIC_API_KEY to your gateway key',
        'Run claude in your terminal!',
      ],
      code: `# Run this in your terminal before launching Claude Code:
export ANTHROPIC_BASE_URL="${baseUrl || 'https://your-9router.vercel.app'}"
export ANTHROPIC_API_KEY="${effectiveAuthKey}"

# Launch Claude Code
claude`,
    },
    continue: {
      title: 'Continue.dev',
      description: 'Add 9Router to your ~/.continue/config.json for VS Code or JetBrains.',
      steps: [
        'Open ~/.continue/config.json',
        'Add a new model entry under "models":',
      ],
      code: `{
  "models": [
    {
      "title": "9Router Auto-Smart",
      "provider": "openai",
      "model": "auto-smart",
      "apiBase": "${effectiveBaseUrl}",
      "apiKey": "${effectiveAuthKey}"
    }
  ]
}`,
    },
    curl: {
      title: 'cURL / Shell',
      description: 'Call the OpenAI-compatible chat completion endpoint directly.',
      steps: ['Run this curl command in your terminal:'],
      code: `curl ${effectiveBaseUrl}/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${effectiveAuthKey}" \\
  -H "x-router-optimize: true" \\
  -d '{
    "model": "auto-smart",
    "messages": [
      {"role": "user", "content": "Explain binary search concisely"}
    ],
    "stream": true
  }'`,
    },
    python: {
      title: 'Python (OpenAI SDK)',
      description: 'Use the official openai Python package with 9Router.',
      steps: ['Install: pip install openai', 'Run the snippet below:'],
      code: `from openai import OpenAI

client = OpenAI(
    base_url="${effectiveBaseUrl}",
    api_key="${effectiveAuthKey}"
)

response = client.chat.completions.create(
    model="auto-smart",
    messages=[{"role": "user", "content": "Write a FastAPI route"}],
    stream=True,
    extra_headers={"x-router-optimize": "true"}
)

for chunk in response:
    content = chunk.choices[0].delta.content or ""
    print(content, end="", flush=True)`,
    },
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <Code2 className="w-5 h-5 text-cyan-400" />
          <span>Client Integration & IDE Setup</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Connect your favorite coding agent, IDE, or CLI to 9Router. One endpoint to rule them all.
        </p>
      </div>

      {/* Client Selector Pills */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(clientConfigs).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setActiveClient(key)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
              activeClient === key
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {config.title}
          </button>
        ))}
      </div>

      {/* Selected Client Card */}
      {(() => {
        const client = clientConfigs[activeClient as keyof typeof clientConfigs];
        return (
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">{client.title} Configuration</h3>
              <p className="text-sm text-slate-400 mt-1">{client.description}</p>
            </div>

            {/* Steps */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Setup Steps:
              </h4>
              <ul className="space-y-1.5 text-xs sm:text-sm text-slate-300">
                {client.steps.map((step, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center shrink-0 font-mono text-[11px] font-bold">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Code Snippet Box */}
            <div className="relative">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border border-slate-800 rounded-t-xl text-xs font-mono text-slate-400">
                <span>Code Configuration</span>
                <button
                  onClick={() => handleCopy(activeClient, client.code)}
                  className="flex items-center space-x-1 text-slate-400 hover:text-cyan-400 transition"
                >
                  {copiedKey === activeClient ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Snippet</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 bg-slate-950/80 border-x border-b border-slate-800 rounded-b-xl text-xs sm:text-sm font-mono text-cyan-300 overflow-x-auto whitespace-pre leading-relaxed">
                {client.code}
              </pre>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
