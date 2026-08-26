/**
 * بناء نسخة أحادية الملف: كل شيء مضمَّن (JS + CSS) في صفحة HTML واحدة،
 * فلا تحتاج خادمًا ولا تثبيتًا ولا اتصالًا بأي مضيف خارجي عدا خطوط Google.
 */
import * as esbuild from 'esbuild';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'standalone/dist');
fs.mkdirSync(out, { recursive: true });

/** استبدال وحدات Next.js ببدائل التجزئة، ومنع دخول أي شيء من الإطار إلى الحزمة. */
const nextShims = {
  name: 'next-shims',
  setup(build) {
    build.onResolve({ filter: /^next\/link$/ }, () => ({
      path: path.join(root, 'standalone/shims/link.tsx'),
    }));
    build.onResolve({ filter: /^next\/navigation$/ }, () => ({
      path: path.join(root, 'standalone/shims/navigation.tsx'),
    }));
  },
};

console.log('① بناء JavaScript…');
const result = await esbuild.build({
  entryPoints: ['standalone/main.tsx'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  jsx: 'automatic',
  platform: 'browser',
  write: false,
  legalComments: 'none',
  plugins: [nextShims],
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.NEXT_PUBLIC_DATA_MODE': '"local"',
  },
  loader: { '.tsx': 'tsx', '.ts': 'ts' },
  alias: { '@': root },
});
const js = result.outputFiles[0].text;
console.log(`   ${(js.length / 1024).toFixed(0)} كيلوبايت`);

console.log('② بناء CSS…');
execFileSync(
  'npx',
  ['tailwindcss', '-i', 'app/globals.css', '-o', 'standalone/dist/app.css', '--minify'],
  { stdio: 'inherit' },
);
const css = fs.readFileSync(path.join(out, 'app.css'), 'utf8');
console.log(`   ${(css.length / 1024).toFixed(0)} كيلوبايت`);

console.log('③ تجميع الصفحة…');
const html = `<meta charset="utf-8">
<title>منظومة مريجب الذكية</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
<style>${css}
:root { --font-arabic-loaded: 'Tajawal'; --font-arabic: 'Tajawal', system-ui, sans-serif; }
html { direction: rtl; }
</style>
<div id="app" dir="rtl" lang="ar"></div>
<script>${js}</script>`;

const file = path.join(out, 'muraijib-timetable.html');
fs.writeFileSync(file, html);
console.log(`✓ ${file} — ${(html.length / 1024 / 1024).toFixed(2)} ميغابايت`);
