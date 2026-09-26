/**
 * Static-render checks for the Claude-style attachment card (no browser needed).
 * Run:
 *   npx tsc test/render-zip.tsx --outDir .ztest-ui --jsx react-jsx --module commonjs \
 *     --target es2022 --skipLibCheck --esModuleInterop --moduleResolution node \
 *     --lib es2022,dom && node .ztest-ui/test/render-zip.js
 */
import assert from 'assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ZipAttachmentCard, zipNameForFiles, type ArtifactFile } from '../components/FileCards';

const project: ArtifactFile[] = [
  { name: 'src/app.js', language: 'js', content: 'console.log(1);' },
  { name: 'src/style.css', language: 'css', content: 'body{}' },
];

// Zip name rules
assert.strictEqual(zipNameForFiles(project), 'src.zip', 'folder name wins for projects');
assert.strictEqual(
  zipNameForFiles([{ name: 'index.html', language: 'html', content: '<h1/>' }]),
  'index.zip',
  'single file -> its own name'
);
assert.strictEqual(
  zipNameForFiles([
    { name: 'a.py', language: 'python', content: 'x' },
    { name: 'b.py', language: 'python', content: 'y' },
  ]),
  'project.zip',
  'flat multiple files -> project.zip'
);

// The card itself
const html = renderToStaticMarkup(
  React.createElement(ZipAttachmentCard, { files: project, onDownload: () => {} })
);
assert.ok(html.includes('src.zip'), 'shows the zip name');
assert.ok(html.includes('Download .zip'), 'has a download button');
assert.ok(html.includes('2 file'), 'shows file count');

// Empty file list renders nothing
const empty = renderToStaticMarkup(
  React.createElement(ZipAttachmentCard, { files: [], onDownload: () => {} })
);
assert.strictEqual(empty, '', 'no files -> no card');

console.log('ZIP ATTACHMENT RENDER TESTS PASSED');
console.log('--- sample markup (trimmed) ---');
console.log(html.slice(0, 320));
