/**
 * Minimal Disruption Mode — إصلاح الجدول بأقل عدد ممكن من التغييرات.
 *
 * المبدأ: عند تغيّر خلال العام لا يُعاد بناء الجدول. تُحدَّد الحصص المتضررة،
 * ويُجمَّد كل ما عداها، ثم يُبحث عن حل بعمق متزايد:
 *   إسناد مباشر  →  نقل الحصة  →  تبديل  →  ترك الحصة بلا معلمة (مع بيان السبب)
 */

import type { ChangeSet, ID, Lesson, Op, ScheduleSnapshot } from '@/lib/domain/types';
import { applyOps, buildChangeSet, computeImpact } from './changeset';
import { buildIndex, periodLabel, slotKey, type SnapshotIndex } from './snapshot';
import { scoreIndex } from './score';
import { findAvailableSlots, findAvailableTeachers, type FindTeachersOptions } from './solver';
import { computeAllWorkloads } from './workload';

export interface RepairOptions {
  /** لا تُمسّ حصص هذه الشعب إطلاقًا. */
  frozenSectionIds?: Set<ID>;
  /** لا تُمسّ حصص هذه الصفوف. */
  frozenGradeIds?: Set<ID>;
  /** معلمات لا يجوز إسناد شيء لهن (المنقولة مثلًا). */
  excludeTeacherIds?: Set<ID>;
  /** السماح بتجاوز النصاب المطلوب دون الحد الأعلى. */
  allowAboveRequired?: boolean;
  /** السماح بنقل الحصة إلى خانة أخرى بحثًا عن معلمة متاحة. */
  allowMoves?: boolean;
  createdBy?: string;
}

export type RepairStrategy = 'minimal' | 'balanced' | 'quality';

export interface RepairProposal {
  strategy: RepairStrategy;
  titleAr: string;
  subtitleAr: string;
  changeSet: ChangeSet;
  score: number;
  lessonsChanged: number;
  resolvedCount: number;
  /** حصص تعذّر إيجاد حل لها، مع السبب. */
  unresolved: Array<{ lesson: Lesson; reasonAr: string }>;
  impact: ReturnType<typeof computeImpact>;
}

/** الحصص التي تحتاج معلمة: بلا إسناد، أو مسندة لمعلمة منقولة/في إجازة/مستبعدة. */
export function findOrphanLessons(idx: SnapshotIndex, exclude: Set<ID> = new Set()): Lesson[] {
  return idx.snapshot.lessons.filter((lesson) => {
    if (!lesson.teacherId) return true;
    if (exclude.has(lesson.teacherId)) return true;
    const teacher = idx.teacherById.get(lesson.teacherId);
    return !teacher || teacher.status === 'transferred' || teacher.status === 'on_leave';
  });
}

function isFrozen(idx: SnapshotIndex, lesson: Lesson, options: RepairOptions): boolean {
  if (idx.lockedLessonIds.has(lesson.id)) return true;
  if (options.frozenSectionIds?.has(lesson.sectionId)) return true;
  const section = idx.sectionById.get(lesson.sectionId);
  if (section && options.frozenGradeIds?.has(section.gradeId)) return true;
  return false;
}

/** ترتيب المرشحات حسب استراتيجية الحل. */
function rankFor(strategy: RepairStrategy) {
  return (a: { fit: number; remainingAfter: number }, b: { fit: number; remainingAfter: number }) => {
    if (strategy === 'balanced') {
      // الأولوية لمن ينقصها أكبر عدد من الحصص — لتقريب الجميع من نصابهن.
      const diff = b.remainingAfter - a.remainingAfter;
      if (diff !== 0) return diff;
    }
    return b.fit - a.fit;
  };
}

