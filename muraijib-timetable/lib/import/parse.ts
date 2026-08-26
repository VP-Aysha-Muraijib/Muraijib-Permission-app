'use client';

/**
 * قراءة الملفات المرفوعة.
 *
 * الملف يُقرأ ويُعرض ويُراجَع — ولا يُكتب منه شيء إلا بعد اعتماد صريح.
 */

export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: string[][];
}

export interface ParsedFile {
  fileName: string;
  sheets: ParsedSheet[];
}

const clean = (value: unknown) =>
  String(value ?? '')
    .replace(/‏|‎/g, '')
    .trim();

export async function parseFile(file: File): Promise<ParsedFile> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const book = XLSX.read(buffer, { type: 'array', cellDates: false, raw: false });

  const sheets: ParsedSheet[] = book.SheetNames.map((name) => {
    const grid = XLSX.utils.sheet_to_json<string[]>(book.Sheets[name], {
      header: 1,
      blankrows: false,
      defval: '',
    });

    const matrix = grid.map((row) => row.map(clean));
    // صف العناوين ليس دائمًا الأول: تُتخطّى صفوف الترويسة والشعارات الفارغة.
    const headerIndex = matrix.findIndex((row) => row.filter(Boolean).length >= 3);
    if (headerIndex === -1) return { name, headers: [], rows: [] };

    const headers = matrix[headerIndex];
    const rows = matrix
      .slice(headerIndex + 1)
      .filter((row) => row.some((cell) => cell.length > 0));

    return { name, headers, rows };
  });

  return { fileName: file.name, sheets };
}

/** قالب الاستيراد — يمنع نصف مشاكل الاستيراد قبل حدوثها. */
export async function downloadImportTemplate() {
  const XLSX = await import('xlsx');
  const rows = [
    ['اليوم', 'الحصة', 'الصف', 'الشعبة', 'المادة', 'المعلمة', 'الغرفة'],
    ['الأحد', '1', '6', '1', 'اللغة العربية', 'اسم المعلمة', ''],
    ['الأحد', '2', '6', '1', 'الرياضيات', 'اسم المعلمة', ''],
    ['الاثنين', '1', '6', '1', 'العلوم', 'اسم المعلمة', 'مختبر العلوم'],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const book = XLSX.utils.book_new();
  book.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(book, sheet, 'الجدول');

  const buffer = XLSX.write(book, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'قالب-استيراد-الجدول.xlsx';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
