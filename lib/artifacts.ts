/**
 * Project/artifact helpers for the Playground: figure out sensible file names
 * for code the model produced (Claude-style artifacts), and package one answer's
 * files as a download-ready project folder (.zip) the user can extract as-is.
 *
 * Dependency-free on purpose: the same functions run in the browser (Playground)
 * and in Node unit tests.
 */

export interface ArtifactFileLike {
  name: string;
  language: string;
  content: string;
}

const EXT_BY_LANGUAGE: Record<string, string> = {
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

export function extensionForLanguage(language: string): string {
  const key = (language || '').toLowerCase().trim();
  return EXT_BY_LANGUAGE[key] || (key.length > 0 && key.length <= 6 ? key : 'txt');
}

const SPECIAL_FILE_NAMES: Record<string, string> = {
  readme: 'README.md',
  license: 'LICENSE',
  licence: 'LICENSE',
  makefile: 'Makefile',
  dockerfile: 'Dockerfile',
  procfile: 'Procfile',
  'gitignore': '.gitignore',
  npmrc: '.npmrc',
  env: '.env',
};

const KNOWN_FILE_RE = /(?:^|[\s`'"(\[*:])([A-Za-z0-9_.\-\/]+\.[A-Za-z0-9]{1,8})(?=[\s`'")\]:,*.]|$)/;

/** Normalises a path that came from the model: no leading slashes, no "..", forward slashes. */
export function sanitizeFilePath(raw: string, fallbackExt = 'txt'): string {
  let name = String(raw || '')
    .trim()
    .replace(/^```[a-z0-9+#-]*\s*/i, '')
    .replace(/\\/g, '/')
    .replace(/^[./]+/, '')
    .replace(/\/{2,}/g, '/');

  // Strip wrapping quotes/backticks and any leading "file:"/"filename:" decorations.
  name = name.replace(/^[`'"*_\s]+|[`'"*_\s]+$/g, '').replace(/^(?:file|filename)\s*[:=]\s*/i, '');

  const segments = name
    .split('/')
    .filter((seg) => seg && seg !== '.' && seg !== '..')
    .map((seg) => seg.replace(/[^A-Za-z0-9_.\- ]+/g, '').trim())
    .filter(Boolean);

  name = segments.join('/');
  if (!name) return '';
  const last = name.split('/').pop() || '';
  const special = SPECIAL_FILE_NAMES[last.toLowerCase()];
  if (special) {
    name = name.includes('/') ? `${name.slice(0, name.length - last.length)}${special}` : special;
  } else if (!/\.[A-Za-z0-9]{1,8}$/.test(name)) {
    name = `${name}.${fallbackExt}`;
  }
  return name.slice(0, 160);
}

/** Looks for a file name mentioned in the sentence right before the code block. */
function filenameFromProse(prose: string): string | undefined {
  const tail = (prose || '').slice(-320);
  if (!tail.trim()) return undefined;
  const matches = tail.match(new RegExp(KNOWN_FILE_RE.source, 'g')) || [];
  for (let i = matches.length - 1; i >= 0; i--) {
    const cleaned = sanitizeFilePath(matches[i]);
    if (cleaned) return cleaned;
  }
  return undefined;
}

/** Looks at the first lines of the code for `# app.py`, `// index.js`, `<!-- x.html -->`. */
function filenameFromFirstComment(code: string): string | undefined {
  const head = (code || '').split('\n').slice(0, 3).join('\n');
  const m = head.match(/^\s*(?:#|\/\/|\/\*|<!--|--)\s*([A-Za-z0-9_.\-\/]+\.[A-Za-z0-9]{1,8})/);
  return m ? sanitizeFilePath(m[1]) : undefined;
}

/** Content sniffing — the model forgot to name the file; guess like a human would. */
export function filenameFromContent(language: string, code: string, index = 1): string {
  const lang = (language || '').toLowerCase();
  const body = (code || '').trim();
  const head = body.slice(0, 400);
  const ext = extensionForLanguage(lang);
  const numbered = (base: string, extension: string) =>
    index > 1 ? `${base}-${index}.${extension}` : `${base}.${extension}`;

  if (/^<!doctype html/i.test(head) || /^<html[\s>]/i.test(head)) return numbered('index', 'html');
  if (/^<svg[\s>]/i.test(head)) return numbered('icon', 'svg');
  if (lang === 'json' || /^\s*[{[]/.test(head)) {
    if (/"dependencies"|"devDependencies"|"scripts"\s*:/.test(head)) return 'package.json';
    if (/"compilerOptions"|"extends"\s*:\s*"/.test(head)) return 'tsconfig.json';
    if (/"name"\s*:/.test(head) && /"version"\s*:/.test(head)) return 'package.json';
    return numbered('data', 'json');
  }
  if (/^\s*FROM\s+\S+/im.test(head) && /(RUN|CMD|COPY)\s/i.test(head)) return 'Dockerfile';
  if (/^\s*(services|version)\s*:/m.test(head) && /image\s*:/.test(head)) return 'docker-compose.yml';
  if (/^\s*(#\s*)?database\s*:/i.test(head) || /^\s*DB_/m.test(head)) return 'config.yaml';
  if (/^\s*(CREATE|INSERT|ALTER)\s+(TABLE|INTO)/i.test(head)) return numbered('schema', 'sql');
  if (/^#\s+\S/.test(head) && (lang === 'md' || lang === 'markdown')) return 'README.md';
  if (/^\s*(npm|yarn|pnpm|pip|python3?|uvicorn|docker)\s/m.test(head) && (lang === 'sh' || lang === 'bash' || !lang))
    return 'setup.sh';
  if (/^\s*(def|class|import|from)\s/m.test(head) && lang.startsWith('py')) return numbered('main', 'py');
  if (/^\s*(package|module)\s+\w+/m.test(head) && lang === 'go') return 'main.go';
  if (/^\s*(fn|pub fn|use)\s/m.test(head) && lang === 'rs') return 'main.rs';
  if (lang === 'tsx' || /(import React|from 'react'|from "react")/.test(head)) return numbered('App', 'jsx');
  if (lang === 'js' || lang === 'javascript') {
    if (/module\.exports|require\(/.test(head)) return numbered('index', 'js');
    return numbered('app', 'js');
  }
  if (lang === 'ts' || lang === 'typescript') {
    if (/(interface|type)\s+\w+/.test(head) && !/function|=>/.test(head)) return numbered('types', 'ts');
    return numbered('index', 'ts');
  }
  if (lang === 'css') return numbered('styles', 'css');
  if (lang === 'scss') return numbered('styles', 'scss');
  if (lang === 'yaml' || lang === 'yml') return numbered('config', 'yaml');
  if (lang === 'toml') return 'config.toml';
  if (lang === 'env' || /^[A-Z0-9_]+=.+$/m.test(head)) return '.env';
  if (lang === 'html') return numbered('index', 'html');
  if (lang === 'xml') return numbered('data', 'xml');
  if (lang === 'sql') return numbered('query', 'sql');
  if (lang === 'md' || lang === 'markdown') return 'README.md';
  if (lang === 'dockerfile') return 'Dockerfile';
  return numbered('file', ext);
}

/** The full priority chain used for every code block. */
export function inferFilePath(opts: {
  declared?: string;
  language?: string;
  content: string;
  precedingText?: string;
  index?: number;
}): string {
  const language = opts.language || 'code';
  const ext = extensionForLanguage(language);
  const index = Math.max(1, opts.index || 1);

  const declared = sanitizeFilePath(opts.declared || '', ext);
  if (declared) return declared;

  const fromProse = filenameFromProse(opts.precedingText || '');
  if (fromProse) return fromProse;

  const fromComment = filenameFromFirstComment(opts.content);
  if (fromComment) return fromComment;

  return filenameFromContent(language, opts.content, index);
}

/** True when the files already share one top-level folder (so no extra root is needed). */
export function commonRootFolder(files: ArtifactFileLike[]): string | null {
  const withPath = files.filter((f) => f.name.includes('/'));
  if (withPath.length !== files.length || files.length === 0) return null;
  const first = files[0].name.split('/')[0];
  return files.every((f) => f.name.split('/')[0] === first) ? first : null;
}

/** A project zip should extract into a folder, not scatter files into the download dir. */
export function withProjectRoot(
  files: ArtifactFileLike[],
  rootName: string
): Array<{ name: string; content: string }> {
  if (files.length === 0) return [];
  const root = sanitizeFilePath(rootName, 'txt').replace(/\.[A-Za-z0-9]+$/, '') || 'project';
  const rootFolder = commonRootFolder(files) || root;
  const alreadyRooted = commonRootFolder(files);
  return files.map((f) => ({
    name: alreadyRooted ? f.name : `${rootFolder}/${f.name}`,
    content: f.content,
  }));
}

/** Download name for a set of files: <folder>.zip / <file>.zip / project.zip */
export function archiveNameForFiles(files: ArtifactFileLike[]): string {
  const first = (files[0]?.name || '').trim();
  if (files.length > 1) {
    const folder = commonRootFolder(files);
    if (folder) return `${folder}.zip`;
    return 'project.zip';
  }
  const stem = first.replace(/\.[^.]+$/, '') || 'file';
  return `${stem}.zip`;
}

/**
 * Same fence parsing the Playground renders with, but collected into files —
 * used by tests and by any surface that only needs the artifact list.
 */
export function filesFromMarkdown(text: string): ArtifactFileLike[] {
  const out: ArtifactFileLike[] = [];
  const re = /```(\w+)?(?:\s+(?:file=|filename=)?["']?([^\s"'\n]+)["']?)?\n([\s\S]*?)```/g;
  const seen = new Map<string, number>();
  let match: RegExpExecArray | null;
  let index = 0;
  let cursor = 0; // akhir blok sebelumnya — prosa hanya dihitung dari sini
  while ((match = re.exec(text)) !== null) {
    const language = match[1] || 'code';
    const body = match[3];
    if (!body || !body.trim()) {
      cursor = match.index + match[0].length;
      continue;
    }
    index++;
    const precedingText = text.slice(cursor, match.index);
    cursor = match.index + match[0].length;
    let name = inferFilePath({
      declared: match[2],
      language,
      content: body,
      precedingText,
      index: 1,
    });
    const count = (seen.get(name) || 0) + 1;
    seen.set(name, count);
    if (count > 1) {
      const dot = name.lastIndexOf('.');
      name = dot > 0 ? `${name.slice(0, dot)}-${count}${name.slice(dot)}` : `${name}-${count}`;
    }
    out.push({ name, language, content: body });
  }
  return out;
}
