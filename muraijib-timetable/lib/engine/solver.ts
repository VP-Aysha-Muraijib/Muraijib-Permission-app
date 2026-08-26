/**
 * أوليات البحث: من تستطيع أخذ هذه الحصة؟ وأين يمكن نقلها؟
 *
 * كل دالة هنا تعيد مرشحين **مع سبب** — لأن نائب المدير يحتاج أن يعرف
 * لماذا كانت هذه المعلمة الخيار الأول، ولماذا استُبعدت تلك.
 */

import type { ID, Lesson, Slot, Teacher } from '@/lib/domain/types';
import { slotKey, type SnapshotIndex } from './snapshot';
import { computeTeacherWorkload, freeSlotsOf } from './workload';

export interface TeacherCandidate {
  teacher: Teacher;
  /** 0..1 — أعلى = أنسب. */
  fit: number;
  reasonsAr: string[];
  remainingAfter: number;
}

export interface RejectedTeacher {
  teacher: Teacher;
  reasonAr: string;
}

export interface TeacherSearch {
  candidates: TeacherCandidate[];
  rejected: RejectedTeacher[];
}

export interface FindTeachersOptions {
  /** معلمات مستبعدة صراحةً (مثلًا المعلمة المنقولة). */
  exclude?: Set<ID>;
  /** السماح بتجاوز النصاب المطلوب ما دام دون الحد الأعلى. */
  allowAboveRequired?: boolean;
  /** حصص مقترحة سابقًا في هذه الجولة — تُحسب ضمن انشغال المعلمة. */
  pendingByTeacher?: Map<ID, Set<string>>;
  /** زيادة النصاب المقترحة سابقًا في هذه الجولة. */
  pendingLoad?: Map<ID, number>;
}

/**
 * المعلمات القادرات على تدريس حصة في خانتها الحالية.
 * تُطبَّق هنا القيود الصارمة كافة — ما يخرج من هذه الدالة صالح دائمًا.
 */
export function findAvailableTeachers(
  idx: SnapshotIndex,
  lesson: Pick<Lesson, 'subjectId' | 'dayId' | 'periodIndex' | 'sectionId'>,
  options: FindTeachersOptions = {},
): TeacherSearch {
  const key = slotKey(lesson.dayId, lesson.periodIndex);
  const candidates: TeacherCandidate[] = [];
  const rejected: RejectedTeacher[] = [];
  const subjectName = idx.subjectById.get(lesson.subjectId)?.nameAr ?? 'المادة';

  for (const teacher of idx.snapshot.teachers) {
    if (options.exclude?.has(teacher.id)) continue;

    if (teacher.status === 'transferred' || teacher.status === 'on_leave') {
      rejected.push({
        teacher,
        reasonAr: teacher.status === 'transferred' ? 'منقولة من المدرسة.' : 'في إجازة.',
      });
      continue;
    }

    if (!teacher.subjectIds.includes(lesson.subjectId)) {
      rejected.push({ teacher, reasonAr: `غير مكلَّفة بمادة ${subjectName}.` });
      continue;
    }

    if (teacher.unavailable.some((s) => slotKey(s.dayId, s.periodIndex) === key)) {
      rejected.push({ teacher, reasonAr: 'غير متاحة في هذا الوقت.' });
      continue;
    }

    const busy = (idx.byTeacherSlot.get(teacher.id)?.get(key)?.length ?? 0) > 0;
    const pendingBusy = options.pendingByTeacher?.get(teacher.id)?.has(key) ?? false;
    if (busy || pendingBusy) {
      rejected.push({ teacher, reasonAr: 'لديها حصة أخرى في الوقت نفسه.' });
      continue;
    }

    const load = computeTeacherWorkload(idx, teacher.id);
    const pending = options.pendingLoad?.get(teacher.id) ?? 0;
    const assigned = load.assigned + pending;

    if (assigned + 1 > teacher.maxLoad) {
      rejected.push({ teacher, reasonAr: `الحد الأعلى للنصاب (${teacher.maxLoad}) لا يسمح بحصة إضافية.` });
      continue;
    }
    if (assigned + 1 > teacher.requiredLoad && !options.allowAboveRequired) {
      rejected.push({ teacher, reasonAr: `مكتملة النصاب (${teacher.requiredLoad}).` });
      continue;
    }

    const remainingAfter = teacher.requiredLoad - (assigned + 1);
    const reasonsAr: string[] = [];

    // الملاءمة: من ينقصها حصص أولى، ومن تدرّس الشعبة نفسها أولى، والفراغ الملتصق أفضل من فراغ معزول.
    let fit = 0.5;

    if (remainingAfter >= 0) {
      fit += 0.25 * Math.min(1, (teacher.requiredLoad - assigned) / Math.max(1, teacher.requiredLoad));
      reasonsAr.push(`متبقٍ من نصابها ${teacher.requiredLoad - assigned} حصة.`);
    } else {
      fit -= 0.2;
      reasonsAr.push(`ستتجاوز نصابها المطلوب بـ${-remainingAfter} حصة (ضمن الحد الأعلى).`);
    }

    const teachesSection = (idx.byTeacher.get(teacher.id) ?? []).some(
      (l) => l.sectionId === lesson.sectionId,
    );
    if (teachesSection) {
      fit += 0.15;
      reasonsAr.push('تدرّس الشعبة نفسها بالفعل.');
    }

    const sameDay = (idx.byTeacher.get(teacher.id) ?? []).filter((l) => l.dayId === lesson.dayId);
    if (sameDay.length > 0) {
      const adjacent = sameDay.some((l) => Math.abs(l.periodIndex - lesson.periodIndex) === 1);
      if (adjacent) {
        fit += 0.1;
        reasonsAr.push('الحصة ملاصقة لحصصها في اليوم نفسه (لا تُحدث فراغًا).');
      }
    } else {
      fit -= 0.05;
      reasonsAr.push('ستحضر في يوم لا حصص لها فيه حاليًا.');
    }

    const avoided = teacher.preferences.some(
      (p) => p.kind === 'avoided' && slotKey(p.dayId, p.periodIndex) === key,
    );
    const preferred = teacher.preferences.some(
      (p) => p.kind === 'preferred' && slotKey(p.dayId, p.periodIndex) === key,
    );
    if (preferred) {
      fit += 0.1;
      reasonsAr.push('الوقت ضمن أوقاتها المفضّلة.');
    }
    if (avoided) {
      fit -= 0.1;
      reasonsAr.push('الوقت ضمن أوقات تفضّل تجنّبها.');
    }

    candidates.push({
      teacher,
      fit: Math.max(0, Math.min(1, fit)),
      reasonsAr,
      remainingAfter,
    });
  }

  candidates.sort((a, b) => b.fit - a.fit || a.teacher.nameAr.localeCompare(b.teacher.nameAr, 'ar'));
  return { candidates, rejected };
}

