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
      badge: 'Recommended',
      description: 'Connect Cursor to 9Router to never get stopped by quota limits during heavy coding sessions.',
      steps: [
        'Open Cursor Settings → Models (or Features → Model)',
        'Turn ON "Override OpenAI Base URL"',
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
      title: 'Cline (VS Code)',
      badge: 'Agentic',
      description: 'Use 9Router as an OpenAI-compatible agentic backend in Cline for autonomous development.',
      steps: [
        'Click the Gear icon ⚙️ in the Cline panel',
        'Set API Provider to: "OpenAI Compatible"',
        `Set Base URL to: ${effectiveBaseUrl}`,
        `Enter API Key: ${effectiveAuthKey}`,
        'Set Model ID to: "auto-smart" (or "auto-code")',
      ],
      code: `# Cline Settings
API Provider : OpenAI Compatible
Base URL     : ${effectiveBaseUrl}
API Key      : ${effectiveAuthKey}
Model ID     : auto-smart`,
    },
    claudecode: {
      title: 'Claude Code CLI',
      badge: 'Anthropic Native',
      description: 'Run Anthropic\'s Claude Code CLI with any AI model (Gemini, DeepSeek, OpenAI) via 9Router.',
      steps: [
        'Install Claude Code: npm install -g @anthropic-ai/claude-code',
        `Set ANTHROPIC_BASE_URL to your gateway base URL (without /v1)`,
        'Set ANTHROPIC_API_KEY to your gateway key',
        'Run claude in your terminal!',
      ],
      code: `# Run this in terminal before launching Claude Code:
export ANTHROPIC_BASE_URL="${baseUrl || 'https://your-9router.vercel.app'}"
export ANTHROPIC_API_KEY="${effectiveAuthKey}"

# Launch Claude Code
claude`,
    },
    continue: {
      title: 'Continue.dev',
      badge: 'VS Code & JetBrains',
      description: 'Add 9Router to your ~/.continue/config.json for VS Code or JetBrains IDEs.',
      steps: [
        'Open ~/.continue/config.json',
        'Add the model configuration under "models" array:',
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
      badge: 'HTTP',
      description: 'Call the OpenAI-compatible chat completion endpoint directly with SSE streaming.',
      steps: ['Run this cURL command in your terminal:'],
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
      badge: 'SDK',
      description: 'Use the official openai Python package with 9Router.',
      steps: ['Install package: pip install openai', 'Execute the Python script below:'],
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
      <div className="pb-6 border-b border-slate-800/80">
        <div className="flex items-center space-x-2">
          <Code2 className="w-5 h-5 text-cyan-400" />
          <h2 className="text-2xl font-black text-white tracking-tight">
            Client Integration & IDE Setup
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Connect your favorite coding agent, IDE, or CLI to 9Router. One endpoint to rule them all.
        </p>
      </div>

      {/* Client Pills */}
      <div className="flex flex-wrap gap-2.5">
        {Object.entries(clientConfigs).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setActiveClient(key)}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition active:scale-95 ${
              activeClient === key
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>{config.title}</span>
            <span
              className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full uppercase ${
                activeClient === key
                  ? 'bg-slate-950 text-cyan-300 font-extrabold'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {config.badge}
            </span>
          </button>
        ))}
      </div>

      {/* Selected Config Card */}
      {(() => {
        const client = clientConfigs[activeClient as keyof typeof clientConfigs];
        return (
          <div className="p-8 rounded-3xl border border-slate-800/90 bg-gradient-to-b from-slate-900/60 to-slate-950/70 backdrop-blur-xl space-y-6 shadow-2xl">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold text-white">{client.title} Configuration</h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                  {client.badge}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">{client.description}</p>
            </div>

            {/* Steps */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                Setup Steps:
              </h4>
              <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
                {client.steps.map((step, idx) => (
                  <li key={idx} className="flex items-start space-x-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center shrink-0 font-mono text-[11px] font-black">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Code Snippet Box */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-xs font-mono text-slate-400">
                <span className="flex items-center space-x-1.5">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Configuration Snippet</span>
                </span>
                <button
                  onClick={() => handleCopy(activeClient, client.code)}
                  className="flex items-center space-x-1.5 text-slate-400 hover:text-cyan-300 transition"
                >
                  {copiedKey === activeClient ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Snippet</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-5 bg-slate-950/90 text-xs sm:text-sm font-mono text-cyan-300 overflow-x-auto whitespace-pre leading-relaxed">
                {client.code}
              </pre>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
