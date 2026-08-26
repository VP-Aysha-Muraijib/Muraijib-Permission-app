/**
 * فهرسة اللقطة.
 *
 * كل دوال التحقق تعمل على الجدول آلاف المرات أثناء البحث عن حلول،
 * لذا تُبنى الفهارس مرة واحدة ويُبحث فيها بزمن ثابت بدل المسح الخطي.
 */

import type {
  CurriculumEntry,
  Grade,
  ID,
  Lesson,
  Room,
  ScheduleSnapshot,
  SchoolDay,
  Section,
  Slot,
  Subject,
  Teacher,
} from '@/lib/domain/types';

export const slotKey = (dayId: ID, periodIndex: number) => `${dayId}#${periodIndex}`;

export interface SnapshotIndex {
  snapshot: ScheduleSnapshot;

  teacherById: Map<ID, Teacher>;
  subjectById: Map<ID, Subject>;
  sectionById: Map<ID, Section>;
  gradeById: Map<ID, Grade>;
  roomById: Map<ID, Room>;
  dayById: Map<ID, SchoolDay>;
  lessonById: Map<ID, Lesson>;

  /** يوم+فترة → الحصص فيها (لكل الشعب). */
  bySlot: Map<string, Lesson[]>;
  /** معلمة → يوم+فترة → الحصص (أكثر من واحدة = حجز مزدوج). */
  byTeacherSlot: Map<ID, Map<string, Lesson[]>>;
  /** شعبة → يوم+فترة → الحصص. */
  bySectionSlot: Map<ID, Map<string, Lesson[]>>;
  /** غرفة → يوم+فترة → الحصص. */
  byRoomSlot: Map<ID, Map<string, Lesson[]>>;

  byTeacher: Map<ID, Lesson[]>;
  bySection: Map<ID, Lesson[]>;
  bySubject: Map<ID, Lesson[]>;

  /** الفترات التدريسية فقط، مرتبة، لكل يوم تدريسي. */
  teachingSlots: Slot[];
  teachingDays: SchoolDay[];

  /** معرّفات الحصص المقفلة فعليًا (بالقفل المباشر أو بقفل واسع النطاق). */
  lockedLessonIds: Set<ID>;

  /** شعبة#مادة → عدد الحصص المطلوب أسبوعيًا. */
  requiredBySectionSubject: Map<string, number>;
}

const push = <K, V>(m: Map<K, V[]>, k: K, v: V) => {
  const a = m.get(k);
  if (a) a.push(v);
  else m.set(k, [v]);
};

const push2 = <V>(m: Map<ID, Map<string, V[]>>, outer: ID, inner: string, v: V) => {
  let sub = m.get(outer);
  if (!sub) {
    sub = new Map();
    m.set(outer, sub);
  }
  push(sub, inner, v);
};

/** نصاب المادة لشعبة بعينها، مع احترام التجاوز الخاص بالشعبة. */
export function requiredLessons(
  curriculum: CurriculumEntry[],
  gradeId: ID,
  subjectId: ID,
  sectionId: ID,
): number {
  const entry = curriculum.find((c) => c.gradeId === gradeId && c.subjectId === subjectId);
  if (!entry) return 0;
  const override = entry.sectionOverrides?.[sectionId];
  return override ?? entry.weeklyLessons;
}

