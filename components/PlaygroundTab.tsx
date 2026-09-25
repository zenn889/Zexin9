'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  AlertCircle,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Code2,
  Coins,
  Copy,
  Cpu,
  Flame,
  Gauge,
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
    tokensPerSec?: number;
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
        '👋 **9Router Gateway Online!**\n\nPilih model apa pun (misal `auto-smart` atau `auto-fast`) dan kirim prompt koding Anda. Router akan otomatis memilih provider terbaik dan mengaktifkan failover jika terjadi limit kuota!',
    },
  ]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('auto-smart');
  const [enableCompression, setEnableCompression] = useState(true);
  const [cavemanMode, setCavemanMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [userCustomModels, setUserCustomModels] = useState<Record<string, string[]>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUserModels = localStorage.getItem('9router_user_models');
      if (storedUserModels) {
        try {
          setUserCustomModels(JSON.parse(storedUserModels));
        } catch {
          // ignore
        }
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentResponse]);

  const copyMessage = (index: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const PROMPT_PRESETS = [
    { label: '🚀 Quick Fast Code', prompt: 'Write an async debounce function in TypeScript with clear types.' },
    { label: '🔍 Explain Binary Search', prompt: 'Explain how binary search works and write clean Python code.' },
    { label: '⚡ Test Caveman Mode', prompt: 'List 3 ways to optimize Next.js app router performance.' },
    { label: '🧪 Test Git Diff Compression', prompt: 'Here is a diff: +++ a/file.js \n--- b/file.js \n@@ -1,5 +1,5 @@\n- const x = 1;\n+ const x = 2;\nExplain what changed.' },
  ];

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: textToSend.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setCurrentResponse('');

    const startTime = Date.now();

    try {
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

      Object.entries(keys).forEach(([pId, keyVal]) => {
        if (keyVal && keyVal.trim()) headers[`x-${pId}-key`] = keyVal.trim();
      });
      Object.entries(baseUrls).forEach(([pId, urlVal]) => {
        if (urlVal && urlVal.trim()) headers[`x-${pId}-base-url`] = urlVal.trim();
      });

      // DeepSeek, Anthropic, & OpenAI strictly require conversations to start with 'user' or 'system'
      // Discard any initial greeting assistant messages from the payload
      let apiMessages = newMessages.map((m) => ({ role: m.role, content: m.content }));
      while (apiMessages.length > 0 && apiMessages[0].role === 'assistant') {
        apiMessages.shift();
      }
      if (apiMessages.length === 0) {
        apiMessages = [{ role: 'user', content: textToSend.trim() }];
      }

      const res = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          model: selectedModel,
          messages: apiMessages,
          stream: true,
        }),
      });

      const servedBy = res.headers.get('x-router-provider') || 'unknown';
      const servedModel = res.headers.get('x-router-model') || selectedModel;
      const fallbackCount = parseInt(res.headers.get('x-router-fallback-count') || '0', 10);
      const tokensSaved = parseInt(res.headers.get('x-router-tokens-saved') || '0', 10);

      if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        let errMsg =
          errorJson?.error?.message ||
          errorJson?.error ||
          `HTTP ${res.status}: Fallback exhausted or invalid keys.`;

        if (Array.isArray(errorJson?.error?.failure_chain) && errorJson.error.failure_chain.length > 0) {
          errMsg += '\n\n**Riwayat Provider Pool:**\n' + errorJson.error.failure_chain.map((c: string) => `• ${c}`).join('\n');
        }

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `⚠️ **Router Alert:**\n\n${errMsg}`,
            meta: { durationMs: Date.now() - startTime },
          },
        ]);
        setIsLoading(false);
        return;
      }

      const contentType = res.headers.get('content-type') || '';
      let accumulatedText = '';

      if (contentType.includes('application/json')) {
        const json = await res.json().catch(() => null);
        accumulatedText = json?.choices?.[0]?.message?.content || json?.choices?.[0]?.text || '';
        setCurrentResponse(accumulatedText);
      } else {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();

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
                const delta =
                  chunk.choices?.[0]?.delta?.content ||
                  chunk.choices?.[0]?.delta?.reasoning_content;
                if (delta) {
                  accumulatedText += delta;
                  setCurrentResponse(accumulatedText);
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }

      const totalDuration = Date.now() - startTime;
      const estTokens = Math.round(accumulatedText.length / 4);
      const tokensPerSec = totalDuration > 0 ? Math.round((estTokens / totalDuration) * 1000) : 0;

      const meta = {
        servedBy,
        servedModel,
        fallbackCount,
        tokensSaved,
        durationMs: totalDuration,
        tokensPerSec,
      };

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: accumulatedText || '(Empty response)',
          meta,
        },
      ]);
      setCurrentResponse('');
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
        content: 'Chat cleared. Pilih model dan coba prompt apa saja!',
      },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Playground Header Controls */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 shadow-xl">
        {/* Model Selector */}
        <div className="flex items-center space-x-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
            Model:
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-slate-950 border border-slate-700/80 text-cyan-300 font-mono text-xs font-bold rounded-xl px-3.5 py-2 focus:outline-none focus:border-cyan-500 shadow-inner"
          >
            <optgroup label="⭐ Virtual Multi-Tier Groups (Auto-Failover)">
              {DEFAULT_FALLBACK_GROUPS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.id} - {g.name}
                </option>
              ))}
            </optgroup>
            {DEFAULT_PROVIDERS.map((p) => {
              const customList = userCustomModels[p.id] || [];
              return (
                <optgroup key={p.id} label={`🔹 ${p.name}`}>
                  {p.models.map((m) => (
                    <option key={`${p.id}-${m}`} value={m}>
                      {m}
                    </option>
                  ))}
                  {customList.map((m) => (
                    <option key={`${p.id}-custom-${m}`} value={m}>
                      ⭐ {m}
                    </option>
                  ))}
                </optgroup>
              );
            })}
            <optgroup label="✏️ Custom">
              <option value="custom">+ Ketik Custom Model Manual</option>
            </optgroup>
          </select>
          {selectedModel === 'custom' && (
            <input
              type="text"
              placeholder="Ketik model ID (misal: deepseek-coder, gpt-4.5)..."
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-slate-950 border border-cyan-500 rounded-xl px-3 py-1.5 text-xs font-mono text-cyan-200 focus:outline-none"
            />
          )}
        </div>

        {/* Feature Switches */}
        <div className="flex items-center space-x-3 sm:space-x-5">
          <label className="flex items-center space-x-2 cursor-pointer text-xs font-semibold text-slate-300 hover:text-white transition">
            <input
              type="checkbox"
              checked={enableCompression}
              onChange={(e) => setEnableCompression(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0 w-4 h-4 cursor-pointer"
            />
            <span className="flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>RTK Token Saver</span>
            </span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer text-xs font-semibold text-slate-300 hover:text-white transition">
            <input
              type="checkbox"
              checked={cavemanMode}
              onChange={(e) => setCavemanMode(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
            />
            <span className="flex items-center space-x-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Caveman Mode</span>
            </span>
          </label>

          <button
            onClick={clearChat}
            className="p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preset Prompts Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider flex items-center space-x-1">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Quick Prompts:</span>
        </span>
        {PROMPT_PRESETS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p.prompt)}
            disabled={isLoading}
            className="text-xs px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-300 transition active:scale-95"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/70 p-4 sm:p-6 min-h-[460px] max-h-[620px] overflow-y-auto flex flex-col space-y-5 shadow-2xl backdrop-blur-md">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={index}
              className={`flex items-start space-x-3.5 ${
                isUser ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white shadow-md ${
                  isUser
                    ? 'bg-gradient-to-tr from-cyan-500 to-blue-600'
                    : 'bg-slate-900 border border-slate-700/80 text-cyan-400'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className="max-w-[85%] space-y-2">
                <div
                  className={`p-4 sm:p-5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap relative group ${
                    isUser
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium rounded-tr-none shadow-md'
                      : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none font-mono text-xs sm:text-sm shadow-md'
                  }`}
                >
                  {msg.content}

                  {/* Copy Button for Assistant responses */}
                  {!isUser && (
                    <button
                      onClick={() => copyMessage(index, msg.content)}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-cyan-300 transition"
                      title="Copy response"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>

                {/* Metadata Pills */}
                {msg.meta && (
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-400">
                    {msg.meta.servedBy && (
                      <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                        ⚡ Provider: {msg.meta.servedBy} ({msg.meta.servedModel})
                      </span>
                    )}
                    {msg.meta.durationMs !== undefined && (
                      <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-800">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>{msg.meta.durationMs}ms</span>
                      </span>
                    )}
                    {msg.meta.tokensPerSec !== undefined && msg.meta.tokensPerSec > 0 && (
                      <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-800">
                        <Gauge className="w-3 h-3 text-indigo-400" />
                        <span>{msg.meta.tokensPerSec} tok/s</span>
                      </span>
                    )}
                    {msg.meta.tokensSaved !== undefined && msg.meta.tokensSaved > 0 && (
                      <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
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

        {/* Streaming In-Progress */}
        {isLoading && currentResponse && (
          <div className="flex items-start space-x-3.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 text-cyan-400">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="max-w-[85%]">
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-cyan-500/50 text-slate-100 rounded-tl-none font-mono text-xs sm:text-sm whitespace-pre-wrap shadow-lg shadow-cyan-950/40">
                {currentResponse}
                <span className="inline-block w-2 h-4 ml-1 bg-cyan-400 animate-pulse" />
              </div>
            </div>
          </div>
        )}

        {isLoading && !currentResponse && (
          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 p-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span>Multiplexing request through provider fallback tiers...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative flex items-center">
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
          placeholder="Type any instruction or paste code snippet... (Enter to send, Shift+Enter for new line)"
          className="w-full bg-slate-900/90 border border-slate-800 focus:border-cyan-500 rounded-2xl p-4 pr-16 text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none font-mono text-xs sm:text-sm shadow-xl transition"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="absolute right-3.5 p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-slate-950 font-bold shadow-lg shadow-cyan-500/25 transition active:scale-95"
        >
          <Send className="w-4 h-4 fill-current" />
        </button>
      </form>
    </div>
  );
}
