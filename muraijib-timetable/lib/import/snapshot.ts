/**
 * استيراد لقطة جدول جاهزة (JSON).
 *
 * مسار مستقل عن معالج الأعمدة: يُستخدم عندما تكون البيانات مُعدّة مسبقًا
 * (تحويل من نظام آخر مثلًا) فتصل كاملةً بأسمائها العربية وأنصبتها وقيودها
 * دون فقدان ما لا يعبّر عنه جدول مسطّح: الحصص المزدوجة، والتمييز داخل المادة،
 * واختلاف الفترات بين الأيام.
 *
 * القاعدة نفسها: يُفحص الملف ويُعرض تقرير قبل أي كتابة.
 */

import type { ScheduleSnapshot } from '@/lib/domain/types';
import { runHealthCheck } from '@/lib/engine/conflicts';
import type { ImportIssue, ImportReport } from './build';

const isArray = (v: unknown): v is unknown[] => Array.isArray(v);

/** فحص بنيوي صريح: رسالة عربية محدّدة لكل نقص، لا "ملف غير صالح". */
export function validateSnapshotFile(raw: unknown): {
  snapshot: ScheduleSnapshot | null;
  report: ImportReport;
} {
  const issues: ImportIssue[] = [];
  const fail = (messageAr: string) => issues.push({ rowNumber: 0, severity: 'error', messageAr });

  const empty: ImportReport = {
    totalRows: 0,
    acceptedRows: 0,
    rejectedRows: 0,
    issues,
    recognized: {
      teachers: [], subjects: [], grades: [], sections: [],
      days: [], periodsPerDay: {}, rooms: [],
    },
    duplicates: [],
    conflicts: [],
  };

  if (!raw || typeof raw !== 'object') {
    fail('الملف لا يحتوي كائن بيانات. المتوقع ملف JSON بلقطة جدول كاملة.');
    return { snapshot: null, report: empty };
  }

  const s = raw as Partial<ScheduleSnapshot>;
  const required: Array<[keyof ScheduleSnapshot, string]> = [
    ['week', 'أسبوع الدراسة'],
    ['teachers', 'المعلمات'],
    ['subjects', 'المواد'],
    ['grades', 'الصفوف'],
    ['sections', 'الشعب'],
    ['curriculum', 'خطة المواد'],
    ['lessons', 'الحصص'],
  ];
  for (const [key, labelAr] of required) {
    if (s[key] === undefined) fail(`الملف ينقصه قسم «${labelAr}» (${String(key)}).`);
  }
  if (issues.length > 0) return { snapshot: null, report: empty };

  if (!s.week?.days || !isArray(s.week.days) || s.week.days.length === 0) {
    fail('أسبوع الدراسة بلا أيام.');
  }
  for (const key of ['teachers', 'subjects', 'grades', 'sections', 'lessons'] as const) {
    if (!isArray(s[key])) fail(`القسم «${key}» يجب أن يكون قائمة.`);
  }
  if (issues.length > 0) return { snapshot: null, report: empty };

  const snapshot: ScheduleSnapshot = {
    versionId: 'imported',
    week: s.week!,
    departments: s.departments ?? [],
    subjects: s.subjects!,
    teachers: s.teachers!,
    grades: s.grades!,
    sections: s.sections!,
    curriculum: s.curriculum!,
    rooms: s.rooms ?? [],
    lessons: s.lessons!,
    locks: s.locks ?? [],
  };

  // مراجع الحصص: حصة تشير إلى شعبة أو مادة غير موجودة تكسر المحرك بصمت.
  const sectionIds = new Set(snapshot.sections.map((x) => x.id));
  const subjectIds = new Set(snapshot.subjects.map((x) => x.id));
  const teacherIds = new Set(snapshot.teachers.map((x) => x.id));
  const dayIds = new Set(snapshot.week.days.map((d) => d.id));

  let broken = 0;
  for (const lesson of snapshot.lessons) {
    const problems: string[] = [];
    if (!sectionIds.has(lesson.sectionId)) problems.push(`شعبة «${lesson.sectionId}»`);
    if (!subjectIds.has(lesson.subjectId)) problems.push(`مادة «${lesson.subjectId}»`);
    if (lesson.teacherId && !teacherIds.has(lesson.teacherId)) problems.push(`معلمة «${lesson.teacherId}»`);
    if (!dayIds.has(lesson.dayId)) problems.push(`يوم «${lesson.dayId}»`);
    if (problems.length === 0) continue;
    broken += 1;
    if (broken <= 20) {
      issues.push({
        rowNumber: 0,
        severity: 'error',
        messageAr: `حصة «${lesson.id}» تشير إلى ${problems.join(' و')} غير موجودة في الملف.`,
      });
    }
  }
  if (broken > 20) {
    issues.push({ rowNumber: 0, severity: 'error', messageAr: `و${broken - 20} حصة أخرى بمراجع مكسورة.` });
  }

  const health = runHealthCheck(snapshot);
  for (const group of health.groups) {
    if (group.severity !== 'critical') continue;
    issues.push({
      rowNumber: 0,
      severity: 'warning',
      messageAr: `${group.labelAr}: ${group.count} — ${group.violations[0].messageAr}`,
    });
  }

  const report: ImportReport = {
    totalRows: snapshot.lessons.length,
    acceptedRows: broken === 0 ? snapshot.lessons.length : 0,
    rejectedRows: broken,
    issues,
    recognized: {
      teachers: snapshot.teachers.map((t) => t.nameAr),
      subjects: snapshot.subjects.map((x) => x.nameAr),
      grades: snapshot.grades.map((g) => g.nameAr),
      sections: snapshot.sections.map((x) => x.label),
      days: snapshot.week.days.filter((d) => d.isTeaching).map((d) => d.nameAr),
      periodsPerDay: Object.fromEntries(
        snapshot.week.days
          .filter((d) => d.isTeaching)
          .map((d) => [d.nameAr, d.periods.filter((p) => p.kind === 'lesson').length]),
      ),
      rooms: snapshot.rooms.map((r) => r.nameAr),
    },
    duplicates: [],
    conflicts: health.groups
      .filter((g) => g.severity === 'critical')
      .flatMap((g) => g.violations.map((v) => v.messageAr)),
  };

  return { snapshot: broken === 0 ? snapshot : null, report };
}
