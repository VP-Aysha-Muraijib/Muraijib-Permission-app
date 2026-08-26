/**
 * Schedule Quality Score.
 *
 * قاعدة صريحة: أي انتهاك صارم مانع ⇒ الدرجة صفر والجدول "غير صالح".
 * لا معنى لجدول جميل التوزيع وفيه معلمة في مكانين.
 */

import type { ScheduleScore, ScheduleSnapshot } from '@/lib/domain/types';
import { buildIndex, type SnapshotIndex } from './snapshot';
import { isBlocking, runHardConstraints } from './constraints/hard';
import { runSoftConstraints } from './constraints/soft';
import { DEFAULT_WEIGHTS, type SoftWeights } from './constraints/weights';

export function scoreIndex(idx: SnapshotIndex, weights: SoftWeights = DEFAULT_WEIGHTS): ScheduleScore {
  const hardViolations = runHardConstraints(idx);
  const blocking = hardViolations.filter(isBlocking);
  const lines = runSoftConstraints(idx, weights);

  const totalWeight = lines.reduce((a, l) => a + l.weight, 0);
  const earned = lines.reduce((a, l) => a + l.weight * l.normalized, 0);
  const soft = totalWeight === 0 ? 0 : (earned / totalWeight) * 100;

  // نقص/زيادة الحصص المطلوبة تخصم من الدرجة دون أن تمنع الحفظ.
  const completeness = hardViolations.filter(
    (h) => h.constraintId === 'curriculum-completeness' || h.constraintId === 'lesson-unassigned',
  ).length;
  const penalty = Math.min(25, completeness * 2);

  return {
    total: blocking.length > 0 ? 0 : Math.max(0, Math.round(soft - penalty)),
    valid: blocking.length === 0,
    hardViolations,
    lines,
  };
}

export function scoreSnapshot(
  snapshot: ScheduleSnapshot,
  weights: SoftWeights = DEFAULT_WEIGHTS,
): ScheduleScore {
  return scoreIndex(buildIndex(snapshot), weights);
}

/** شرح الدرجة بندًا بندًا: كم نقطة فُقدت في كل بند ولماذا. */
export function explainScore(score: ScheduleScore): Array<{
  labelAr: string;
  lost: number;
  of: number;
  detailAr: string;
}> {
  const totalWeight = score.lines.reduce((a, l) => a + l.weight, 0) || 1;
  return score.lines
    .map((line) => {
      const of = (line.weight / totalWeight) * 100;
      return {
        labelAr: line.labelAr,
        lost: Math.round(of * (1 - line.normalized) * 10) / 10,
        of: Math.round(of * 10) / 10,
        detailAr: line.detailAr,
      };
    })
    .sort((a, b) => b.lost - a.lost);
}
