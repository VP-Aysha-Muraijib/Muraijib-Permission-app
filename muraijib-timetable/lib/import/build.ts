/**
 * بناء الجدول المرجعي من الملف المستورد + تقرير تدقيق البيانات.
 *
 * القاعدة الحاكمة: لا يُستورد صف خاطئ بصمت. كل صف مرفوض يُذكر برقمه وسببه،
 * ويُعرض التقرير كاملًا قبل أي كتابة.
 */

import type {
  CurriculumEntry,
  Grade,
  Lesson,
  Period,
  ScheduleSnapshot,
  SchoolDay,
  Section,
  Subject,
  Teacher,
} from '@/lib/domain/types';
import { normalizeAr } from '@/lib/utils';
import type { ColumnMapping } from './map';

export interface ImportIssue {
  /** رقم الصف كما يراه المستخدم في الملف (يشمل صف العناوين). */
  rowNumber: number;
  severity: 'error' | 'warning';
  messageAr: string;
}

export interface ImportReport {
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  issues: ImportIssue[];
  recognized: {
    teachers: string[];
    subjects: string[];
    grades: string[];
    sections: string[];
    days: string[];
    periodsPerDay: Record<string, number>;
    rooms: string[];
  };
  duplicates: string[];
  conflicts: string[];
}

export interface ImportResult {
  snapshot: ScheduleSnapshot | null;
  report: ImportReport;
}

const DAY_ORDER: Array<{ nameAr: string; weekday: number; aliases: string[] }> = [
  { nameAr: 'الأحد', weekday: 0, aliases: ['الاحد', 'احد', 'sunday', 'sun'] },
  { nameAr: 'الاثنين', weekday: 1, aliases: ['الاثنين', 'اثنين', 'الإثنين', 'monday', 'mon'] },
  { nameAr: 'الثلاثاء', weekday: 2, aliases: ['الثلاثاء', 'ثلاثاء', 'tuesday', 'tue'] },
  { nameAr: 'الأربعاء', weekday: 3, aliases: ['الاربعاء', 'اربعاء', 'wednesday', 'wed'] },
  { nameAr: 'الخميس', weekday: 4, aliases: ['الخميس', 'خميس', 'thursday', 'thu'] },
  { nameAr: 'الجمعة', weekday: 5, aliases: ['الجمعه', 'جمعه', 'friday', 'fri'] },
  { nameAr: 'السبت', weekday: 6, aliases: ['السبت', 'سبت', 'saturday', 'sat'] },
];

const AR_DIGITS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};
const digits = (text: string) => text.replace(/[٠-٩]/g, (d) => AR_DIGITS[d] ?? d);

function matchDay(value: string) {
  const normalized = normalizeAr(value);
  return DAY_ORDER.find((day) => day.aliases.some((alias) => normalized.includes(normalizeAr(alias))));
}

const PALETTE = ['#8b5a3c', '#4b7a52', '#2f6f8f', '#2c5f9e', '#2e6b52', '#8a6a2f', '#6b5b8f', '#a05a7a', '#3f7f6f', '#7a6a5a'];
const slug = (prefix: string, key: string, registry: Map<string, string>) => {
  const existing = registry.get(key);
  if (existing) return existing;
  const id = `${prefix}${registry.size + 1}`;
  registry.set(key, id);
  return id;
};

export interface BuildOptions {
  yearLabel: string;
  schoolNameAr: string;
  /** أول فترة في كل يوم مخصّصة للطابور، كما هو معتاد في المدارس. */
  assemblyFirst: boolean;
  /** رقم الحصة التي تليها الفسحة (0 = بلا فسحة). */
  breakAfter: number;
}

