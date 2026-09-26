'use client';

import React from 'react';
import { Check, Copy, Download, Eye, FileArchive, FileCode, FolderOpen, X } from 'lucide-react';

/** A file the model produced inside a chat answer (from a fenced code block). */
export interface ArtifactFile {
  name: string;
  language: string;
  content: string;
}

const EXT_MAP: Record<string, string> = {
  python: 'py',
  py: 'py',
  javascript: 'js',
  js: 'js',
  typescript: 'ts',
  ts: 'ts',
  tsx: 'tsx',
  jsx: 'jsx',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  json: 'json',
  markdown: 'md',
  md: 'md',
  sql: 'sql',
  bash: 'sh',
  sh: 'sh',
  shell: 'sh',
  zsh: 'sh',
  yaml: 'yaml',
  yml: 'yml',
  toml: 'toml',
  ini: 'ini',
  env: 'env',
  rust: 'rs',
  rs: 'rs',
  go: 'go',
  ruby: 'rb',
  php: 'php',
  cpp: 'cpp',
  'c++': 'cpp',
  c: 'c',
  csharp: 'cs',
  java: 'java',
  kotlin: 'kt',
  swift: 'swift',
  dart: 'dart',
  xml: 'xml',
  svg: 'svg',
  dockerfile: 'dockerfile',
  diff: 'diff',
  txt: 'txt',
  text: 'txt',
  code: 'txt',
};

export function extensionFor(language: string): string {
  const clean = (language || '').toLowerCase().trim();
  return EXT_MAP[clean] || clean || 'txt';
}

/** Languages the browser can render directly in a sandboxed preview. */
export function isPreviewable(language: string): boolean {
  const l = (language || '').toLowerCase().trim();
  return l === 'html' || l === 'htm' || l === 'svg' || l === 'xml';
}

