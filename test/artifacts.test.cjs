/**
 * Unit test lib/artifacts.ts + round-trip zip (dijalankan dengan node, bukan jest).
 *   npx tsc lib/artifacts.ts --outDir .ztest --module commonjs --target es2020 --skipLibCheck
 *   node test/artifacts.test.cjs
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const A = require(path.join(__dirname, '..', '.ztest', 'artifacts.js'));
const { buildZip } = require(path.join(__dirname, '..', '.ztest', 'zip.js'));

let passed = 0;
const cases = [];
function test(name, fn) { cases.push([name, fn]); }

// ---------------------------------------------------------------- penamaan file
test('nama dari baris pembuka blok dipakai apa adanya (termasuk folder)', () => {
  const f = A.inferFilePath({ declared: 'src/app.js', language: 'js', content: 'x' });
  assert.strictEqual(f, 'src/app.js');
});

test('nama dari kalimat sebelum blok ("buat file index.html")', () => {
  const f = A.inferFilePath({
    declared: undefined, language: 'html', content: '<div></div>',
    precedingText: 'Pertama buat file index.html dulu ya:\n',
  });
  assert.strictEqual(f, 'index.html');
});

test('nama dari komentar pertama (// server.ts)', () => {
  const f = A.inferFilePath({ language: 'ts', content: '// server.ts\nconst a = 1;' });
  assert.strictEqual(f, 'server.ts');
});

test('tebakan isi: HTML -> index.html, package.json, Dockerfile, styles.css, main.py', () => {
  assert.strictEqual(A.inferFilePath({ language: 'html', content: '<!DOCTYPE html><html></html>' }), 'index.html');
  assert.strictEqual(A.inferFilePath({ language: 'json', content: '{"name":"app","version":"1.0.0","dependencies":{}}' }), 'package.json');
  assert.strictEqual(A.inferFilePath({ language: 'dockerfile', content: 'FROM node:20\nRUN npm install\nCMD ["node","server.js"]' }), 'Dockerfile');
  assert.strictEqual(A.inferFilePath({ language: 'css', content: 'body { margin: 0; }' }), 'styles.css');
  assert.strictEqual(A.inferFilePath({ language: 'python', content: 'import os\n\ndef main():\n    print(1)' }), 'main.py');
});

test('tebakan isi: blok kedua dari jenis sama dapat nomor (data.json -> data-2.json)', () => {
  assert.strictEqual(A.inferFilePath({ language: 'json', content: '{"a":1}', index: 2 }), 'data-2.json');
});

test('README/Makefile/Dockerfile tidak diberi ekstensi asal', () => {
  assert.strictEqual(A.sanitizeFilePath('README', 'md'), 'README.md');
  assert.strictEqual(A.sanitizeFilePath('Makefile', 'txt'), 'Makefile');
  assert.strictEqual(A.sanitizeFilePath('docs/Dockerfile', 'txt'), 'docs/Dockerfile');
});

test('path kotor dibersihkan (../../, backslash, leading slash)', () => {
  assert.strictEqual(A.sanitizeFilePath('/etc/passwd', 'txt'), 'etc/passwd.txt');
  assert.strictEqual(A.sanitizeFilePath('..\\..\\win\\app.py', 'py'), 'win/app.py');
  assert.strictEqual(A.sanitizeFilePath('file: src/App.tsx', 'tsx'), 'src/App.tsx');
});

// ---------------------------------------------------------------- parse satu jawaban
const ANSWER = `Ini projectnya ya:

**index.html**
\`\`\`html
<!DOCTYPE html>
<html><body><script src="app.js"></script></body></html>
\`\`\`

**styles.css**
\`\`\`css
body { background: #111; }
\`\`\`

\`\`\`js src/app.js
console.log('halo');
\`\`\`

Cara jalan: buka index.html.

📦 File: index.html, styles.css, src/app.js`;

test('satu jawaban multi-file menghasilkan file bernama benar', () => {
  const files = A.filesFromMarkdown(ANSWER);
  assert.deepStrictEqual(files.map((f) => f.name), ['index.html', 'styles.css', 'src/app.js']);
});

test('file yang sama dua kali diberi sufiks -2', () => {
  const files = A.filesFromMarkdown('```js app.js\nlet a=1;\n```\n\n```js app.js\nlet a=2;\n```');
  assert.deepStrictEqual(files.map((f) => f.name), ['app.js', 'app-2.js']);
});

// ---------------------------------------------------------------- folder project + zip
test('zip membungkus dalam satu folder project kalau file tidak sefolder', () => {
  const files = A.filesFromMarkdown(ANSWER);
  const entries = A.withProjectRoot(files, 'project');
  assert.deepStrictEqual(entries.map((e) => e.name), ['project/index.html', 'project/styles.css', 'project/src/app.js']);
});

test('file yang sudah satu folder tidak dibungkus dua kali', () => {
  const files = A.filesFromMarkdown('```js src/a.js\nlet a=1;\n```\n\n```js src/b.js\nlet b=2;\n```');
  const entries = A.withProjectRoot(files, 'project');
  assert.deepStrictEqual(entries.map((e) => e.name), ['src/a.js', 'src/b.js']);
});

test('nama zip: folder bersama -> folder.zip, banyak file tanpa folder -> project.zip, satu file -> file.zip', () => {
  assert.strictEqual(A.archiveNameForFiles([{ name: 'src/a.js' }, { name: 'src/b.js' }]), 'src.zip');
  assert.strictEqual(A.archiveNameForFiles([{ name: 'index.html' }, { name: 'app.js' }]), 'project.zip');
  assert.strictEqual(A.archiveNameForFiles([{ name: 'main.py' }]), 'main.zip');
});

test('zip nyata: CRC + struktur folder bisa dibaca unzipper', () => {
  const files = A.filesFromMarkdown(ANSWER);
  const zip = buildZip(A.withProjectRoot(files, 'project'));
  assert.ok(zip.length > 100, 'zip kosong');
  fs.writeFileSync(path.join(__dirname, '..', '.ztest', 'project.zip'), Buffer.from(zip));
});

(async () => {
  for (const [name, fn] of cases) {
    try { await fn(); console.log('  ✓', name); passed++; }
    catch (err) { console.log('  ✗', name, '\n      ', err.message); }
  }
  console.log(`\n${passed}/${cases.length} tes lulus`);
  process.exit(passed === cases.length ? 0 : 1);
})();
