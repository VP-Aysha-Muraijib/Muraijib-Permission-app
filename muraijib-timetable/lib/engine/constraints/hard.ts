/**
 * القيود الصارمة — أي انتهاك هنا يمنع الاعتماد. لا استثناءات.
 *
 * كل دالة تعيد قائمة انتهاكات برسائل عربية جاهزة للعرض،
 * ومعرّفات الكيانات المتأثرة حتى تستطيع الواجهة تمييزها بصريًا.
 */

import type { ID, Lesson, Violation } from '@/lib/domain/types';
import { periodLabel, requiredLessons, slotKey, type SnapshotIndex } from '../snapshot';

const v = (
  constraintId: string,
  severity: Violation['severity'],
  messageAr: string,
  refs: Partial<Pick<Violation, 'lessonIds' | 'teacherIds' | 'sectionIds' | 'slot'>> = {},
): Violation => ({
  constraintId,
  kind: 'hard',
  severity,
  messageAr,
  lessonIds: refs.lessonIds ?? [],
  teacherIds: refs.teacherIds ?? [],
  sectionIds: refs.sectionIds ?? [],
  slot: refs.slot,
});

const teacherName = (idx: SnapshotIndex, id: ID | null) =>
  (id && idx.teacherById.get(id)?.nameAr) || 'معلمة غير معروفة';
const subjectName = (idx: SnapshotIndex, id: ID) =>
  idx.subjectById.get(id)?.nameAr ?? 'مادة غير معروفة';
const sectionLabel = (idx: SnapshotIndex, id: ID) =>
  idx.sectionById.get(id)?.label ?? 'شعبة غير معروفة';

/* ── 1. المعلمة في صفين في نفس الحصة ── */
export function checkTeacherDoubleBooking(idx: SnapshotIndex): Violation[] {
  const out: Violation[] = [];
  for (const [teacherId, slots] of idx.byTeacherSlot) {
    for (const [key, lessons] of slots) {
      if (lessons.length < 2) continue;
      const [dayId, periodIndex] = key.split('#');
      const slot = { dayId, periodIndex: Number(periodIndex) };
      out.push(
        v(
          'teacher-double-booking',
          'critical',
          `${teacherName(idx, teacherId)} مسندة إلى ${lessons.length} شعب في الوقت نفسه (${periodLabel(idx, slot)}): ${lessons
            .map((l) => sectionLabel(idx, l.sectionId))
            .join('، ')}.`,
          { lessonIds: lessons.map((l) => l.id), teacherIds: [teacherId], sectionIds: lessons.map((l) => l.sectionId), slot },
        ),
      );
    }
  }
  return out;
}

/* ── 2. الشعبة لها مادتان في نفس الحصة ── */
export function checkSectionDoubleBooking(idx: SnapshotIndex): Violation[] {
  const out: Violation[] = [];
  for (const [sectionId, slots] of idx.bySectionSlot) {
    for (const [key, lessons] of slots) {
      if (lessons.length < 2) continue;
      const [dayId, periodIndex] = key.split('#');
      const slot = { dayId, periodIndex: Number(periodIndex) };
      out.push(
        v(
          'section-double-booking',
          'critical',
          `الشعبة ${sectionLabel(idx, sectionId)} لديها ${lessons.length} حصص في الوقت نفسه (${periodLabel(idx, slot)}): ${lessons
            .map((l) => subjectName(idx, l.subjectId))
            .join('، ')}.`,
          { lessonIds: lessons.map((l) => l.id), sectionIds: [sectionId], slot },
        ),
      );
    }
  }
  return out;
}

