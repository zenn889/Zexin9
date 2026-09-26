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
  Download,
  File,
  FileCode,
  FileText,
  Flame,
  Gauge,
  Image as ImageIcon,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  Send,
  Sidebar as SidebarIcon,
  Sparkles,
  Trash2,
  User,
  X,
  Zap,
} from 'lucide-react';
import { DEFAULT_FALLBACK_GROUPS, DEFAULT_PROVIDERS } from '@/lib/config';

interface PlaygroundTabProps {
  keys: Record<string, string>;
  baseUrls: Record<string, string>;
  gatewaySecret: string;
}

export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string; // text content or base64 for images
  isImage?: boolean;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  files?: { name: string; size: number; isImage?: boolean }[];
  meta?: {
    servedBy?: string;
    servedModel?: string;
    fallbackCount?: number;
    failures?: string;
    tokensSaved?: number;
    durationMs?: number;
    tokensPerSec?: number;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  model: string;
  messages: Message[];
}

const DEFAULT_WELCOME_MESSAGE: Message = {
  role: 'assistant',
  content:
    '👋 **Zexin9 Gateway Online!**\n\nPilih model apa pun (misal `auto-smart` atau `deepseek-chat`), lampirkan file kode/dokumen jika diperlukan, dan kirim instruksi Anda. Semua riwayat sesi Anda tersimpan permanen dan tidak akan hilang!',
};