export function buildFromRows(
  rows: string[][],
  mapping: ColumnMapping,
  options: BuildOptions,
): ImportResult {
  const issues: ImportIssue[] = [];
  const get = (row: string[], field: keyof ColumnMapping) => {
    const index = mapping[field];
    return index === undefined ? '' : (row[index] ?? '').trim();
  };

  const teacherIds = new Map<string, string>();
  const subjectIds = new Map<string, string>();
  const gradeIds = new Map<string, string>();
  const sectionIds = new Map<string, string>();
  const roomIds = new Map<string, string>();

  const teacherNames = new Map<string, string>();
  const subjectNames = new Map<string, string>();
  const gradeLevels = new Map<string, number>();
  const sectionInfo = new Map<string, { gradeKey: string; name: string; label: string }>();
  const roomNames = new Map<string, string>();

  const dayUsage = new Map<number, { nameAr: string; maxPeriod: number }>();

  interface Draft {
    rowNumber: number;
    dayWeekday: number;
    periodNo: number;
    sectionKey: string;
    subjectKey: string;
    teacherKey: string;
    roomKey: string | null;
  }
  const drafts: Draft[] = [];

  rows.forEach((row, i) => {
    const rowNumber = i + 2; // +1 للفهرسة من واحد، +1 لصف العناوين
    const dayRaw = get(row, 'day');
    const periodRaw = digits(get(row, 'period'));
    const sectionRaw = digits(get(row, 'section'));
    const gradeRaw = digits(get(row, 'grade'));
    const subjectRaw = get(row, 'subject');
    const teacherRaw = get(row, 'teacher');
    const roomRaw = get(row, 'room');

    if (!dayRaw && !periodRaw && !subjectRaw && !teacherRaw) return; // صف فارغ

    const day = matchDay(dayRaw);
    if (!day) {
      issues.push({ rowNumber, severity: 'error', messageAr: `لم أتعرّف على اليوم «${dayRaw || 'فارغ'}».` });
      return;
    }

    const periodNo = Number((periodRaw.match(/\d+/) ?? [])[0]);
    if (!Number.isFinite(periodNo) || periodNo < 1 || periodNo > 15) {
      issues.push({ rowNumber, severity: 'error', messageAr: `رقم الحصة «${periodRaw || 'فارغ'}» غير صالح.` });
      return;
    }

    if (!subjectRaw) {
      issues.push({ rowNumber, severity: 'error', messageAr: 'اسم المادة فارغ.' });
      return;
    }
    if (!sectionRaw) {
      issues.push({ rowNumber, severity: 'error', messageAr: 'الشعبة فارغة.' });
      return;
    }

    // الشعبة قد تأتي كاملة (6/2) أو رقمًا فقط مع عمود صف مستقل.
    let gradeLevel: number | null = null;
    let sectionName = sectionRaw;
    const combined = sectionRaw.match(/(\d{1,2})\s*[/\-]\s*(\d{1,2})/);
    if (combined) {
      gradeLevel = Number(combined[1]);
      sectionName = combined[2];
    } else if (gradeRaw) {
      const parsed = Number((gradeRaw.match(/\d+/) ?? [])[0]);
      if (Number.isFinite(parsed)) gradeLevel = parsed;
    }

    if (gradeLevel === null) {
      issues.push({
        rowNumber,
        severity: 'error',
        messageAr: `تعذّر تحديد الصف للشعبة «${sectionRaw}». اكتبها بصيغة 6/2 أو أضف عمودًا للصف.`,
      });
      return;
    }

    if (!teacherRaw) {
      issues.push({
        rowNumber,
        severity: 'warning',
        messageAr: `حصة ${subjectRaw} للشعبة ${gradeLevel}/${sectionName} بلا معلمة — ستُستورد كحصة غير مسندة.`,
      });
    }

    const gradeKey = `g${gradeLevel}`;
    const sectionKey = `${gradeLevel}/${sectionName}`;
    const subjectKey = normalizeAr(subjectRaw);
    const teacherKey = teacherRaw ? normalizeAr(teacherRaw) : '';
    const roomKey = roomRaw ? normalizeAr(roomRaw) : null;

    gradeLevels.set(gradeKey, gradeLevel);
    sectionInfo.set(sectionKey, { gradeKey, name: sectionName, label: sectionKey });
    if (!subjectNames.has(subjectKey)) subjectNames.set(subjectKey, subjectRaw);
    if (teacherKey && !teacherNames.has(teacherKey)) teacherNames.set(teacherKey, teacherRaw);
    if (roomKey && !roomNames.has(roomKey)) roomNames.set(roomKey, roomRaw);

    const usage = dayUsage.get(day.weekday);
    dayUsage.set(day.weekday, {
      nameAr: day.nameAr,
      maxPeriod: Math.max(usage?.maxPeriod ?? 0, periodNo),
    });

    drafts.push({ rowNumber, dayWeekday: day.weekday, periodNo, sectionKey, subjectKey, teacherKey, roomKey });
  });

  /* ── كشف التكرار والتعارض قبل البناء ── */

  const duplicates: string[] = [];
  const conflicts: string[] = [];
  const sectionSlots = new Map<string, Draft>();
  const teacherSlots = new Map<string, Draft>();
  const accepted: Draft[] = [];

  for (const draft of drafts) {
    const slot = `${draft.dayWeekday}#${draft.periodNo}`;
    const sectionSlotKey = `${draft.sectionKey}#${slot}`;
    const existing = sectionSlots.get(sectionSlotKey);

    if (existing) {
      const identical =
        existing.subjectKey === draft.subjectKey && existing.teacherKey === draft.teacherKey;
      if (identical) {
        duplicates.push(`صف ${draft.rowNumber}: تكرار حرفي لصف ${existing.rowNumber}.`);
        issues.push({
          rowNumber: draft.rowNumber,
          severity: 'warning',
          messageAr: `صف مكرر تمامًا (مطابق للصف ${existing.rowNumber}) — سيُتجاهل.`,
        });
      } else {
        conflicts.push(
          `الشعبة ${draft.sectionKey} لها حصتان مختلفتان في اليوم نفسه والحصة نفسها (الصفان ${existing.rowNumber} و${draft.rowNumber}).`,
        );
        issues.push({
          rowNumber: draft.rowNumber,
          severity: 'error',
          messageAr: `تعارض: الشعبة ${draft.sectionKey} مشغولة في هذه الحصة بالفعل (الصف ${existing.rowNumber}).`,
        });
      }
      continue;
    }

    if (draft.teacherKey) {
      const teacherSlotKey = `${draft.teacherKey}#${slot}`;
      const busy = teacherSlots.get(teacherSlotKey);
      if (busy) {
        conflicts.push(
          `المعلمة «${teacherNames.get(draft.teacherKey)}» مسندة إلى شعبتين في الوقت نفسه (الصفان ${busy.rowNumber} و${draft.rowNumber}).`,
        );
        issues.push({
          rowNumber: draft.rowNumber,
          severity: 'error',
          messageAr: `تعارض: المعلمة «${teacherNames.get(draft.teacherKey)}» لديها حصة أخرى في الوقت نفسه (الصف ${busy.rowNumber}).`,
        });
        continue;
      }
      teacherSlots.set(teacherSlotKey, draft);
    }

    sectionSlots.set(sectionSlotKey, draft);
    accepted.push(draft);
  }

  /* ── أسبوع الدراسة المستنتج ── */

  const time = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

  const days: SchoolDay[] = [...dayUsage.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([weekday, info], sort) => {
      const periods: Period[] = [];
      let cursor = 7 * 60 + 15;
      let index = 0;

      const add = (kind: Period['kind'], labelAr: string, minutes: number) => {
        index += 1;
        periods.push({ index, kind, labelAr, startTime: time(cursor), endTime: time(cursor + minutes) });
        cursor += minutes;
      };

      if (options.assemblyFirst) add('assembly', 'الطابور', 15);

      for (let lessonNo = 1; lessonNo <= info.maxPeriod; lessonNo++) {
        add('lesson', `الحصة ${lessonNo}`, 45);
        if (options.breakAfter > 0 && lessonNo === options.breakAfter && lessonNo < info.maxPeriod) {
          add('break', 'الفسحة', 30);
        }
      }

      return { id: `d${weekday}`, weekday, nameAr: info.nameAr, isTeaching: true, sort, periods };
    });

  // خريطة رقم الحصة كما كُتب في الملف → فهرس الفترة داخل اليوم
  const periodIndexOf = new Map<string, number>();
  for (const day of days) {
    let lessonNo = 0;
    for (const period of day.periods) {
      if (period.kind !== 'lesson') continue;
      lessonNo += 1;
      periodIndexOf.set(`${day.weekday}#${lessonNo}`, period.index);
    }
  }

  /* ── الكيانات ── */

  const grades: Grade[] = [...gradeLevels.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([key, level]) => {
      const id = slug('g', key, gradeIds);
      return { id, level, nameAr: `الصف ${level}`, sort: level };
    });

  const sections: Section[] = [...sectionInfo.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'ar', { numeric: true }))
    .map(([key, info]) => ({
      id: slug('sec', key, sectionIds),
      gradeId: gradeIds.get(info.gradeKey)!,
      name: info.name,
      label: info.label,
      classTeacherId: null,
      isActive: true,
    }));

  const subjects: Subject[] = [...subjectNames.entries()].map(([key, nameAr], i) => ({
    id: slug('sub', key, subjectIds),
    code: nameAr.slice(0, 2).toUpperCase(),
    nameAr,
    departmentId: null,
    color: PALETTE[i % PALETTE.length],
    needsLab: false,
    roomKind: null,
    maxPerDay: 2,
    allowsDouble: true,
    preferredDistribution: 'spread',
    isCore: false,
  }));

  const teacherSubjects = new Map<string, Set<string>>();
  for (const draft of accepted) {
    if (!draft.teacherKey) continue;
    const set = teacherSubjects.get(draft.teacherKey) ?? new Set<string>();
    set.add(subjectIds.get(draft.subjectKey)!);
    teacherSubjects.set(draft.teacherKey, set);
  }

  const teacherLessonCount = new Map<string, number>();
  for (const draft of accepted) {
    if (!draft.teacherKey) continue;
    teacherLessonCount.set(draft.teacherKey, (teacherLessonCount.get(draft.teacherKey) ?? 0) + 1);
  }

  const teachers: Teacher[] = [...teacherNames.entries()].map(([key, nameAr]) => {
    const id = slug('t', key, teacherIds);
    const assigned = teacherLessonCount.get(key) ?? 0;
    const subjectList = [...(teacherSubjects.get(key) ?? new Set<string>())];
    return {
      id,
      nameAr,
      departmentId: null,
      primarySubjectId: subjectList[0] ?? null,
      subjectIds: subjectList,
      // النصاب المستورد = ما هو مسند فعلًا؛ يُراجَع من صفحة المعلمات بعد الاستيراد.
      requiredLoad: assigned,
      maxLoad: assigned + 4,
      status: 'active',
      unavailable: [],
      preferences: [],
    };
  });

  const rooms = [...roomNames.entries()].map(([key, nameAr]) => ({
    id: slug('rm', key, roomIds),
    nameAr,
    kind: 'lab' as const,
  }));

  const lessons: Lesson[] = accepted.map((draft, i) => ({
    id: `il${i + 1}`,
    sectionId: sectionIds.get(draft.sectionKey)!,
    subjectId: subjectIds.get(draft.subjectKey)!,
    teacherId: draft.teacherKey ? (teacherIds.get(draft.teacherKey) ?? null) : null,
    dayId: `d${draft.dayWeekday}`,
    periodIndex: periodIndexOf.get(`${draft.dayWeekday}#${draft.periodNo}`) ?? draft.periodNo,
    roomId: draft.roomKey ? (roomIds.get(draft.roomKey) ?? null) : null,
    isLocked: false,
  }));

  // خطة المواد تُستنتج من الجدول نفسه: أكثر عدد متكرر بين شعب الصف الواحد.
  const curriculum: CurriculumEntry[] = [];
  for (const grade of grades) {
    const gradeSections = sections.filter((s) => s.gradeId === grade.id);
    for (const subject of subjects) {
      const counts = gradeSections.map(
        (section) =>
          lessons.filter((l) => l.sectionId === section.id && l.subjectId === subject.id).length,
      );
      const nonZero = counts.filter((c) => c > 0);
      if (nonZero.length === 0) continue;

      const mode = [...nonZero].sort(
        (a, b) => nonZero.filter((c) => c === b).length - nonZero.filter((c) => c === a).length,
      )[0];
      curriculum.push({ gradeId: grade.id, subjectId: subject.id, weeklyLessons: mode });

      const inconsistent = counts.filter((c) => c > 0 && c !== mode).length;
      if (inconsistent > 0) {
        issues.push({
          rowNumber: 0,
          severity: 'warning',
          messageAr: `عدد حصص ${subject.nameAr} يختلف بين شعب ${grade.nameAr} — اعتُمد ${mode} حصة، وتوجد ${inconsistent} شعبة مختلفة. راجعها في صفحة المواد.`,
        });
      }
    }
  }

  const report: ImportReport = {
    totalRows: rows.length,
    acceptedRows: accepted.length,
    rejectedRows: rows.length - accepted.length,
    issues,
    recognized: {
      teachers: [...teacherNames.values()],
      subjects: [...subjectNames.values()],
      grades: grades.map((g) => g.nameAr),
      sections: sections.map((s) => s.label),
      days: days.map((d) => d.nameAr),
      periodsPerDay: Object.fromEntries(days.map((d) => [d.nameAr, d.periods.filter((p) => p.kind === 'lesson').length])),
      rooms: [...roomNames.values()],
    },
    duplicates,
    conflicts,
  };

  if (accepted.length === 0) {
    return { snapshot: null, report };
  }

  return {
    snapshot: {
      versionId: 'imported',
      week: { yearLabel: options.yearLabel, schoolNameAr: options.schoolNameAr, days },
      departments: [],
      subjects,
      teachers,
      grades,
      sections,
      curriculum,
      rooms,
      lessons,
      locks: [],
    },
    report,
  };
}