/* ── 3. تعارض الغرف والمختبرات ── */
export function checkRoomConflict(idx: SnapshotIndex): Violation[] {
  const out: Violation[] = [];
  for (const [roomId, slots] of idx.byRoomSlot) {
    for (const [key, lessons] of slots) {
      if (lessons.length < 2) continue;
      const [dayId, periodIndex] = key.split('#');
      const slot = { dayId, periodIndex: Number(periodIndex) };
      out.push(
        v(
          'room-conflict',
          'high',
          `${idx.roomById.get(roomId)?.nameAr ?? 'غرفة'} محجوزة لأكثر من شعبة في ${periodLabel(idx, slot)}.`,
          { lessonIds: lessons.map((l) => l.id), sectionIds: lessons.map((l) => l.sectionId), slot },
        ),
      );
    }
  }
  return out;
}

/* ── 4. حصة في وقت عدم توفر المعلمة ── */
export function checkTeacherUnavailable(idx: SnapshotIndex): Violation[] {
  const out: Violation[] = [];
  for (const teacher of idx.snapshot.teachers) {
    if (teacher.unavailable.length === 0) continue;
    const blocked = new Set(teacher.unavailable.map((s) => slotKey(s.dayId, s.periodIndex)));
    for (const lesson of idx.byTeacher.get(teacher.id) ?? []) {
      const key = slotKey(lesson.dayId, lesson.periodIndex);
      if (!blocked.has(key)) continue;
      const slot = { dayId: lesson.dayId, periodIndex: lesson.periodIndex };
      out.push(
        v(
          'teacher-unavailable',
          'critical',
          `${teacher.nameAr} غير متاحة في ${periodLabel(idx, slot)}، ومع ذلك لديها حصة ${subjectName(idx, lesson.subjectId)} للشعبة ${sectionLabel(idx, lesson.sectionId)}.`,
          { lessonIds: [lesson.id], teacherIds: [teacher.id], sectionIds: [lesson.sectionId], slot },
        ),
      );
    }
  }
  return out;
}

/* ── 5. مادة غير مكلَّفة بها المعلمة ── */
export function checkTeacherQualification(idx: SnapshotIndex): Violation[] {
  const out: Violation[] = [];
  for (const lesson of idx.snapshot.lessons) {
    if (!lesson.teacherId) continue;
    const teacher = idx.teacherById.get(lesson.teacherId);
    if (!teacher) continue;
    if (teacher.subjectIds.includes(lesson.subjectId)) continue;
    out.push(
      v(
        'teacher-not-qualified',
        'critical',
        `${teacher.nameAr} غير مكلَّفة بمادة ${subjectName(idx, lesson.subjectId)}، ومع ذلك أُسندت لها حصة للشعبة ${sectionLabel(idx, lesson.sectionId)}.`,
        { lessonIds: [lesson.id], teacherIds: [teacher.id], sectionIds: [lesson.sectionId] },
      ),
    );
  }
  return out;
}

/* ── 6. حصة في فترة غير تدريسية ── */
export function checkNonTeachingPeriod(idx: SnapshotIndex): Violation[] {
  const out: Violation[] = [];
  for (const lesson of idx.snapshot.lessons) {
    const day = idx.dayById.get(lesson.dayId);
    const period = day?.periods.find((p) => p.index === lesson.periodIndex);
    if (day?.isTeaching && period?.kind === 'lesson') continue;
    out.push(
      v(
        'period-not-teaching',
        'high',
        `حصة ${subjectName(idx, lesson.subjectId)} للشعبة ${sectionLabel(idx, lesson.sectionId)} موضوعة في فترة غير تدريسية (${period?.labelAr ?? 'فترة غير معرّفة'} — ${day?.nameAr ?? 'يوم غير معرّف'}).`,
        { lessonIds: [lesson.id], sectionIds: [lesson.sectionId] },
      ),
    );
  }
  return out;
}

