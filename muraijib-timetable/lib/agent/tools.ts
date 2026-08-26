/**
 * أدوات المساعد الذكي.
 *
 * قاعدة معمارية: هذه الطبقة **للقراءة والمحاكاة فقط**. لا تكتب في قاعدة البيانات،
 * ولا تُعدّل اللقطة. أقصى ما تنتجه مجموعة تغيير (ChangeSet) تنتظر موافقة صريحة.
 * الاعتماد نفسه يتم من الواجهة بعد ضغط المستخدم، لا من هنا.
 */

import type {
  ChangeSet,
  ID,
  Lesson,
  ScheduleSnapshot,
  TeacherWorkload,
  Violation,
} from '@/lib/domain/types';
import { buildIndex, periodLabel, type SnapshotIndex } from '@/lib/engine/snapshot';
import { runHealthCheck, type HealthReport } from '@/lib/engine/conflicts';
import { computeAllWorkloads, computeTeacherWorkload, freeSlotsOf } from '@/lib/engine/workload';
import { explainScore, scoreIndex } from '@/lib/engine/score';
import { findAvailableSlots, findAvailableTeachers } from '@/lib/engine/solver';
import {
  findOrphanLessons,
  generateRepairProposals,
  simulateTeacherRemoval,
  type RepairOptions,
  type RepairProposal,
} from '@/lib/engine/repair';
import { applyOps, computeImpact, diffLessons } from '@/lib/engine/changeset';
import { validateChangeSet } from '@/lib/engine/validator';

export interface AgentTools {
  index: SnapshotIndex;
  getTeacherSchedule(teacherId: ID): Lesson[];
  getClassSchedule(sectionId: ID): Lesson[];
  getTeacherWorkload(teacherId: ID): TeacherWorkload;
  getAllWorkloads(): TeacherWorkload[];
  findConflicts(): HealthReport;
  findAvailableTeachers: typeof findAvailableTeachers;
  findAvailableSlots: typeof findAvailableSlots;
  findFreeSlots(teacherId: ID): ReturnType<typeof freeSlotsOf>;
  simulateTeacherRemoval(teacherId: ID, options?: RepairOptions): ReturnType<typeof simulateTeacherRemoval>;
  simulateLessonMove(lessonId: ID, dayId: ID, periodIndex: number): ReturnType<typeof validateChangeSet> | null;
  calculateScheduleScore(): ReturnType<typeof scoreIndex>;
  explainScheduleScore(): ReturnType<typeof explainScore>;
  generateAlternativeSolutions(orphans: Lesson[], options?: RepairOptions): RepairProposal[];
  validateChangeSet(changeSet: ChangeSet): ReturnType<typeof validateChangeSet>;
  describeSlot(lesson: Lesson): string;
}

export function createTools(snapshot: ScheduleSnapshot): AgentTools {
  const index = buildIndex(snapshot);

  return {
    index,

    getTeacherSchedule: (teacherId) => index.byTeacher.get(teacherId) ?? [],
    getClassSchedule: (sectionId) => index.bySection.get(sectionId) ?? [],
    getTeacherWorkload: (teacherId) => computeTeacherWorkload(index, teacherId),
    getAllWorkloads: () => computeAllWorkloads(index),
    findConflicts: () => runHealthCheck(index),
    findAvailableTeachers,
    findAvailableSlots,
    findFreeSlots: (teacherId) => freeSlotsOf(index, teacherId),

    simulateTeacherRemoval: (teacherId, options) => simulateTeacherRemoval(snapshot, teacherId, options),

    simulateLessonMove: (lessonId, dayId, periodIndex) => {
      const lesson = index.lessonById.get(lessonId);
      if (!lesson) return null;
      return validateChangeSet(snapshot, {
        id: 'sim',
        baseVersionId: snapshot.versionId,
        source: 'agent',
        status: 'draft',
        summaryAr: 'محاكاة نقل حصة',
        reason: 'محاكاة',
        ops: [{ t: 'move', lessonId, to: { dayId, periodIndex } }],
        createdBy: 'agent',
        createdAt: new Date().toISOString(),
      });
    },

    calculateScheduleScore: () => scoreIndex(index),
    explainScheduleScore: () => explainScore(scoreIndex(index)),

    generateAlternativeSolutions: (orphans, options) =>
      generateRepairProposals(snapshot, orphans, options ?? {}),

    validateChangeSet: (changeSet) => validateChangeSet(snapshot, changeSet),

    describeSlot: (lesson) =>
      periodLabel(index, { dayId: lesson.dayId, periodIndex: lesson.periodIndex }),
  };
}

export { findOrphanLessons, applyOps, computeImpact, diffLessons };
export type { RepairProposal, Violation };