function solve(
  snapshot: ScheduleSnapshot,
  orphans: Lesson[],
  strategy: RepairStrategy,
  options: RepairOptions,
): { ops: Op[]; unresolved: Array<{ lesson: Lesson; reasonAr: string }> } {
  const idx = buildIndex(snapshot);
  const ops: Op[] = [];
  const unresolved: Array<{ lesson: Lesson; reasonAr: string }> = [];

  // حجوزات مؤقتة داخل الجولة: لا يجوز إسناد معلمتين لنفس الخانة في مقترح واحد.
  const pendingByTeacher = new Map<ID, Set<string>>();
  const pendingLoad = new Map<ID, number>();
  const pendingSectionSlots = new Set<string>();

  const reserve = (teacherId: ID, key: string) => {
    const set = pendingByTeacher.get(teacherId) ?? new Set<string>();
    set.add(key);
    pendingByTeacher.set(teacherId, set);
    pendingLoad.set(teacherId, (pendingLoad.get(teacherId) ?? 0) + 1);
  };

  const searchOptions = (): FindTeachersOptions => ({
    exclude: options.excludeTeacherIds,
    allowAboveRequired: options.allowAboveRequired ?? strategy !== 'balanced',
    pendingByTeacher,
    pendingLoad,
  });

  // الأصعب أولًا (Most-Constrained-First): الحصة التي لها أقل عدد مرشحات تُحلّ قبل غيرها،
  // وإلا استهلكت الحصص السهلة المعلمات المتاحة وتُركت الصعبة بلا حل.
  const ordered = [...orphans]
    .map((lesson) => ({
      lesson,
      count: findAvailableTeachers(idx, lesson, searchOptions()).candidates.length,
    }))
    .sort((a, b) => a.count - b.count)
    .map((x) => x.lesson);

  for (const lesson of ordered) {
    if (isFrozen(idx, lesson, options)) {
      unresolved.push({ lesson, reasonAr: 'الحصة مقفلة أو ضمن نطاق مستثنى من التعديل.' });
      continue;
    }

    // ① إسناد مباشر في مكان الحصة الحالي — صفر إزعاج للجدول.
    const direct = findAvailableTeachers(idx, lesson, searchOptions());
    const rank = rankFor(strategy);
    const best = [...direct.candidates].sort(rank)[0];

    if (best) {
      ops.push({ t: 'assign', lessonId: lesson.id, teacherId: best.teacher.id });
      reserve(best.teacher.id, slotKey(lesson.dayId, lesson.periodIndex));
      continue;
    }

    // ② نقل الحصة إلى خانة أخرى تتوفر فيها معلمة مؤهلة.
    if (options.allowMoves !== false) {
      let moved = false;
      const slots = findAvailableSlots(idx, { ...lesson, teacherId: null }, { limit: 40 });

      for (const candidateSlot of slots) {
        const key = slotKey(candidateSlot.slot.dayId, candidateSlot.slot.periodIndex);
        if (pendingSectionSlots.has(`${lesson.sectionId}#${key}`)) continue;

        const search = findAvailableTeachers(
          idx,
          {
            subjectId: lesson.subjectId,
            sectionId: lesson.sectionId,
            dayId: candidateSlot.slot.dayId,
            periodIndex: candidateSlot.slot.periodIndex,
          },
          searchOptions(),
        );
        const pick = [...search.candidates].sort(rank)[0];
        if (!pick) continue;

        ops.push({ t: 'move', lessonId: lesson.id, to: candidateSlot.slot });
        ops.push({ t: 'assign', lessonId: lesson.id, teacherId: pick.teacher.id });
        reserve(pick.teacher.id, key);
        pendingSectionSlots.add(`${lesson.sectionId}#${key}`);
        moved = true;
        break;
      }
      if (moved) continue;
    }

    // ③ لا حل — يُذكر السبب صراحةً بدل ترك الحصة تختفي بصمت.
    const topReasons = direct.rejected
      .filter((r) => r.teacher.subjectIds.includes(lesson.subjectId))
      .slice(0, 3)
      .map((r) => `${r.teacher.nameAr}: ${r.reasonAr}`);

    unresolved.push({
      lesson,
      reasonAr:
        topReasons.length > 0
          ? `لا توجد معلمة متاحة في ${periodLabel(idx, { dayId: lesson.dayId, periodIndex: lesson.periodIndex })} — ${topReasons.join(' · ')}`
          : `لا توجد معلمة مكلَّفة بمادة ${idx.subjectById.get(lesson.subjectId)?.nameAr ?? ''} متاحة لهذه الحصة.`,
    });
  }

  return { ops, unresolved };
}

const STRATEGY_META: Record<RepairStrategy, { titleAr: string; subtitleAr: string }> = {
  minimal: {
    titleAr: 'الحل الأول — أقل تغيير',
    subtitleAr: 'إسناد الحصص في أماكنها الحالية قدر الإمكان، دون تحريك الجدول.',
  },
  balanced: {
    titleAr: 'الحل الثاني — أفضل توازن للأنصبة',
    subtitleAr: 'توزيع الحصص على المعلمات الأقل نصابًا لتقريب الجميع من النصاب المطلوب.',
  },
  quality: {
    titleAr: 'الحل الثالث — أفضل جودة للجدول',
    subtitleAr: 'يُسمح بتحريك الحصص عند الحاجة للحصول على أعلى درجة جودة.',
  },
};

/**
 * توليد مقترحات مرتّبة لإصلاح الجدول.
 * لا تُطبَّق أي منها — كلها مجموعات تغيير تنتظر موافقة صريحة.
 */
