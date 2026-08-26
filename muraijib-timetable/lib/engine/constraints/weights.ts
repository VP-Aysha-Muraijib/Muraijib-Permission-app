/**
 * أوزان القيود المرنة — مكان واحد لضبط "ما الذي يعنيه جدول جيد".
 * تُعدَّل من الإعدادات دون لمس منطق الحساب.
 */

export interface SoftWeights {
  subjectDaySpread: number;
  teacherGaps: number;
  teacherConsecutive: number;
  firstLastFairness: number;
  subjectClustering: number;
  coreSubjectEarly: number;
  teacherPreferences: number;
  workloadBalance: number;
}

export const DEFAULT_WEIGHTS: SoftWeights = {
  subjectDaySpread: 18,
  teacherGaps: 16,
  teacherConsecutive: 12,
  firstLastFairness: 12,
  subjectClustering: 10,
  coreSubjectEarly: 10,
  teacherPreferences: 12,
  workloadBalance: 10,
};

/** أقصى عدد حصص متتالية قبل أن يُعدّ التتابع مرهقًا. */
export const MAX_COMFORTABLE_RUN = 3;