export interface SlotCandidate {
  slot: Slot;
  fit: number;
  reasonsAr: string[];
}

/**
 * الخانات التي يمكن نقل حصة إليها دون كسر أي قيد صارم.
 * تراعي: توفر الشعبة، توفر المعلمة، عدم التوفر، الحد اليومي للمادة، الفترات التدريسية.
 */
export function findAvailableSlots(
  idx: SnapshotIndex,
  lesson: Lesson,
  options: { limit?: number } = {},
): SlotCandidate[] {
  const out: SlotCandidate[] = [];
  const subject = idx.subjectById.get(lesson.subjectId);
  const maxPerDay = subject?.maxPerDay ?? 2;
  const sectionLessons = idx.bySection.get(lesson.sectionId) ?? [];
  const teacherFree = lesson.teacherId
    ? new Set(freeSlotsOf(idx, lesson.teacherId).map((s) => slotKey(s.dayId, s.periodIndex)))
    : null;

  for (const slot of idx.teachingSlots) {
    if (slot.dayId === lesson.dayId && slot.periodIndex === lesson.periodIndex) continue;
    const key = slotKey(slot.dayId, slot.periodIndex);

    // الشعبة مشغولة؟
    if ((idx.bySectionSlot.get(lesson.sectionId)?.get(key)?.length ?? 0) > 0) continue;
    // المعلمة مشغولة أو غير متاحة؟
    if (teacherFree && !teacherFree.has(key)) continue;

    // الحد اليومي للمادة
    const sameDaySameSubject = sectionLessons.filter(
      (l) => l.id !== lesson.id && l.dayId === slot.dayId && l.subjectId === lesson.subjectId,
    ).length;
    if (sameDaySameSubject + 1 > maxPerDay) continue;

    const reasonsAr: string[] = [];
    let fit = 0.6;

    if (sameDaySameSubject === 0) {
      fit += 0.2;
      reasonsAr.push('يوم خالٍ من هذه المادة لهذه الشعبة — توزيع أفضل.');
    }

    if (lesson.teacherId) {
      const teacher = idx.teacherById.get(lesson.teacherId);
      const sameDay = (idx.byTeacher.get(lesson.teacherId) ?? []).filter(
        (l) => l.id !== lesson.id && l.dayId === slot.dayId,
      );
      if (sameDay.some((l) => Math.abs(l.periodIndex - slot.periodIndex) === 1)) {
        fit += 0.15;
        reasonsAr.push('ملاصقة لحصص المعلمة في اليوم نفسه.');
      }
      if (
        teacher?.preferences.some((p) => p.kind === 'preferred' && slotKey(p.dayId, p.periodIndex) === key)
      ) {
        fit += 0.1;
        reasonsAr.push('ضمن أوقات المعلمة المفضّلة.');
      }
      if (
        teacher?.preferences.some((p) => p.kind === 'avoided' && slotKey(p.dayId, p.periodIndex) === key)
      ) {
        fit -= 0.15;
        reasonsAr.push('ضمن أوقات تفضّل المعلمة تجنّبها.');
      }
    }

    if (subject?.isCore) {
      const day = idx.dayById.get(slot.dayId);
      const teaching = day?.periods.filter((p) => p.kind === 'lesson') ?? [];
      const half = teaching[Math.floor(teaching.length / 2)]?.index ?? 0;
      if (slot.periodIndex <= half) {
        fit += 0.08;
        reasonsAr.push('حصة مبكرة تناسب المواد الأساسية.');
      }
    }

    out.push({ slot, fit: Math.max(0, Math.min(1, fit)), reasonsAr });
  }

  out.sort((a, b) => b.fit - a.fit);
  return options.limit ? out.slice(0, options.limit) : out;
}