export function generateRepairProposals(
  snapshot: ScheduleSnapshot,
  orphans: Lesson[],
  options: RepairOptions = {},
): RepairProposal[] {
  const baseScore = scoreIndex(buildIndex(snapshot));
  const proposals: RepairProposal[] = [];

  const configs: Array<{ strategy: RepairStrategy; options: RepairOptions }> = [
    { strategy: 'minimal', options: { ...options, allowMoves: false } },
    { strategy: 'balanced', options: { ...options, allowMoves: options.allowMoves ?? false } },
    { strategy: 'quality', options: { ...options, allowMoves: true, allowAboveRequired: true } },
  ];

  for (const config of configs) {
    const { ops, unresolved } = solve(snapshot, orphans, config.strategy, config.options);
    if (ops.length === 0 && unresolved.length === orphans.length && proposals.length > 0) continue;

    const next = applyOps(snapshot, ops);
    const score = scoreIndex(buildIndex(next));
    const impact = computeImpact(snapshot, next, baseScore.total, score.total);
    const meta = STRATEGY_META[config.strategy];

    proposals.push({
      strategy: config.strategy,
      titleAr: meta.titleAr,
      subtitleAr: meta.subtitleAr,
      changeSet: buildChangeSet({
        baseVersionId: snapshot.versionId,
        source: 'repair',
        summaryAr: `${meta.titleAr} — ${impact.lessonsChanged} حصة تتغيّر`,
        reason: 'إعادة توزيع حصص متأثرة',
        ops,
        createdBy: options.createdBy ?? 'system',
      }),
      score: score.total,
      lessonsChanged: impact.lessonsChanged,
      resolvedCount: orphans.length - unresolved.length,
      unresolved,
      impact,
    });
  }

  // إزالة المقترحات المتطابقة في النتيجة والعدد — لا فائدة من عرض ثلاثة حلول متساوية.
  const seen = new Set<string>();
  const unique = proposals.filter((p) => {
    const key = `${p.lessonsChanged}#${p.score}#${p.unresolved.length}#${p.changeSet.ops.length}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.sort(
    (a, b) =>
      b.resolvedCount - a.resolvedCount ||
      b.score - a.score ||
      a.lessonsChanged - b.lessonsChanged,
  );
}

/** أثر انتقال معلمة قبل اتخاذ أي قرار. */
export interface TeacherRemovalImpact {
  teacherId: ID;
  teacherNameAr: string;
  lessonsToRedistribute: number;
  sectionsAffected: string[];
  subjectsAffected: string[];
  candidateTeachers: Array<{ teacherId: ID; nameAr: string; canTakeUpTo: number }>;
  proposals: RepairProposal[];
}

export function simulateTeacherRemoval(
  snapshot: ScheduleSnapshot,
  teacherId: ID,
  options: RepairOptions = {},
): TeacherRemovalImpact {
  const idx = buildIndex(snapshot);
  const teacher = idx.teacherById.get(teacherId);
  const lessons = idx.byTeacher.get(teacherId) ?? [];

  const exclude = new Set([...(options.excludeTeacherIds ?? []), teacherId]);
  const orphans = lessons.filter((l) => !idx.lockedLessonIds.has(l.id));

  // اللقطة المحاكاة: الحصص بلا معلمة، والمعلمة معلَّمة كمنقولة.
  const simulated: ScheduleSnapshot = {
    ...snapshot,
    teachers: snapshot.teachers.map((t) =>
      t.id === teacherId ? { ...t, status: 'transferred' as const } : t,
    ),
    lessons: snapshot.lessons.map((l) => (l.teacherId === teacherId ? { ...l, teacherId: null } : l)),
  };

  const workloads = computeAllWorkloads(idx);
  const subjectIds = new Set(lessons.map((l) => l.subjectId));

  const candidateTeachers = snapshot.teachers
    .filter(
      (t) =>
        t.id !== teacherId &&
        t.status !== 'transferred' &&
        t.status !== 'on_leave' &&
        t.subjectIds.some((s) => subjectIds.has(s)),
    )
    .map((t) => {
      const load = workloads.find((w) => w.teacherId === t.id);
      return {
        teacherId: t.id,
        nameAr: t.nameAr,
        canTakeUpTo: Math.max(0, t.maxLoad - (load?.assigned ?? 0)),
      };
    })
    .filter((t) => t.canTakeUpTo > 0)
    .sort((a, b) => b.canTakeUpTo - a.canTakeUpTo);

  return {
    teacherId,
    teacherNameAr: teacher?.nameAr ?? '—',
    lessonsToRedistribute: orphans.length,
    sectionsAffected: [...new Set(lessons.map((l) => idx.sectionById.get(l.sectionId)?.label ?? ''))].filter(Boolean),
    subjectsAffected: [...new Set(lessons.map((l) => idx.subjectById.get(l.subjectId)?.nameAr ?? ''))].filter(Boolean),
    candidateTeachers,
    proposals: generateRepairProposals(
      simulated,
      orphans.map((l) => ({ ...l, teacherId: null })),
      { ...options, excludeTeacherIds: exclude },
    ),
  };
}
