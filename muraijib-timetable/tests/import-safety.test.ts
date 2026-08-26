import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

/**
 * حارس أمني على طريقة قراءة الملفات.
 *
 * نسخة xlsx المتاحة على npm (0.18.5) عليها تنبيهان أمنيان معلنان: تلويث النموذج
 * الأولي (Prototype Pollution) وبطء تنظيمي (ReDoS). المنظومة تقرأ ملفات يرفعها
 * المستخدم، فالطريقة التي تُقرأ بها ليست تفصيلًا.
 *
 * lib/import/parse.ts يستخدم `{ header: 1 }` عمدًا: المخرجات مصفوفات، فلا يتحوّل
 * أي عنوان عمود قادم من الملف إلى مفتاح كائن. هذا الاختبار يثبّت هذا القرار
 * حتى لا يُلغى لاحقًا بحسن نية.
 */
describe('سلامة قراءة الملفات المرفوعة', () => {
  const build = () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['__proto__', 'constructor', 'polluted'],
      ['{"polluted":true}', 'x', 'yes'],
    ]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'S');
    return XLSX.read(XLSX.write(book, { bookType: 'xlsx', type: 'buffer' }), { type: 'buffer' });
  };

  it('القراءة بـ header:1 تعيد مصفوفات، فلا تصبح عناوين الملف مفاتيح كائنات', () => {
    const parsed = build();
    const rows = XLSX.utils.sheet_to_json<string[]>(parsed.Sheets.S, { header: 1, defval: '' });
    expect(Array.isArray(rows[0])).toBe(true);
    expect(rows[0]).toEqual(['__proto__', 'constructor', 'polluted']);
  });

  it('لا يتلوّث Object.prototype بعد قراءة ملف يحمل مفاتيح خطرة', () => {
    build();
    const parsed = build();
    XLSX.utils.sheet_to_json(parsed.Sheets.S, { header: 1, defval: '' });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('محلّل المشروع يمرّر header:1 فعلًا', async () => {
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile('lib/import/parse.ts', 'utf8'),
    );
    expect(source).toContain('header: 1');
    // القراءة الافتراضية (بلا header) تفهرس بعناوين الملف — ممنوعة هنا.
    expect(source).not.toMatch(/sheet_to_json\([^)]*\)\s*;(?![\s\S]*header)/);
  });
});
