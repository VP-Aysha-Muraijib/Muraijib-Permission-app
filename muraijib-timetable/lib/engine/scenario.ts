/**
 * What-if — تجربة تغيير دون المساس بالجدول الأساسي.
 *
 * السيناريو ليس نسخة من الجدول، بل قائمة عمليات فوق نسخة أساس.
 * هذا يجعل إنشاءه فوريًا، ومقارنته بالأصل دقيقة، وحذفه بلا أثر.
 */

import type { ID, Op, ScheduleSnapshot, Scenario } from '@/lib/domain/types';
import { applyOps, computeImpact, diffLessons, localId } from './changeset';
import { buildIndex } from './snapshot';
import { scoreIndex } from './score';
import type { ScheduleScore } from '@/lib/domain/types';
import { runHealthCheck, type HealthReport } from './conflicts';

export interface ScenarioResult {
  scenario: Scenario;
  snapshot: ScheduleSnapshot;
  score: ScheduleScore;
  health: HealthReport;
  impact: ReturnType<typeof computeImpact>;
  diff: ReturnType<typeof diffLessons>;
}

export function createScenario(
  base: ScheduleSnapshot,
  input: { name: string; ops: Op[]; createdBy: string; note?: string },
): Scenario {
  return {
    id: localId('scn'),
    name: input.name,
    baseVersionId: base.versionId,
    ops: input.ops,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
    note: input.note,
  };
}

export function evaluateScenario(base: ScheduleSnapshot, scenario: Scenario): ScenarioResult {
  const baseScore = scoreIndex(buildIndex(base));
  const snapshot = applyOps(base, scenario.ops);
  const idx = buildIndex(snapshot);
  const score = scoreIndex(idx);

  return {
    scenario,
    snapshot,
    score,
    health: runHealthCheck(idx),
    impact: computeImpact(base, snapshot, baseScore.total, score.total),
    diff: diffLessons(base, snapshot),
  };
}

/** مقارنة سيناريوهين (أو سيناريو بالأصل) على أسس قابلة للقرار. */
export interface ComparisonRow {
  labelAr: string;
  a: string | number;
  b: string | number;
  better: 'a' | 'b' | 'same';
}

export function compareResults(
  aLabel: string,
  a: ScenarioResult,
  bLabel: string,
  b: ScenarioResult,
): { aLabel: string; bLabel: string; rows: ComparisonRow[] } {
  const row = (
    labelAr: string,
    av: number,
    bv: number,
    higherIsBetter: boolean,
  ): ComparisonRow => ({
    labelAr,
    a: av,
    b: bv,
    better: av === bv ? 'same' : (av > bv) === higherIsBetter ? 'a' : 'b',
  });

  return {
    aLabel,
    bLabel,
    rows: [
      row('درجة جودة الجدول', a.score.total, b.score.total, true),
      row('عدد الحصص المتغيّرة', a.impact.lessonsChanged, b.impact.lessonsChanged, false),
      row('تعارضات المعلمات', a.health.totals.teacherConflicts, b.health.totals.teacherConflicts, false),
      row('تعارضات الشعب', a.health.totals.sectionConflicts, b.health.totals.sectionConflicts, false),
      row('حصص بلا معلمة', a.health.totals.unassigned, b.health.totals.unassigned, false),
      row('حصص ناقصة', a.health.totals.missingLessons, b.health.totals.missingLessons, false),
      row('معلمات فوق النصاب', a.health.totals.overload, b.health.totals.overload, false),
      row('معلمات دون النصاب', a.health.totals.underload, b.health.totals.underload, false),
    ],
  };
}

/** محاكاة انضمام معلمة جديدة: كم حصة تستطيع أن تأخذ، ومن أي الزميلات المثقلات. */
export function simulateTeacherAddition(
  base: ScheduleSnapshot,
  teacher: { subjectIds: ID[]; requiredLoad: number },
): { relievableLessons: number; fromTeachers: Array<{ nameAr: string; over: number }> } {
  const idx = buildIndex(base);
  const overloaded = base.teachers
    .map((t) => ({
      teacher: t,
      assigned: (idx.byTeacher.get(t.id) ?? []).length,
    }))
    .filter((x) => x.assigned > x.teacher.requiredLoad)
    .filter((x) => x.teacher.subjectIds.some((s) => teacher.subjectIds.includes(s)));

  const totalOver = overloaded.reduce((a, x) => a + (x.assigned - x.teacher.requiredLoad), 0);
  const unassigned = base.lessons.filter(
    (l) => !l.teacherId && teacher.subjectIds.includes(l.subjectId),
  ).length;

  return {
    relievableLessons: Math.min(teacher.requiredLoad, totalOver + unassigned),
    fromTeachers: overloaded.map((x) => ({
      nameAr: x.teacher.nameAr,
      over: x.assigned - x.teacher.requiredLoad,
    })),
  };
}
