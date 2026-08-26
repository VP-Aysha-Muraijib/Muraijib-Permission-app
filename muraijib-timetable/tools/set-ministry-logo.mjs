#!/usr/bin/env node
/**
 * تركيب شعار الوزارة الرسمي.
 *
 *   node tools/set-ministry-logo.mjs <مسار الملف>
 *
 * يأخذ ملف الشعار الرسمي كما هو — PNG أو SVG — وينسخه إلى `public/brand/`
 * ويولّد منه `lib/brand-logo.ts` بصيغة data URI، فيظهر في ترويسة كل ورقة
 * مطبوعة وفي الملف المستقل معًا دون طلب شبكة عند الطباعة.
 *
 * لا يُعاد رسم الشعار ولا تُعدَّل ألوانه ولا يُعاد تركيبه: يُنقل كما ورد.
 * البتات الوحيدة التي تتغيّر هي ترميز base64.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MIME = {
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

const source = process.argv[2];
if (!source) {
  console.error('الاستعمال: node tools/set-ministry-logo.mjs <مسار ملف الشعار>');
  process.exit(1);
}
if (!fs.existsSync(source)) {
  console.error(`لا يوجد ملف على المسار: ${source}`);
  process.exit(1);
}

const ext = path.extname(source).toLowerCase();
const mime = MIME[ext];
if (!mime) {
  console.error(`صيغة غير مدعومة: ${ext} — المدعوم: ${Object.keys(MIME).join('، ')}`);
  process.exit(1);
}

const bytes = fs.readFileSync(source);

/* الشعار يُضمَّن في كل ورقة، فحجمه يدخل في حجم الملف المستقل. */
const KB = bytes.length / 1024;
if (KB > 400) {
  console.error(
    `حجم الملف ${KB.toFixed(0)} كيلوبايت — كبير على التضمين.\n` +
      'صغّر أبعاده أو صدّره PNG مضغوطًا (ارتفاع 200 بكسل يكفي للطباعة).',
  );
  process.exit(1);
}

const target = path.join(ROOT, 'public/brand', `ministry-logo${ext}`);
fs.mkdirSync(path.dirname(target), { recursive: true });
/* الصيغة قد تتغيّر عن الشعار السابق، فتُزال النسخ القديمة حتى لا يبقى ملفّان. */
for (const old of fs.readdirSync(path.dirname(target))) {
  if (old.startsWith('ministry-logo') && old !== path.basename(target)) {
    fs.unlinkSync(path.join(path.dirname(target), old));
  }
}
fs.writeFileSync(target, bytes);

const module = `/**
 * شعار وزارة التربية والتعليم المعتمد.
 *
 * منقول كما هو من الملف الرسمي بلا إعادة رسم ولا تعديل ألوان ولا إعادة
 * تركيب. مُضمَّن بصيغة data URI ليعمل في نسخة الويب وفي الملف المستقل ذي
 * الصفحة الواحدة معًا، دون الاعتماد على طلب شبكة عند الطباعة.
 *
 * لا يُحرَّر هذا الملف يدويًا — يُولَّد بـ:
 *   node tools/set-ministry-logo.mjs <مسار الملف>
 */

export const MINISTRY_LOGO_DATA_URI =
  'data:${mime};base64,${bytes.toString('base64')}';
`;

fs.writeFileSync(path.join(ROOT, 'lib/brand-logo.ts'), module, 'utf8');

console.log(`✓ ${path.relative(ROOT, target)} — ${KB.toFixed(0)} كيلوبايت`);
console.log('✓ lib/brand-logo.ts');
console.log('أعد البناء: npx next build && node standalone/build.mjs');
