'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  Flame,
  Send,
  Sparkles,
  Trash2,
  User,
  Zap,
} from 'lucide-react';
import { DEFAULT_FALLBACK_GROUPS, DEFAULT_PROVIDERS } from '@/lib/config';

interface PlaygroundTabProps {
  keys: Record<string, string>;
  baseUrls: Record<string, string>;
  gatewaySecret: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  meta?: {
    servedBy?: string;
    servedModel?: string;
    fallbackCount?: number;
    tokensSaved?: number;
    durationMs?: number;
  };
}

export function PlaygroundTab({
  keys,
  baseUrls,
  gatewaySecret,
}: PlaygroundTabProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        '👋 Welcome to the 9Router Playground! Send any coding prompt to test streaming, auto-fallback, and RTK token compression across your AI providers.',
    },
  ]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('auto-smart');
  const [enableCompression, setEnableCompression] = useState(true);
  const [cavemanMode, setCavemanMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [responseMeta, setResponseMeta] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentResponse]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setCurrentResponse('');
    setResponseMeta(null);

    const startTime = Date.now();

    try {
      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (gatewaySecret) {
        headers['Authorization'] = `Bearer ${gatewaySecret}`;
      }

      if (enableCompression) {
        headers['x-router-optimize'] = 'true';
      }
      if (cavemanMode) {
        headers['x-caveman-mode'] = 'true';
      }

      // Attach client-stored keys
      Object.entries(keys).forEach(([pId, keyVal]) => {
        if (keyVal) headers[`x-${pId}-key`] = keyVal;
      });
      Object.entries(baseUrls).forEach(([pId, urlVal]) => {
        if (urlVal) headers[`x-${pId}-base-url`] = urlVal;
      });

      const res = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: selectedModel,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          stream: true,
        }),
      });

      const servedBy = res.headers.get('x-router-provider') || 'unknown';
      const servedModel = res.headers.get('x-router-model') || selectedModel;
      const fallbackCount = parseInt(res.headers.get('x-router-fallback-count') || '0', 10);
      const tokensSaved = parseInt(res.headers.get('x-router-tokens-saved') || '0', 10);

      if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        const errMsg =
          errorJson?.error?.message ||
          errorJson?.error ||
          `HTTP ${res.status}: Failed to process request.`;

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `⚠️ Error from router:\n\n${errMsg}`,
            meta: { durationMs: Date.now() - startTime },
          },
        ]);
        setIsLoading(false);
        return;
      }

      // Read SSE stream
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const dataStr = trimmed.slice(5).trim();
            if (dataStr === '[DONE]') continue;

            try {
              const chunk = JSON.parse(dataStr);
              const delta = chunk.choices?.[0]?.delta?.content;
              if (delta) {
                accumulatedText += delta;
                setCurrentResponse(accumulatedText);
              }
            } catch {
              // Ignore non-json chunks
            }
          }
        }
      }

      const totalDuration = Date.now() - startTime;
      const meta = {
        servedBy,
        servedModel,
        fallbackCount,
        tokensSaved,
        durationMs: totalDuration,
      };

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: accumulatedText || '(No response received)',
          meta,
        },
      ]);
      setCurrentResponse('');
      setResponseMeta(meta);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Connection failed: ${err.message || err}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Chat cleared. Select a model and test any prompt!',
      },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Playground Controls Bar */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-4">
        {/* Model Selector */}
        <div className="flex items-center space-x-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Model:
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-cyan-400 font-mono text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            <optgroup label="Virtual Fallback Groups (Recommended)">
              {DEFAULT_FALLBACK_GROUPS.map((g) => (
                <option key={g.id} value={g.id}>
                  ⭐ {g.name} ({g.id})
                </option>
              ))}
            </optgroup>
            <optgroup label="Individual Direct Models">
              {DEFAULT_PROVIDERS.flatMap((p) =>
                p.models.map((m) => (
                  <option key={`${p.id}-${m}`} value={m}>
                    {p.name}: {m}
                  </option>
                ))
              )}
            </optgroup>
          </select>
        </div>

        {/* Feature Toggles */}
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-300">
            <input
              type="checkbox"
              checked={enableCompression}
              onChange={(e) => setEnableCompression(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0"
            />
            <span className="flex items-center space-x-1">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>RTK Token Saver</span>
            </span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-300">
            <input
              type="checkbox"
              checked={cavemanMode}
              onChange={(e) => setCavemanMode(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0"
            />
            <span className="flex items-center space-x-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Caveman Mode (Terse)</span>
            </span>
          </label>

          <button
            onClick={clearChat}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition"
            title="Clear Chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:p-6 min-h-[420px] max-h-[580px] overflow-y-auto flex flex-col space-y-4">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={index}
              className={`flex items-start space-x-3 ${
                isUser ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white ${
                  isUser
                    ? 'bg-gradient-to-tr from-cyan-600 to-blue-600'
                    : 'bg-slate-800 border border-slate-700 text-cyan-400'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={`max-w-[85%] space-y-2`}>
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-cyan-600 text-white font-medium rounded-tr-none'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none font-mono text-xs sm:text-sm'
                  }`}
                >
                  {msg.content}
                </div>

                {/* Metadata Badge */}
                {msg.meta && (
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-400 pt-1">
                    {msg.meta.servedBy && (
                      <span className="px-2 py-0.5 rounded bg-slate-800/90 text-cyan-300 border border-slate-700">
                        ⚡ Provider: {msg.meta.servedBy} ({msg.meta.servedModel})
                      </span>
                    )}
                    {msg.meta.durationMs && (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800/90 text-slate-300 border border-slate-700">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>{msg.meta.durationMs}ms</span>
                      </span>
                    )}
                    {msg.meta.fallbackCount !== undefined && msg.meta.fallbackCount > 0 && (
                      <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
                        Failovers: {msg.meta.fallbackCount}
                      </span>
                    )}
                    {msg.meta.tokensSaved !== undefined && msg.meta.tokensSaved > 0 && (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                        <Coins className="w-3 h-3 text-emerald-400" />
                        <span>~{msg.meta.tokensSaved} tokens saved</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Live Streaming Response */}
        {isLoading && currentResponse && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-cyan-400">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="max-w-[85%]">
              <div className="p-4 rounded-2xl bg-slate-900 border border-cyan-800/60 text-slate-200 rounded-tl-none font-mono text-xs sm:text-sm whitespace-pre-wrap shadow-lg shadow-cyan-950/20">
                {currentResponse}
                <span className="inline-block w-2 h-4 ml-1 bg-cyan-400 animate-pulse" />
              </div>
            </div>
          </div>
        )}

        {isLoading && !currentResponse && (
          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 p-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Routing through provider cascade...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} className="relative flex items-center">
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask anything or paste code diff... (Shift+Enter for new line)"
          className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 pr-14 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none font-mono text-xs sm:text-sm"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="absolute right-3.5 p-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-white shadow-md shadow-cyan-500/20 transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