/* ── 7. اكتمال نصاب المادة لكل شعبة ── */
export function checkCurriculumCompleteness(idx: SnapshotIndex): Violation[] {
  const out: Violation[] = [];
  for (const section of idx.snapshot.sections) {
    if (!section.isActive) continue;
    const lessons = idx.bySection.get(section.id) ?? [];
    const counts = new Map<ID, number>();
    for (const l of lessons) counts.set(l.subjectId, (counts.get(l.subjectId) ?? 0) + 1);

    for (const entry of idx.snapshot.curriculum) {
      if (entry.gradeId !== section.gradeId) continue;
      const required = requiredLessons(idx.snapshot.curriculum, section.gradeId, entry.subjectId, section.id);
      const actual = counts.get(entry.subjectId) ?? 0;
      if (actual === required) continue;
      const missing = required - actual;
      out.push(
        v(
          'curriculum-completeness',
          missing > 0 ? 'high' : 'medium',
          missing > 0
            ? `الشعبة ${section.label} ينقصها ${missing} من حصص ${subjectName(idx, entry.subjectId)} (المطلوب ${required}، الموجود ${actual}).`
            : `الشعبة ${section.label} لديها ${-missing} حصة زائدة في ${subjectName(idx, entry.subjectId)} (المطلوب ${required}، الموجود ${actual}).`,
          { sectionIds: [section.id], lessonIds: lessons.filter((l) => l.subjectId === entry.subjectId).map((l) => l.id) },
        ),
      );
    }

    // مواد موجودة في الجدول لكنها ليست في خطة الصف
    for (const [subjectId] of counts) {
      const inPlan = idx.snapshot.curriculum.some(
        (c) => c.gradeId === section.gradeId && c.subjectId === subjectId,
      );
      if (inPlan) continue;
      out.push(
        v(
          'curriculum-completeness',
          'medium',
          `الشعبة ${section.label} لديها حصص ${subjectName(idx, subjectId)} وهي غير مدرجة في خطة ${idx.gradeById.get(section.gradeId)?.nameAr ?? 'الصف'}.`,
          { sectionIds: [section.id] },
        ),
      );
    }
  }
  return out;
}

/* ── 8. تجاوز الحد الأعلى للنصاب ── */
export function checkTeacherMaxLoad(idx: SnapshotIndex): Violation[] {
  const out: Violation[] = [];
  for (const teacher of idx.snapshot.teachers) {
    const assigned = (idx.byTeacher.get(teacher.id) ?? []).length;
    if (assigned <= teacher.maxLoad) continue;
    out.push(
      v(
        'teacher-max-load',
        'high',
        `${teacher.nameAr} أُسند لها ${assigned} حصة، وهو يتجاوز الحد الأعلى (${teacher.maxLoad}).`,
        { teacherIds: [teacher.id] },
      ),
    );
  }
  return out;
}

/* ── 9. تكرار المادة لنفس الشعبة فوق الحد اليومي ── */
export function checkSubjectMaxPerDay(idx: SnapshotIndex): Violation[] {
  const out: Violation[] = [];
  const counts = new Map<string, Lesson[]>();
  for (const lesson of idx.snapshot.lessons) {
    const key = `${lesson.sectionId}#${lesson.subjectId}#${lesson.dayId}`;
    const arr = counts.get(key);
    if (arr) arr.push(lesson);
    else counts.set(key, [lesson]);
  }
  for (const [key, lessons] of counts) {
    const [sectionId, subjectId, dayId] = key.split('#');
    const subject = idx.subjectById.get(subjectId);
    const max = subject?.maxPerDay ?? 2;
    if (lessons.length <= max) continue;
    out.push(
      v(
        'subject-max-per-day',
        'medium',
        `الشعبة ${sectionLabel(idx, sectionId)} لديها ${lessons.length} حصص ${subjectName(idx, subjectId)} في ${idx.dayById.get(dayId)?.nameAr ?? 'يوم واحد'}، والحد المسموح ${max}.`,
        { lessonIds: lessons.map((l) => l.id), sectionIds: [sectionId] },
      ),
    );
  }
  return out;
}