/**
 * تبديلات ممكنة: حصص أخرى يمكن تبادل موقعها مع هذه الحصة دون كسر قيد صارم.
 * تُستخدم عندما لا توجد خانة شاغرة صالحة.
 */
export function findSwapCandidates(
  idx: SnapshotIndex,
  lesson: Lesson,
  options: { limit?: number } = {},
): Array<{ other: Lesson; reasonsAr: string[] }> {
  const out: Array<{ other: Lesson; reasonsAr: string[] }> = [];
  const teacher = lesson.teacherId ? idx.teacherById.get(lesson.teacherId) : null;

  for (const other of idx.snapshot.lessons) {
    if (other.id === lesson.id) continue;
    if (idx.lockedLessonIds.has(other.id)) continue;
    if (other.dayId === lesson.dayId && other.periodIndex === lesson.periodIndex) continue;

    const targetKey = slotKey(other.dayId, other.periodIndex);
    const sourceKey = slotKey(lesson.dayId, lesson.periodIndex);

    // لا يصلح التبديل إذا كانت الحصتان لشعبتين مختلفتين وكل شعبة مشغولة في وجهتها.
    if (other.sectionId !== lesson.sectionId) {
      if ((idx.bySectionSlot.get(lesson.sectionId)?.get(targetKey)?.length ?? 0) > 0) continue;
      if ((idx.bySectionSlot.get(other.sectionId)?.get(sourceKey)?.length ?? 0) > 0) continue;
    }

    // تعارض المعلمات بعد التبديل
    if (teacher) {
      if (teacher.unavailable.some((s) => slotKey(s.dayId, s.periodIndex) === targetKey)) continue;
      const busyAtTarget = (idx.byTeacherSlot.get(teacher.id)?.get(targetKey) ?? []).filter(
        (l) => l.id !== other.id,
      );
      if (busyAtTarget.length > 0) continue;
    }
    if (other.teacherId) {
      const otherTeacher = idx.teacherById.get(other.teacherId);
      if (otherTeacher?.unavailable.some((s) => slotKey(s.dayId, s.periodIndex) === sourceKey)) continue;
      const busyAtSource = (idx.byTeacherSlot.get(other.teacherId)?.get(sourceKey) ?? []).filter(
        (l) => l.id !== lesson.id,
      );
      if (busyAtSource.length > 0) continue;
    }

    out.push({
      other,
      reasonsAr: [
        `تبديل مع ${idx.subjectById.get(other.subjectId)?.nameAr ?? 'حصة'} — الشعبة ${
          idx.sectionById.get(other.sectionId)?.label ?? ''
        }`,
      ],
    });
  }

  return options.limit ? out.slice(0, options.limit) : out;
}