export function fileSizeLabel(content: string): string {
  const bytes = new TextEncoder().encode(content || '').length;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** One generated file, rendered as a Claude-style artifact card. */
export function CodeFileCard({
  filename,
  language,
  content,
  copied,
  onCopy,
  onDownload,
  onPreview,
}: {
  filename: string;
  language: string;
  content: string;
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
  onPreview?: () => void;
}) {
  const lines = content ? content.split('\n').length : 0;
  return (
    <div className="rounded-xl overflow-hidden border border-white/[0.08] bg-black/60 shadow-lg my-2.5">
      {/* File Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-black/80 border-b border-white/[0.06] text-xs font-mono">
        <div className="flex items-center space-x-2 text-cyan-300 font-semibold truncate">
          <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="truncate">{filename}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-400 uppercase font-medium">
            {language || 'code'}
          </span>
          <span className="text-[10px] text-slate-500 hidden sm:inline">
            {lines} baris · {fileSizeLabel(content)}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          {onPreview && (
            <button
              type="button"
              onClick={onPreview}
              className="p-1 px-2 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-sky-300 transition flex items-center space-x-1 text-[11px]"
              title="Lihat hasilnya (preview HTML/SVG)"
            >
              <Eye className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Preview</span>
            </button>
          )}

          {/* Download File Button */}
          <button
            type="button"
            onClick={onDownload}
            className="p-1 px-2 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-emerald-300 transition flex items-center space-x-1 text-[11px]"
            title="Download file ini ke komputer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Download</span>
          </button>

          {/* Copy Code Button */}
          <button
            type="button"
            onClick={onCopy}
            className="p-1 px-2 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-cyan-300 transition flex items-center space-x-1 text-[11px]"
            title="Salin kode"
          >
            {copied ? (
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
        {content}
      </pre>
    </div>
  );
}

/** Slim bar that lists every file produced during the conversation. */
export function ChatFilesPanel({
  files,
  expanded,
  onToggle,
  onDownload,
  onPreview,
  onDownloadAll,
}: {
  files: ArtifactFile[];
  expanded: boolean;
  onToggle: () => void;
  onDownload: (file: ArtifactFile) => void;
  onPreview: (file: ArtifactFile) => void;
  onDownloadAll: () => void;
}) {
  if (files.length === 0) return null;
  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/40 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center space-x-2 text-xs font-mono text-cyan-300 hover:text-cyan-200 transition"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span className="font-bold">{files.length} file di percakapan ini</span>
          <span className="text-slate-500 text-[10px]">{expanded ? '▲ tutup' : '▼ lihat'}</span>
        </button>

        <button
          type="button"
          onClick={onDownloadAll}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono hover:bg-emerald-500/20 transition active:scale-95"
          title="Simpan semua file percakapan ini sebagai satu .zip"
        >
          <FileArchive className="w-3.5 h-3.5" />
          <span>Download semua (.zip)</span>
        </button>
      </div>

      {expanded && (
        <div className="divide-y divide-white/[0.05] border-t border-white/[0.06] max-h-56 overflow-y-auto">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between gap-2 px-3.5 py-2">
              <div className="flex items-center space-x-2 min-w-0">
                <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-xs font-mono text-slate-200 truncate">{f.name}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-400 uppercase shrink-0">
                  {f.language}
                </span>
                <span className="text-[10px] font-mono text-slate-500 shrink-0">
                  {fileSizeLabel(f.content)}
                </span>
              </div>
              <div className="flex items-center space-x-1 shrink-0">
                {isPreviewable(f.language) && (
                  <button
                    type="button"
                    onClick={() => onPreview(f)}
                    className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-sky-300 transition"
                    title="Preview"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDownload(f)}
                  className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-emerald-300 transition"
                  title="Download"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Full-screen sandboxed preview of a generated HTML/SVG file (like Claude artifacts). */
export function FilePreviewModal({
  file,
  onClose,
  onDownload,
}: {
  file: ArtifactFile;
  onClose: () => void;
  onDownload: (file: ArtifactFile) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-4xl h-[82vh] flex flex-col rounded-2xl border border-white/[0.1] bg-[#07090e] overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.08] bg-black/60">
          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-300 min-w-0">
            <Eye className="w-4 h-4 shrink-0" />
            <span className="font-bold truncate">{file.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-400 uppercase shrink-0">
              {file.language}
            </span>
            <span className="text-[10px] text-slate-500 shrink-0">{fileSizeLabel(file.content)}</span>
          </div>
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onDownload(file)}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-emerald-300 transition"
              title="Download file"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-rose-300 transition"
              title="Tutup preview (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <iframe
          title={`Preview ${file.name}`}
          className="flex-1 w-full bg-white"
          sandbox="allow-scripts allow-modals allow-forms allow-popups"
          srcDoc={file.content}
        />
      </div>
    </div>
  );
}

/** Optional zip name for a set of files: <folder>.zip / <file>.zip / project.zip */
export function zipNameForFiles(files: ArtifactFile[]): string {
  const first = (files[0]?.name || '').trim();
  if (files.length > 1) {
    const seg = first.includes('/') ? first.split('/')[0].trim() : '';
    if (seg && seg !== '.' && seg !== '..' && !seg.includes('\\')) return `${seg}.zip`;
    return 'project.zip';
  }
  const base = first.replace(/\.[^.]+$/, '') || 'file';
  return `${base}.zip`;
}

/**
 * Claude-style attachment row: the answer produced files, so the model "sends"
 * them as a single downloadable .zip.
 */
export function ZipAttachmentCard({
  files,
  onDownload,
}: {
  files: ArtifactFile[];
  onDownload: (files: ArtifactFile[]) => void;
}) {
  if (files.length === 0) return null;
  const zipName = zipNameForFiles(files);
  const totalBytes = files.reduce(
    (sum, f) => sum + new TextEncoder().encode(f.content || '').length,
    0
  );
  const totalLabel =
    totalBytes < 1024
      ? `${totalBytes} B`
      : totalBytes < 1024 * 1024
        ? `${(totalBytes / 1024).toFixed(1)} KB`
        : `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] px-3 py-2">
      <div className="flex items-center space-x-2 min-w-0">
        <span className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
          <FileArchive className="w-4 h-4 text-emerald-300" />
        </span>
        <div className="min-w-0">
          <div className="text-xs font-mono font-bold text-emerald-200 truncate">{zipName}</div>
          <div className="text-[10px] font-mono text-slate-400">
            {files.length} file · {totalLabel}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onDownload(files)}
        className="ml-auto flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-200 text-[11px] font-semibold transition active:scale-95"
        title={`Download ${zipName}`}
      >
        <Download className="w-3.5 h-3.5" />
        <span>Download .zip</span>
      </button>
    </div>
  );
}
