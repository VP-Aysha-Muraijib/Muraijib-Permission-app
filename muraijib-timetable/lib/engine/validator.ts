/**
 * التحقق من مجموعة تغيير قبل اعتمادها.
 *
 * يُشغَّل مرتين عمدًا: في الواجهة للمعاينة الفورية، وعلى الخادم قبل الكتابة.
 * الأول للراحة، والثاني هو الحارس الحقيقي — لا يُوثق بالأول أبدًا.
 */

import type { ChangeSet, ScheduleSnapshot, Violation } from '@/lib/domain/types';
import { applyOps, computeImpact, diffLessons, type LessonDiff } from './changeset';
import { isBlocking, runHardConstraints } from './constraints/hard';
import { buildIndex } from './snapshot';
import { scoreIndex } from './score';

export interface ValidationResult {
  ok: boolean;
  /** انتهاكات جديدة أحدثها هذا التغيير (لا انتهاكات كانت قائمة أصلًا). */
  introduced: Violation[];
  /** انتهاكات كانت قائمة وأصلحها هذا التغيير. */
  resolved: Violation[];
  /** كل انتهاكات الجدول بعد التغيير. */
  after: Violation[];
  blocking: Violation[];
  impact: ReturnType<typeof computeImpact>;
  diff: LessonDiff;
  scoreBefore: number;
  scoreAfter: number;
  nextSnapshot: ScheduleSnapshot;
}

/** بصمة الانتهاك — تُستخدم لتمييز الجديد من القائم. */
const fingerprint = (violation: Violation) =>
  [
    violation.constraintId,
    violation.slot ? `${violation.slot.dayId}#${violation.slot.periodIndex}` : '',
    [...violation.lessonIds].sort().join(','),
    [...violation.teacherIds].sort().join(','),
    [...violation.sectionIds].sort().join(','),
    violation.messageAr,
  ].join('|');

export function validateChangeSet(
  snapshot: ScheduleSnapshot,
  changeSet: ChangeSet,
): ValidationResult {
  const beforeIdx = buildIndex(snapshot);
  const beforeViolations = runHardConstraints(beforeIdx);
  const beforeScore = scoreIndex(beforeIdx);

  const nextSnapshot = applyOps(snapshot, changeSet.ops);
  const afterIdx = buildIndex(nextSnapshot);
  const afterViolations = runHardConstraints(afterIdx);
  const afterScore = scoreIndex(afterIdx);

  const beforeKeys = new Set(beforeViolations.map(fingerprint));
  const afterKeys = new Set(afterViolations.map(fingerprint));

  const introduced = afterViolations.filter((x) => !beforeKeys.has(fingerprint(x)));
  const resolved = beforeViolations.filter((x) => !afterKeys.has(fingerprint(x)));

  // القاعدة: يُمنع التغيير إذا أدخل انتهاكًا مانعًا جديدًا.
  // الانتهاكات المانعة القائمة أصلًا لا تُجمّد الجدول — وإلا تعذّر إصلاحه.
  const blocking = introduced.filter(isBlocking);

  // قاعدة إضافية صريحة: لا تُمسّ حصة مقفلة.
  const lockedViolations = lockedLessonsTouched(snapshot, changeSet);

  return {
    ok: blocking.length === 0 && lockedViolations.length === 0,
    introduced: [...lockedViolations, ...introduced],
    resolved,
    after: afterViolations,
    blocking: [...lockedViolations, ...blocking],
    impact: computeImpact(snapshot, nextSnapshot, beforeScore.total, afterScore.total),
    diff: diffLessons(snapshot, nextSnapshot),
    scoreBefore: beforeScore.total,
    scoreAfter: afterScore.total,
    nextSnapshot,
  };
}

/** كشف أي محاولة لتحريك أو حذف أو إعادة إسناد حصة مقفلة. */
function lockedLessonsTouched(snapshot: ScheduleSnapshot, changeSet: ChangeSet): Violation[] {
  const idx = buildIndex(snapshot);
  const out: Violation[] = [];

  const flag = (lessonId: string, action: string) => {
    if (!idx.lockedLessonIds.has(lessonId)) return;
    const lesson = idx.lessonById.get(lessonId);
    const subject = lesson ? idx.subjectById.get(lesson.subjectId)?.nameAr : '';
    const section = lesson ? idx.sectionById.get(lesson.sectionId)?.label : '';
    out.push({
      constraintId: 'locked-lesson-moved',
      kind: 'hard',
      severity: 'critical',
      messageAr: `الحصة مقفلة ولا يمكن ${action}: ${subject ?? ''} — الشعبة ${section ?? ''}. افتح القفل أولًا إن كنت تريد تغييرها.`,
      lessonIds: [lessonId],
      teacherIds: lesson?.teacherId ? [lesson.teacherId] : [],
      sectionIds: lesson ? [lesson.sectionId] : [],
    });
  };

  for (const op of changeSet.ops) {
    switch (op.t) {
      case 'move':
        flag(op.lessonId, 'نقلها');
        break;
      case 'swap':
        flag(op.aId, 'تبديلها');
        flag(op.bId, 'تبديلها');
        break;
      case 'assign':
        flag(op.lessonId, 'تغيير معلمتها');
        break;
      case 'delete':
        flag(op.lessonId, 'حذفها');
        break;
      default:
        break;
    }
  }

  return out;
}