// Helper: Download code as a standalone file
function downloadCodeFile(code: string, language: string, suggestedFilename?: string) {
  const extMap: Record<string, string> = {
    python: 'py',
    py: 'py',
    javascript: 'js',
    js: 'js',
    typescript: 'ts',
    ts: 'ts',
    tsx: 'tsx',
    jsx: 'jsx',
    html: 'html',
    css: 'css',
    json: 'json',
    markdown: 'md',
    md: 'md',
    sql: 'sql',
    bash: 'sh',
    sh: 'sh',
    shell: 'sh',
    yaml: 'yaml',
    yml: 'yml',
    rust: 'rs',
    rs: 'rs',
    go: 'go',
    cpp: 'cpp',
    c: 'c',
    java: 'java',
    txt: 'txt',
    text: 'txt',
  };
  const cleanLang = (language || '').toLowerCase().trim();
  const ext = extMap[cleanLang] || cleanLang || 'txt';
  const filename = suggestedFilename || `zexin9-output.${ext}`;

  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Helper: Parse message content into text and interactive code blocks
interface ContentPart {
  type: 'text' | 'code';
  content: string;
  language?: string;
  filename?: string;
}

function parseMarkdownParts(text: string): ContentPart[] {
  const parts: ContentPart[] = [];
  const codeBlockRegex = /```(\w+)?(?:\s+(?:file=|filename=)?["']?([^\s"'\n]+)["']?)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    const rawLang = match[1] || 'code';
    let filename = match[2];
    const codeBody = match[3];

    // If filename wasn't in backtick header, inspect first comment line (e.g., `# app.py` or `// index.ts`)
    if (!filename) {
      const firstLineMatch = codeBody.match(/^(?:#|\/\/|\/\*|<!--)\s*([a-zA-Z0-9_.-]+\.[a-zA-Z0-9]+)/);
      if (firstLineMatch) {
        filename = firstLineMatch[1];
      }
    }

    parts.push({
      type: 'code',
      content: codeBody,
      language: rawLang,
      filename,
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return parts;
}

export function PlaygroundTab({
  keys,
  baseUrls,
  gatewaySecret,
}: PlaygroundTabProps) {
  // --- Sessions State ---
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [sessionSearch, setSessionSearch] = useState<string>('');
  const [isSessionsDrawerOpen, setIsSessionsDrawerOpen] = useState<boolean>(true);

  // --- Current Active Chat State ---
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('auto-smart');
  const selectedModelRef = useRef('auto-smart'); // always up-to-date, used inside async handleSend
  const [enableCompression, setEnableCompression] = useState(true);
  const [cavemanMode, setCavemanMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [copiedMsgIdx, setCopiedMsgIdx] = useState<number | null>(null);

  // --- File Upload State ---
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- User Custom Models ---
  const [userCustomModels, setUserCustomModels] = useState<Record<string, string[]>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- 1. Load Sessions from localStorage on Mount ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Auto-collapse sessions drawer on mobile/tablet viewports
      if (window.innerWidth < 1024) {
        setIsSessionsDrawerOpen(false);
      }

      // Load custom user models
      const storedUserModels =
        localStorage.getItem('zexin9_user_models') || localStorage.getItem('9router_user_models');
      if (storedUserModels) {
        try {
          setUserCustomModels(JSON.parse(storedUserModels));
        } catch {
          // ignore
        }
      }

      // Load Sessions
      let loadedSessions: ChatSession[] = [];
      const storedSessionsRaw =
        localStorage.getItem('zexin9_playground_sessions') ||
        localStorage.getItem('9router_playground_sessions');

      if (storedSessionsRaw) {
        try {
          const parsed = JSON.parse(storedSessionsRaw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loadedSessions = parsed;
          }
        } catch {
          // ignore
        }
      }

      // If no stored sessions, initialize with a fresh session
      if (loadedSessions.length === 0) {
        const initialSession: ChatSession = {
          id: `sess-${Date.now()}`,
          title: 'Percakapan Utama',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          model: 'auto-smart',
          messages: [DEFAULT_WELCOME_MESSAGE],
        };
        loadedSessions = [initialSession];
      }

      setSessions(loadedSessions);

      // Determine active session ID
      const savedActiveId =
        localStorage.getItem('zexin9_active_session_id') ||
        localStorage.getItem('9router_active_session_id');

      const matchedSession = loadedSessions.find((s) => s.id === savedActiveId);
      const activeId = matchedSession ? matchedSession.id : loadedSessions[0].id;
      setActiveSessionId(activeId);

      const currentActive = loadedSessions.find((s) => s.id === activeId);
      if (currentActive?.model) {
        setSelectedModel(currentActive.model);
      }
    }
  }, []);

  // Save sessions to localStorage helper
  const persistSessions = (updatedList: ChatSession[], activeId?: string) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('zexin9_playground_sessions', JSON.stringify(updatedList));
      if (activeId) {
        localStorage.setItem('zexin9_active_session_id', activeId);
      }
    } catch (e) {
      console.error('Failed to save sessions to localStorage', e);
    }
  };

  // Get active session
  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = activeSession ? activeSession.messages : [DEFAULT_WELCOME_MESSAGE];

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentResponse]);

  // --- Session Handlers ---
  const handleCreateNewSession = () => {
    const newSession: ChatSession = {
      id: `sess-${Date.now()}`,
      title: `Percakapan #${sessions.length + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      model: selectedModel,
      messages: [DEFAULT_WELCOME_MESSAGE],
    };
    const updated = [newSession, ...sessions];
    setSessions(updated);
    setActiveSessionId(newSession.id);
    setAttachedFiles([]);
    setInput('');
    setCurrentResponse('');
    persistSessions(updated, newSession.id);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSessionsDrawerOpen(false);
    }
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    setAttachedFiles([]);
    setInput('');
    setCurrentResponse('');
    const target = sessions.find((s) => s.id === id);
    if (target?.model) {
      setSelectedModel(target.model);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('zexin9_active_session_id', id);
      if (window.innerWidth < 1024) {
        setIsSessionsDrawerOpen(false);
      }
    }
  };


  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      // If deleting the only session, reset it to blank
      const resetSession: ChatSession = {
        id: `sess-${Date.now()}`,
        title: 'Percakapan Utama',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        model: selectedModel,
        messages: [DEFAULT_WELCOME_MESSAGE],
      };
      setSessions([resetSession]);
      setActiveSessionId(resetSession.id);
      persistSessions([resetSession], resetSession.id);
      return;
    }

    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    if (activeSessionId === id) {
      const nextId = updated[0].id;
      setActiveSessionId(nextId);
      persistSessions(updated, nextId);
    } else {
      persistSessions(updated, activeSessionId);
    }
  };

  const handleClearCurrentChat = () => {
    if (!activeSession) return;
    const updatedMessages = [
      {
        role: 'assistant' as const,
        content: 'Chat telah dibersihkan. Silakan upload file atau kirim prompt baru!',
      },
    ];
    const updatedSessions = sessions.map((s) =>
      s.id === activeSession.id
        ? { ...s, messages: updatedMessages, updatedAt: new Date().toISOString() }
        : s
    );
    setSessions(updatedSessions);
    persistSessions(updatedSessions, activeSession.id);
  };

  // --- File Upload Processing ---
  const processFiles = async (fileList: FileList | File[]) => {
    const newFiles: AttachedFile[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      // Limit file size to 15MB
      if (file.size > 15 * 1024 * 1024) {
        alert(`File "${file.name}" melebihi batas 15MB.`);
        continue;
      }

      const isImage = file.type.startsWith('image/');

      if (isImage) {
        // Read image as Data URL
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string) || '');
          reader.readAsDataURL(file);
        });
        newFiles.push({
          id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'image',
          content: dataUrl,
          isImage: true,
        });
      } else {
        // Read code / text files as UTF-8
        const textContent = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string) || '');
          reader.readAsText(file);
        });
        newFiles.push({
          id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          type: file.type || 'text/plain',
          content: textContent,
          isImage: false,
        });
      }
    }

    if (newFiles.length > 0) {
      setAttachedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      // Reset input value so same file can be re-selected if needed
      e.target.value = '';
    }
  };

  const handleRemoveAttachedFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Copy helpers
  const copyMessageText = (index: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgIdx(index);
    setTimeout(() => setCopiedMsgIdx(null), 2000);
  };

  const copyCodeSegment = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const PROMPT_PRESETS = [
    { label: '🚀 Quick Fast Code', prompt: 'Write an async debounce function in TypeScript with clear types.' },
    { label: '📄 Buat File Python', prompt: 'Buat file python bernama scraper.py lengkap dengan error handling.' },
    { label: '⚡ Test Caveman Mode', prompt: 'List 3 ways to optimize Next.js app router performance.' },
    { label: '🧪 Test Git Diff Compression', prompt: 'Here is a diff: +++ a/file.js \n--- b/file.js \n@@ -1,5 +1,5 @@\n- const x = 1;\n+ const x = 2;\nExplain what changed.' },
  ];

  // --- Send Message Handler ---
  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if ((!textToSend.trim() && attachedFiles.length === 0) || isLoading) return;

    // Always read from ref to get the latest model even if state is stale in closure
    const currentModel = selectedModelRef.current || selectedModel;

    // 1. Construct prompt payload including file contexts
    let fullPromptPayload = textToSend.trim();
    if (attachedFiles.length > 0) {
      let fileContextBlock = `[LAMPIRAN FILE (${attachedFiles.length} file)]:\n`;
      attachedFiles.forEach((f, idx) => {
        if (f.isImage) {
          fileContextBlock += `\n--- FILE ${idx + 1}: ${f.name} (${Math.round(f.size / 1024) || 1} KB, Gambar) ---\n[Image data attached]\n`;
        } else {
          const ext = f.name.split('.').pop() || 'text';
          fileContextBlock += `\n--- START FILE ${idx + 1}: ${f.name} (${Math.round(f.size / 1024) || 1} KB) ---\n\`\`\`${ext}\n${f.content}\n\`\`\`\n--- END FILE: ${f.name} ---\n`;
        }
      });
      fullPromptPayload = `${fileContextBlock}\nInstruksi User:\n${textToSend.trim() || 'Mohon analisa file terlampir dan buatkan solusinya.'}`;
    }

    // 2. User Message Object for UI
    const userMessage: Message = {
      role: 'user',
      content: textToSend.trim() || `[Mengirim ${attachedFiles.length} file terlampir]`,
      files: attachedFiles.map((f) => ({
        name: f.name,
        size: f.size,
        isImage: f.isImage,
      })),
    };

    const newMessages = [...messages, userMessage];

    // Auto-update session title if it's the first user message
    let sessionTitle = activeSession.title;
    if (
      sessionTitle.startsWith('Percakapan #') ||
      sessionTitle === 'Percakapan Utama' ||
      sessionTitle === 'Percakapan Baru'
    ) {
      const candidateTitle = (textToSend.trim() || attachedFiles[0]?.name || 'Chat').slice(0, 30);
      sessionTitle = candidateTitle + (candidateTitle.length >= 30 ? '...' : '');
    }

    // Update session immediately
    const updatedSessionsSending = sessions.map((s) =>
      s.id === activeSession.id
        ? {
            ...s,
            title: sessionTitle,
            model: currentModel,
            messages: newMessages,
            updatedAt: new Date().toISOString(),
          }
        : s
    );

    setSessions(updatedSessionsSending);
    persistSessions(updatedSessionsSending, activeSession.id);

    setInput('');
    setAttachedFiles([]);
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

      // Re-read baseUrls and keys from localStorage to catch any updates from ProvidersTab
      // that haven't propagated to props yet (different localStorage keys used by ProvidersTab)
      if (typeof window !== 'undefined') {
        try {
          const lsBaseUrls = JSON.parse(
            localStorage.getItem('zexin9_baseurls') ||
            localStorage.getItem('9router_baseurls') || '{}'
          );
          Object.entries(lsBaseUrls).forEach(([pId, urlVal]) => {
            if (typeof urlVal === 'string' && urlVal.trim() && !headers[`x-${pId}-base-url`]) {
              headers[`x-${pId}-base-url`] = urlVal.trim();
            }
          });

          const lsKeys = JSON.parse(
            localStorage.getItem('zexin9_keys') ||
            localStorage.getItem('9router_keys') || '{}'
          );
          Object.entries(lsKeys).forEach(([pId, keyVal]) => {
            if (typeof keyVal === 'string' && keyVal.trim() && !headers[`x-${pId}-key`]) {
              headers[`x-${pId}-key`] = keyVal.trim();
            }
          });
        } catch {
          // ignore JSON parse errors
        }
      }

      // Always send Cloudflare Account ID so router can build the correct base URL
      if (typeof window !== 'undefined') {
        const cfAccountId =
          localStorage.getItem('zexin9_cf_account_id') ||
          localStorage.getItem('9router_cf_account_id') ||
          '';
        if (cfAccountId.trim()) {
          headers['x-cloudflare-account-id'] = cfAccountId.trim();
        }
      }

      // Prepare API messages
      const apiMessages = newMessages
        .filter((m) => m.role !== 'system')
        .map((m, idx) => {
          // Send the full prompt payload for the last user message
          if (idx === newMessages.length - 1 && m.role === 'user') {
            return { role: 'user', content: fullPromptPayload };
          }
          return { role: m.role, content: m.content };
        });

      // Remove initial assistant welcome message
      while (apiMessages.length > 0 && apiMessages[0].role === 'assistant') {
        apiMessages.shift();
      }
      if (apiMessages.length === 0) {
        apiMessages.push({ role: 'user', content: fullPromptPayload });
      }

      const res = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          model: currentModel,
          messages: apiMessages,
          stream: true,
          max_tokens: 8192,
        }),
      });

      const servedBy = res.headers.get('x-router-provider') || 'unknown';
      const servedModel = res.headers.get('x-router-model') || currentModel;
      const fallbackCount = parseInt(res.headers.get('x-router-fallback-count') || '0', 10);
      const failures = res.headers.get('x-router-failures') || '';
      const tokensSaved = parseInt(res.headers.get('x-router-tokens-saved') || '0', 10);

      if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        let errMsg =
          errorJson?.error?.message ||
          errorJson?.error ||
          `HTTP ${res.status}: Fallback exhausted or invalid keys.`;

        if (Array.isArray(errorJson?.error?.failure_chain) && errorJson.error.failure_chain.length > 0) {
          errMsg +=
            '\n\n**Riwayat Provider Pool:**\n' +
            errorJson.error.failure_chain.map((c: string) => `• ${c}`).join('\n');
        }

        const errorAssistantMsg: Message = {
          role: 'assistant',
          content: `⚠️ **Router Alert:**\n\n${errMsg}`,
          meta: { durationMs: Date.now() - startTime },
        };

        const updatedWithErr = sessions.map((s) =>
          s.id === activeSession.id
            ? {
                ...s,
                messages: [...newMessages, errorAssistantMsg],
                updatedAt: new Date().toISOString(),
              }
            : s
        );
        setSessions(updatedWithErr);
        persistSessions(updatedWithErr, activeSession.id);
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

            // Flush remaining bytes from TextDecoder on stream end
            if (done) {
              const remaining = decoder.decode(undefined, { stream: false });
              if (remaining) buffer += remaining;
            } else {
              buffer += decoder.decode(value, { stream: true });
            }

            // Process all complete lines in buffer
            const lines = buffer.split('\n');
            // Keep last incomplete line in buffer (unless done, then process everything)
            buffer = done ? '' : (lines.pop() || '');

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;
              const dataStr = trimmed.slice(5).trim();
              if (!dataStr || dataStr === '[DONE]') continue;

              try {
                const chunk = JSON.parse(dataStr);
                const delta =
                  chunk.choices?.[0]?.delta?.content ||
                  chunk.choices?.[0]?.delta?.reasoning_content ||
                  chunk.choices?.[0]?.text;
                if (delta) {
                  accumulatedText += delta;
                  setCurrentResponse(accumulatedText);
                }
              } catch {
                // Ignore parse errors on individual SSE lines
              }
            }

            if (done) break;
          }

          // Process any leftover buffer content after stream ends
          if (buffer.trim()) {
            const trimmed = buffer.trim();
            if (trimmed.startsWith('data:')) {
              const dataStr = trimmed.slice(5).trim();
              if (dataStr && dataStr !== '[DONE]') {
                try {
                  const chunk = JSON.parse(dataStr);
                  const delta =
                    chunk.choices?.[0]?.delta?.content ||
                    chunk.choices?.[0]?.delta?.reasoning_content ||
                    chunk.choices?.[0]?.text;
                  if (delta) {
                    accumulatedText += delta;
                    setCurrentResponse(accumulatedText);
                  }
                } catch {
                  // ignore
                }
              }
            }
          }
        }
      }

      const totalDuration = Date.now() - startTime;
      const estTokens = Math.round(accumulatedText.length / 4);
      const tokensPerSec = totalDuration > 0 ? Math.round((estTokens / totalDuration) * 1000) : 0;

      const finalAssistantMsg: Message = {
        role: 'assistant',
        content: accumulatedText || '(Empty response)',
        meta: {
          servedBy,
          servedModel,
          fallbackCount,
          failures,
          tokensSaved,
          durationMs: totalDuration,
          tokensPerSec,
        },
      };

      const finalSessions = sessions.map((s) =>
        s.id === activeSession.id
          ? {
              ...s,
              messages: [...newMessages, finalAssistantMsg],
              updatedAt: new Date().toISOString(),
            }
          : s
      );

      setSessions(finalSessions);
      persistSessions(finalSessions, activeSession.id);
      setCurrentResponse('');
    } catch (err: any) {
      const failMsg: Message = {
        role: 'assistant',
        content: `Connection failed: ${err.message || err}`,
      };
      const finalSessions = sessions.map((s) =>
        s.id === activeSession.id
          ? {
              ...s,
              messages: [...newMessages, failMsg],
              updatedAt: new Date().toISOString(),
            }
          : s
      );
      setSessions(finalSessions);
      persistSessions(finalSessions, activeSession.id);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(sessionSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col lg:flex-row gap-5 min-h-[680px]">
      {/* --- SESSIONS DRAWER / SIDEBAR --- */}
      <div
        className={`${
          isSessionsDrawerOpen ? 'w-full lg:w-72 block' : 'hidden'
        } shrink-0 pro-card p-4 flex flex-col justify-between shadow-xl transition-all`}
      >
        <div className="space-y-3.5">
          {/* Top Session Actions */}
          <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <h3 className="font-semibold text-xs font-mono uppercase tracking-wider text-slate-200">
                Riwayat Sesi
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-cyan-300 font-medium">
                {sessions.length}
              </span>
              <button
                onClick={() => setIsSessionsDrawerOpen(false)}
                className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
                title="Tutup Riwayat Sesi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* New Chat Button */}
          <button
            onClick={handleCreateNewSession}
            className="w-full py-2 px-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition flex items-center justify-center space-x-2 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Sesi Chat Baru</span>
          </button>

          {/* Session Search */}
          {sessions.length > 3 && (
            <div className="relative">
              <input
                type="text"
                placeholder="Cari sesi..."
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
                className="input-pro w-full pl-8 py-1.5"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            </div>
          )}

          {/* Sessions List */}
          <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
            {filteredSessions.map((sess) => {
              const isActive = sess.id === activeSessionId;
              const msgCount = sess.messages.length;
              return (
                <div
                  key={sess.id}
                  onClick={() => handleSelectSession(sess.id)}
                  className={`p-3 rounded-xl cursor-pointer border transition flex items-start justify-between group ${
                    isActive
                      ? 'bg-white/[0.08] border-white/[0.12] text-white shadow-sm'
                      : 'bg-black/30 border-white/[0.04] hover:bg-white/[0.03] hover:border-white/[0.08] text-slate-400'
                  }`}
                >
                  <div className="space-y-1 min-w-0 pr-2">
                    <div className="font-medium text-xs truncate flex items-center space-x-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-cyan-400 shadow-sm shadow-cyan-400/50' : 'bg-slate-600'}`} />
                      <span className="truncate">{sess.title}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-500">
                      <span>{new Date(sess.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>•</span>
                      <span>{msgCount} pesan</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteSession(sess.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
                    title="Hapus Sesi"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-3 border-t border-white/[0.06] text-[10px] font-mono text-slate-500 flex items-center justify-between">
          <span>Otomatis Tersimpan</span>
          <span className="text-emerald-400 font-semibold">100% Persisten</span>
        </div>
      </div>

      {/* --- MAIN PLAYGROUND CONSOLE --- */}
      <div className="flex-1 space-y-4 sm:space-y-5 min-w-0">
        {/* Playground Header Controls */}
        <div className="pro-card p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-xl">
          {/* Left Controls: Drawer Toggle + Model Selector */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <button
              onClick={() => setIsSessionsDrawerOpen(!isSessionsDrawerOpen)}
              className={`p-2 rounded-xl border transition shrink-0 active:scale-95 ${
                isSessionsDrawerOpen
                  ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                  : 'bg-white/[0.03] border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.06]'
              }`}
              title={isSessionsDrawerOpen ? 'Tutup Riwayat Sesi' : 'Buka Riwayat Sesi'}
            >
              <SidebarIcon className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0 flex-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono hidden xs:inline shrink-0">
                Model:
              </label>
              <select
                value={selectedModel}
                onChange={(e) => {
                  const newModel = e.target.value;
                  setSelectedModel(newModel);
                  selectedModelRef.current = newModel;
                  // Immediately persist the chosen model into the active session
                  if (activeSession && newModel !== 'custom') {
                    const updatedSessions = sessions.map((s) =>
                      s.id === activeSession.id ? { ...s, model: newModel } : s
                    );
                    setSessions(updatedSessions);
                    persistSessions(updatedSessions, activeSession.id);
                  }
                }}
                className="w-full sm:w-auto input-pro font-mono text-xs font-semibold text-cyan-300 truncate max-w-full"
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
                  placeholder="Ketik model ID lalu tekan Enter..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val) {
                        setSelectedModel(val);
                        selectedModelRef.current = val;
                        if (activeSession) {
                          const updatedSessions = sessions.map((s) =>
                            s.id === activeSession.id ? { ...s, model: val } : s
                          );
                          setSessions(updatedSessions);
                          persistSessions(updatedSessions, activeSession.id);
                        }
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    if (val) {
                      setSelectedModel(val);
                      selectedModelRef.current = val;
                      if (activeSession) {
                        const updatedSessions = sessions.map((s) =>
                          s.id === activeSession.id ? { ...s, model: val } : s
                        );
                        setSessions(updatedSessions);
                        persistSessions(updatedSessions, activeSession.id);
                      }
                    }
                  }}
                  className="bg-slate-950 border border-cyan-500 rounded-xl px-2.5 py-1 text-xs font-mono text-cyan-200 focus:outline-none w-40"
                />
              )}
            </div>
          </div>

          {/* Right Feature Switches */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-semibold text-slate-300 hover:text-white transition">
              <input
                type="checkbox"
                checked={enableCompression}
                onChange={(e) => setEnableCompression(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0 w-3.5 h-3.5 sm:w-4 sm:h-4 cursor-pointer"
              />
              <span className="flex items-center space-x-1">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">RTK Saver</span>
              </span>
            </label>

            <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-semibold text-slate-300 hover:text-white transition">
              <input
                type="checkbox"
                checked={cavemanMode}
                onChange={(e) => setCavemanMode(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 w-3.5 h-3.5 sm:w-4 sm:h-4 cursor-pointer"
              />
              <span className="flex items-center space-x-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Caveman</span>
              </span>
            </label>

            <button
              onClick={handleClearCurrentChat}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition"
              title="Bersihkan Percakapan Sesi Ini"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preset Prompts Pills (Smooth Horizontal Touch Scroll on Mobile) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider flex items-center space-x-1 shrink-0">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span className="hidden xs:inline">Quick:</span>
          </span>

          {PROMPT_PRESETS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p.prompt)}
              disabled={isLoading}
              className="text-xs px-3 py-1 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] text-slate-300 hover:text-white transition active:scale-95 whitespace-nowrap"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Chat Messages Thread */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`rounded-2xl sm:rounded-3xl border ${
            isDraggingFile ? 'border-cyan-400 bg-cyan-950/20' : 'border-white/[0.07] bg-[#07090e]/90'
          } p-3.5 sm:p-6 min-h-[420px] max-h-[580px] overflow-y-auto flex flex-col space-y-4 sm:space-y-5 shadow-2xl backdrop-blur-xl relative`}
        >
          {/* Drag & drop overlay banner */}
          {isDraggingFile && (
            <div className="absolute inset-0 bg-cyan-950/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center space-y-2 border-2 border-dashed border-cyan-400 rounded-2xl sm:rounded-3xl">
              <Paperclip className="w-10 h-10 text-cyan-400 animate-bounce" />
              <p className="font-bold text-sm text-cyan-200">Lepaskan file di sini untuk melampirkannya ke chat</p>
              <p className="text-xs text-slate-400">Mendukung kode (.py, .ts, .js, .json, .html, .css), teks, dan gambar</p>
            </div>
          )}

          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            const parts = !isUser ? parseMarkdownParts(msg.content) : [];

            return (
              <div
                key={index}
                className={`flex items-start space-x-2.5 sm:space-x-3.5 ${
                  isUser ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 text-white shadow-md ${
                    isUser
                      ? 'bg-gradient-to-tr from-cyan-500 to-blue-600'
                      : 'bg-white/[0.04] border border-white/[0.1] text-cyan-400'
                  }`}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                {/* Message Body */}
                <div className="max-w-[92%] sm:max-w-[88%] min-w-0 space-y-2">
                  <div
                    className={`p-3.5 sm:p-5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap relative group shadow-md ${
                      isUser
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium rounded-tr-none'
                        : 'bg-white/[0.03] border border-white/[0.07] text-slate-200 rounded-tl-none font-sans'
                    }`}
                  >

                    {/* User Attached Files Badges */}
                    {isUser && msg.files && msg.files.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3 pb-2 border-b border-cyan-400/30">
                        {msg.files.map((file, fIdx) => (
                          <div
                            key={fIdx}
                            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-950/70 border border-cyan-300/40 text-[11px] font-mono text-cyan-200"
                          >
                            {file.isImage ? (
                              <ImageIcon className="w-3.5 h-3.5 text-cyan-300" />
                            ) : (
                              <FileCode className="w-3.5 h-3.5 text-cyan-300" />
                            )}
                            <span className="font-bold truncate max-w-[160px]">{file.name}</span>
                            <span className="text-[10px] text-slate-300">
                              ({Math.round(file.size / 1024) || 1} KB)
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Content Display: Render Code Blocks with Download Buttons for Assistant */}
                    {isUser ? (
                      <div>{msg.content}</div>
                    ) : (
                      <div className="space-y-4">
                        {parts.map((part, pIdx) => {
                          if (part.type === 'text') {
                            return (
                              <div key={pIdx} className="whitespace-pre-wrap leading-relaxed">
                                {part.content}
                              </div>
                            );
                          }

                          // Interactive Code Block with File Header & Download
                          const codeBlockId = `code-${index}-${pIdx}`;
                          const isCopied = copiedCodeId === codeBlockId;
                          const displayFilename = part.filename || `file.${part.language || 'txt'}`;

                          return (
                            <div
                              key={pIdx}
                              className="rounded-xl overflow-hidden border border-white/[0.08] bg-black/60 shadow-lg my-2.5"
                            >
                              {/* File Header Bar */}
                              <div className="flex items-center justify-between px-3.5 py-2 bg-black/80 border-b border-white/[0.06] text-xs font-mono">
                                <div className="flex items-center space-x-2 text-cyan-300 font-semibold truncate">
                                  <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                  <span className="truncate">{displayFilename}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-400 uppercase font-medium">
                                    {part.language || 'code'}
                                  </span>
                                </div>

                                <div className="flex items-center space-x-1.5 shrink-0">
                                  {/* Download File Button */}
                                  <button
                                    onClick={() =>
                                      downloadCodeFile(part.content, part.language || 'txt', part.filename)
                                    }
                                    className="p-1 px-2 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-emerald-300 transition flex items-center space-x-1 text-[11px]"
                                    title="Download File ini ke Komputer"
                                  >
                                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="hidden sm:inline">Download</span>
                                  </button>

                                  {/* Copy Code Button */}
                                  <button
                                    onClick={() => copyCodeSegment(codeBlockId, part.content)}
                                    className="p-1 px-2 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-cyan-300 transition flex items-center space-x-1 text-[11px]"
                                    title="Salin Kode"
                                  >
                                    {isCopied ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        <span className="text-emerald-400 font-bold">Tersalin</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Salin</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>

                              {/* Code Body */}
                              <pre className="p-4 font-mono text-xs text-cyan-200 overflow-x-auto whitespace-pre leading-relaxed bg-[#060913]">
                                {part.content}
                              </pre>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Copy Button for Assistant complete responses */}
                    {!isUser && (
                      <button
                        onClick={() => copyMessageText(index, msg.content)}
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-cyan-300 transition"
                        title="Salin seluruh respons"
                      >
                        {copiedMsgIdx === index ? (
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
                      {Boolean(msg.meta.fallbackCount) && (
                        <span
                          className="px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/80"
                          title={
                            msg.meta.failures ||
                            'Provider utama (mis. custom) gagal, permintaan dijawab oleh provider fallback.'
                          }
                        >
                          ⚠️ Fallback ×{msg.meta.fallbackCount}
                        </span>
                      )}
                      {msg.meta.durationMs !== undefined && (
                        <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-800">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          <span>{msg.meta.durationMs}ms</span>
                        </span>
                      )}
                      {msg.meta.tokensPerSec !== undefined && msg.meta.tokensPerSec > 0 && (
                        <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-300 border border-white/[0.08]">
                          <Gauge className="w-3 h-3 text-indigo-400" />
                          <span>{msg.meta.tokensPerSec} tok/s</span>
                        </span>
                      )}
                      {msg.meta.tokensSaved !== undefined && msg.meta.tokensSaved > 0 && (
                        <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
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
              <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.1] flex items-center justify-center shrink-0 text-cyan-400">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="max-w-[88%]">
                <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-cyan-500/40 text-slate-100 rounded-tl-none font-sans text-xs sm:text-sm whitespace-pre-wrap shadow-lg">
                  {currentResponse}
                  <span className="inline-block w-2 h-4 ml-1 bg-cyan-400 animate-pulse" />
                </div>
              </div>
            </div>
          )}

          {isLoading && !currentResponse && (
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 p-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Zexin9 sedang mengarahkan permintaan melalui provider fallback tier...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form with File Attachments Preview & Upload Button */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="space-y-2"
        >
          {/* Hidden File Input */}
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* Attached Files Chips Bar */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 p-2 sm:p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.08] shadow-inner">
              <span className="text-[11px] font-mono text-cyan-400 font-bold flex items-center space-x-1 pl-1">
                <Paperclip className="w-3.5 h-3.5" />
                <span>Terlampir ({attachedFiles.length}):</span>
              </span>
              {attachedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-black/60 border border-cyan-500/30 text-[11px] font-mono text-slate-200 shadow-sm"
                >
                  {file.isImage ? (
                    <ImageIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  ) : (
                    <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  )}
                  <span className="font-semibold truncate max-w-[110px] xs:max-w-[150px] sm:max-w-xs">{file.name}</span>
                  <span className="text-[10px] text-slate-400">
                    ({Math.round(file.size / 1024) || 1} KB)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachedFile(file.id)}
                    className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Box with Action Buttons */}
          <div className="relative flex items-center">
            {/* Paperclip Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute left-2.5 sm:left-3.5 p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-white/[0.06] transition active:scale-95"
              title="Upload File / Kode / Dokumen / Gambar"
            >
              <Paperclip className="w-4 h-4" />
            </button>

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
              placeholder="Ketik instruksi, paste kode, atau drop file di sini... (Enter = kirim)"
              className="w-full bg-black/50 border border-white/[0.08] focus:border-cyan-500/60 rounded-2xl py-2.5 sm:py-3.5 pl-10 sm:pl-12 pr-12 sm:pr-14 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 resize-none font-sans shadow-xl transition"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
              className="absolute right-2 sm:right-3.5 p-2 sm:p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-slate-950 font-bold shadow-lg shadow-cyan-500/25 transition active:scale-95"
              title="Kirim Pesan"
            >
              <Send className="w-4 h-4 fill-current" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

