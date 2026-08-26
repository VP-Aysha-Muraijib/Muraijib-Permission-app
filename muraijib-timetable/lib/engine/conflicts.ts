/**
 * فحص صحة الجدول — تجميع الانتهاكات في صورة صالحة للعرض التنفيذي.
 */

import type { ScheduleSnapshot, Severity, Violation } from '@/lib/domain/types';
import { buildIndex, type SnapshotIndex } from './snapshot';
import { HARD_CONSTRAINTS, isBlocking, runHardConstraints } from './constraints/hard';
import { computeAllWorkloads } from './workload';
import { scoreIndex } from './score';

export interface HealthGroup {
  constraintId: string;
  labelAr: string;
  severity: Severity;
  count: number;
  violations: Violation[];
}

export interface HealthReport {
  score: number;
  valid: boolean;
  totals: {
    teacherConflicts: number;
    sectionConflicts: number;
    roomConflicts: number;
    missingLessons: number;
    unassigned: number;
    overload: number;
    underload: number;
    poorDistribution: number;
    blocking: number;
  };
  groups: HealthGroup[];
  violations: Violation[];
}

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export function runHealthCheck(idxOrSnapshot: SnapshotIndex | ScheduleSnapshot): HealthReport {
  const idx =
    'snapshot' in idxOrSnapshot ? (idxOrSnapshot as SnapshotIndex) : buildIndex(idxOrSnapshot);

  const violations = runHardConstraints(idx);
  const score = scoreIndex(idx);
  const workloads = computeAllWorkloads(idx);

  const byConstraint = new Map<string, Violation[]>();
  for (const violation of violations) {
    const arr = byConstraint.get(violation.constraintId);
    if (arr) arr.push(violation);
    else byConstraint.set(violation.constraintId, [violation]);
  }

  const labelOf = (id: string) =>
    HARD_CONSTRAINTS.find((c) => c.id === id)?.labelAr ?? id;

  const groups: HealthGroup[] = [...byConstraint.entries()]
    .map(([constraintId, list]) => ({
      constraintId,
      labelAr: constraintId === 'lesson-unassigned' ? 'حصص بلا معلمة' : labelOf(constraintId),
      severity: list.reduce<Severity>(
        (worst, cur) => (SEVERITY_RANK[cur.severity] < SEVERITY_RANK[worst] ? cur.severity : worst),
        'low',
      ),
      count: list.length,
      violations: list,
    }))
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.count - a.count);

  const countOf = (id: string) => byConstraint.get(id)?.length ?? 0;
  const missing = (byConstraint.get('curriculum-completeness') ?? []).filter((x) =>
    x.messageAr.includes('ينقصها'),
  ).length;

  const distributionLine = score.lines.find((l) => l.constraintId === 'subject-day-spread');
  const clusteringLine = score.lines.find((l) => l.constraintId === 'subject-clustering');
  const poorDistribution =
    (distributionLine && distributionLine.normalized < 0.8 ? 1 : 0) +
    (clusteringLine && clusteringLine.normalized < 0.8 ? 1 : 0);

  return {
    score: score.total,
    valid: score.valid,
    totals: {
      teacherConflicts: countOf('teacher-double-booking'),
      sectionConflicts: countOf('section-double-booking'),
      roomConflicts: countOf('room-conflict'),
      missingLessons: missing,
      unassigned: countOf('lesson-unassigned'),
      overload: workloads.filter((w) => w.status === 'over').length,
      underload: workloads.filter((w) => w.status === 'under').length,
      poorDistribution,
      blocking: violations.filter(isBlocking).length,
    },
    groups,
    violations,
  };
}
