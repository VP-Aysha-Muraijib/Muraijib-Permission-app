import { describe, expect, it } from 'vitest';
import { buildFromRows } from '@/lib/import/build';
import { suggestMapping, missingRequired } from '@/lib/import/map';
import { runHealthCheck } from '@/lib/engine/conflicts';

const HEADERS = ['اليوم', 'الحصة', 'الشعبة', 'المادة', 'المعلمة'];
const OPTIONS = { yearLabel: '2026–2027', schoolNameAr: 'مدرسة مريجب', assemblyFirst: true, breakAfter: 3 };

const rows = (extra: string[][] = []) => [
  ['الأحد', '1', '6/1', 'اللغة العربية', 'أ. سارة'],
  ['الأحد', '2', '6/1', 'الرياضيات', 'أ. هدى'],
  ['الاثنين', '1', '6/1', 'اللغة العربية', 'أ. سارة'],
  ['الأحد', '1', '6/2', 'الرياضيات', 'أ. هدى'],
  ...extra,
];

describe('مطابقة الأعمدة', () => {
  it('تقترح المطابقة من عناوين عربية شائعة', () => {
    const mapping = suggestMapping(HEADERS);
    expect(mapping.day).toBe(0);
    expect(mapping.period).toBe(1);
    expect(mapping.section).toBe(2);
    expect(mapping.subject).toBe(3);
    expect(mapping.teacher).toBe(4);
    expect(missingRequired(mapping)).toHaveLength(0);
  });

  it('تبلّغ عن الحقول المطلوبة الناقصة بدل التخمين', () => {
    const mapping = suggestMapping(['اليوم', 'المادة']);
    expect(missingRequired(mapping).map((f) => f.id).sort()).toEqual(['period', 'section', 'teacher']);
  });
});

describe('بناء الجدول المستورد', () => {
  const mapping = suggestMapping(HEADERS);

  it('يستخرج الكيانات من الجدول نفسه', () => {
    const { snapshot, report } = buildFromRows(rows(), mapping, OPTIONS);
    expect(snapshot).not.toBeNull();
    expect(report.recognized.teachers.sort()).toEqual(['أ. سارة', 'أ. هدى']);
    expect([...report.recognized.subjects].sort()).toEqual(['الرياضيات', 'اللغة العربية']);
    expect(report.recognized.sections.sort()).toEqual(['6/1', '6/2']);
    expect(report.acceptedRows).toBe(4);
  });

  it('يرفض التعارض بدل استيراده بصمت', () => {
    // المعلمة نفسها في شعبتين في الوقت نفسه
    const { report } = buildFromRows(
      rows([['الأحد', '1', '6/3', 'الرياضيات', 'أ. هدى']]),
      mapping,
      OPTIONS,
    );
    expect(report.conflicts.length).toBeGreaterThan(0);
    expect(report.rejectedRows).toBe(1);
    expect(report.issues.some((i) => i.severity === 'error' && i.messageAr.includes('تعارض'))).toBe(true);
  });

  it('يكشف الصف المكرر حرفيًا', () => {
    const { report } = buildFromRows(
      rows([['الأحد', '1', '6/1', 'اللغة العربية', 'أ. سارة']]),
      mapping,
      OPTIONS,
    );
    expect(report.duplicates.length).toBe(1);
  });

  it('يرفض اليوم غير المفهوم ويذكر رقم صفه', () => {
    const { report } = buildFromRows([['يوم غير معروف', '1', '6/1', 'العلوم', 'أ. سارة']], mapping, OPTIONS);
    expect(report.issues[0].severity).toBe('error');
    expect(report.issues[0].rowNumber).toBe(2);
  });

  it('يستورد الحصة بلا معلمة كتحذير لا كخطأ', () => {
    const { snapshot, report } = buildFromRows([['الأحد', '1', '6/1', 'العلوم', '']], mapping, OPTIONS);
    expect(report.acceptedRows).toBe(1);
    expect(report.issues[0].severity).toBe('warning');
    expect(snapshot!.lessons[0].teacherId).toBeNull();
  });

  it('الجدول الناتج يمرّ بفحص الصحة بلا تعارضات', () => {
    const { snapshot } = buildFromRows(rows(), mapping, OPTIONS);
    const health = runHealthCheck(snapshot!);
    expect(health.totals.teacherConflicts).toBe(0);
    expect(health.totals.sectionConflicts).toBe(0);
    expect(health.totals.blocking).toBe(0);
  });

  it('يستنتج خطة المواد من عدد الحصص الفعلي', () => {
    const { snapshot } = buildFromRows(rows(), mapping, OPTIONS);
    const arabic = snapshot!.subjects.find((s) => s.nameAr === 'اللغة العربية')!;
    const entry = snapshot!.curriculum.find((c) => c.subjectId === arabic.id)!;
    expect(entry.weeklyLessons).toBe(2);
  });

  it('يضع الطابور والفسحة في الفترات لا في الحصص', () => {
    const { snapshot } = buildFromRows(rows(), mapping, OPTIONS);
    const day = snapshot!.week.days[0];
    expect(day.periods[0].kind).toBe('assembly');
    expect(snapshot!.lessons.every((l) => l.periodIndex > 1)).toBe(true);
  });
});