/* ── 10. حصص بلا معلمة ── */
export function checkUnassignedLessons(idx: SnapshotIndex): Violation[] {
  const out: Violation[] = [];
  for (const lesson of idx.snapshot.lessons) {
    if (lesson.teacherId) continue;
    const slot = { dayId: lesson.dayId, periodIndex: lesson.periodIndex };
    out.push(
      v(
        'lesson-unassigned',
        'high',
        `حصة ${subjectName(idx, lesson.subjectId)} للشعبة ${sectionLabel(idx, lesson.sectionId)} في ${periodLabel(idx, slot)} بلا معلمة.`,
        { lessonIds: [lesson.id], sectionIds: [lesson.sectionId], slot },
      ),
    );
  }
  return out;
}

/* ── 11. حالة المعلمة لا تسمح بالتدريس ── */
export function checkTeacherStatus(idx: SnapshotIndex): Violation[] {
  const out: Violation[] = [];
  for (const teacher of idx.snapshot.teachers) {
    if (teacher.status !== 'transferred' && teacher.status !== 'on_leave') continue;
    const lessons = idx.byTeacher.get(teacher.id) ?? [];
    if (lessons.length === 0) continue;
    const label = teacher.status === 'transferred' ? 'منقولة من المدرسة' : 'في إجازة';
    out.push(
      v(
        'teacher-status',
        'critical',
        `${teacher.nameAr} ${label}، ومع ذلك ما زالت مسندة إلى ${lessons.length} حصة تحتاج إعادة توزيع.`,
        { teacherIds: [teacher.id], lessonIds: lessons.map((l) => l.id), sectionIds: [...new Set(lessons.map((l) => l.sectionId))] },
      ),
    );
  }
  return out;
}

export const HARD_CONSTRAINTS = [
  { id: 'teacher-double-booking', labelAr: 'ازدواج جدول المعلمة', run: checkTeacherDoubleBooking },
  { id: 'section-double-booking', labelAr: 'ازدواج جدول الشعبة', run: checkSectionDoubleBooking },
  { id: 'room-conflict', labelAr: 'تعارض الغرف', run: checkRoomConflict },
  { id: 'teacher-unavailable', labelAr: 'أوقات عدم التوفر', run: checkTeacherUnavailable },
  { id: 'teacher-not-qualified', labelAr: 'إسناد مادة غير مكلَّفة', run: checkTeacherQualification },
  { id: 'period-not-teaching', labelAr: 'فترة غير تدريسية', run: checkNonTeachingPeriod },
  { id: 'curriculum-completeness', labelAr: 'اكتمال نصاب المواد', run: checkCurriculumCompleteness },
  { id: 'teacher-max-load', labelAr: 'تجاوز الحد الأعلى للنصاب', run: checkTeacherMaxLoad },
  { id: 'subject-max-per-day', labelAr: 'تكرار المادة يوميًا', run: checkSubjectMaxPerDay },
  { id: 'lesson-unassigned', labelAr: 'حصص بلا معلمة', run: checkUnassignedLessons },
  { id: 'teacher-status', labelAr: 'حالة المعلمة', run: checkTeacherStatus },
] as const;

/** تشغيل كل القيود الصارمة على اللقطة. */
export function runHardConstraints(idx: SnapshotIndex): Violation[] {
  return HARD_CONSTRAINTS.flatMap((c) => c.run(idx));
}

/**
 * الانتهاكات المانعة للاعتماد.
 *
 * "حصص بلا معلمة" و"نقص النصاب" حالات معروفة أثناء بناء الجدول ولا تمنع الحفظ —
 * تُعرض في فحص الصحة، بينما الحجز المزدوج ونحوه يمنع الكتابة.
 */
const BLOCKING = new Set([
  'teacher-double-booking',
  'section-double-booking',
  'room-conflict',
  'teacher-unavailable',
  'teacher-not-qualified',
  'period-not-teaching',
  'teacher-max-load',
]);

export const isBlocking = (violation: Violation) => BLOCKING.has(violation.constraintId);