export function buildIndex(snapshot: ScheduleSnapshot): SnapshotIndex {
  const idx: SnapshotIndex = {
    snapshot,
    teacherById: new Map(snapshot.teachers.map((t) => [t.id, t])),
    subjectById: new Map(snapshot.subjects.map((s) => [s.id, s])),
    sectionById: new Map(snapshot.sections.map((s) => [s.id, s])),
    gradeById: new Map(snapshot.grades.map((g) => [g.id, g])),
    roomById: new Map(snapshot.rooms.map((r) => [r.id, r])),
    dayById: new Map(snapshot.week.days.map((d) => [d.id, d])),
    lessonById: new Map(snapshot.lessons.map((l) => [l.id, l])),
    bySlot: new Map(),
    byTeacherSlot: new Map(),
    bySectionSlot: new Map(),
    byRoomSlot: new Map(),
    byTeacher: new Map(),
    bySection: new Map(),
    bySubject: new Map(),
    teachingSlots: [],
    teachingDays: [],
    lockedLessonIds: new Set(),
    requiredBySectionSubject: new Map(),
  };

  for (const lesson of snapshot.lessons) {
    const key = slotKey(lesson.dayId, lesson.periodIndex);
    push(idx.bySlot, key, lesson);
    push(idx.bySection, lesson.sectionId, lesson);
    push(idx.bySubject, lesson.subjectId, lesson);
    push2(idx.bySectionSlot, lesson.sectionId, key, lesson);
    if (lesson.teacherId) {
      push(idx.byTeacher, lesson.teacherId, lesson);
      push2(idx.byTeacherSlot, lesson.teacherId, key, lesson);
    }
    if (lesson.roomId) {
      push2(idx.byRoomSlot, lesson.roomId, key, lesson);
    }
  }

  idx.teachingDays = snapshot.week.days
    .filter((d) => d.isTeaching)
    .sort((a, b) => a.sort - b.sort);

  for (const day of idx.teachingDays) {
    for (const period of day.periods) {
      if (period.kind === 'lesson') {
        idx.teachingSlots.push({ dayId: day.id, periodIndex: period.index });
      }
    }
  }

  // الأقفال: القفل الواسع (معلمة/شعبة/يوم/صف) يُسقط على الحصص المشمولة به.
  for (const lesson of snapshot.lessons) {
    if (lesson.isLocked) idx.lockedLessonIds.add(lesson.id);
  }
  for (const lock of snapshot.locks) {
    switch (lock.scope) {
      case 'lesson':
        idx.lockedLessonIds.add(lock.refId);
        break;
      case 'teacher':
        for (const l of idx.byTeacher.get(lock.refId) ?? []) idx.lockedLessonIds.add(l.id);
        break;
      case 'section':
        for (const l of idx.bySection.get(lock.refId) ?? []) idx.lockedLessonIds.add(l.id);
        break;
      case 'day':
        for (const l of snapshot.lessons) if (l.dayId === lock.refId) idx.lockedLessonIds.add(l.id);
        break;
      case 'grade': {
        const sectionIds = new Set(
          snapshot.sections.filter((s) => s.gradeId === lock.refId).map((s) => s.id),
        );
        for (const l of snapshot.lessons) if (sectionIds.has(l.sectionId)) idx.lockedLessonIds.add(l.id);
        break;
      }
    }
  }

  for (const section of snapshot.sections) {
    if (!section.isActive) continue;
    for (const entry of snapshot.curriculum) {
      if (entry.gradeId !== section.gradeId) continue;
      idx.requiredBySectionSubject.set(
        `${section.id}#${entry.subjectId}`,
        entry.sectionOverrides?.[section.id] ?? entry.weeklyLessons,
      );
    }
  }

  return idx;
}

/** هل هذه الخانة فترة تدريسية فعلية؟ */
export function isTeachingSlot(idx: SnapshotIndex, slot: Slot): boolean {
  const day = idx.dayById.get(slot.dayId);
  if (!day || !day.isTeaching) return false;
  return day.periods.some((p) => p.index === slot.periodIndex && p.kind === 'lesson');
}

export function periodLabel(idx: SnapshotIndex, slot: Slot): string {
  const day = idx.dayById.get(slot.dayId);
  const period = day?.periods.find((p) => p.index === slot.periodIndex);
  return `${day?.nameAr ?? '—'} · ${period?.labelAr ?? `الحصة ${slot.periodIndex}`}`;
}

/** الفترات التدريسية ليوم واحد، مرتبة. */
export function teachingPeriodsOf(day: SchoolDay): number[] {
  return day.periods.filter((p) => p.kind === 'lesson').map((p) => p.index).sort((a, b) => a - b);
}
