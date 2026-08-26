/**
 * القيود المرنة — لا تمنع الاعتماد، لكنها تحدّد جودة الجدول.
 *
 * كل دالة تعيد قيمة معيارية 0..1 (1 = مثالي) مع شرح عربي.
 * لا رقم بلا تفسير: الشرح يُعرض للمستخدم بجانب الدرجة.
 */

import type { ID, ScoreLine } from '@/lib/domain/types';
import { slotKey, teachingPeriodsOf, type SnapshotIndex } from '../snapshot';
import { computeAllWorkloads, gapsInDay, teacherDayRuns } from '../workload';
import { DEFAULT_WEIGHTS, MAX_COMFORTABLE_RUN, type SoftWeights } from './weights';

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 1);
const pct = (n: number) => `${Math.round(n * 100)}%`;

/* ── توزيع المادة على أيام الأسبوع ── */
function subjectDaySpread(idx: SnapshotIndex): { value: number; detail: string } {
  let total = 0;
  let sum = 0;
  let worst: { label: string; ratio: number } | null = null;

  for (const section of idx.snapshot.sections) {
    if (!section.isActive) continue;
    const bySubject = new Map<ID, Set<ID>>();
    const counts = new Map<ID, number>();
    for (const lesson of idx.bySection.get(section.id) ?? []) {
      counts.set(lesson.subjectId, (counts.get(lesson.subjectId) ?? 0) + 1);
      const days = bySubject.get(lesson.subjectId) ?? new Set<ID>();
      days.add(lesson.dayId);
      bySubject.set(lesson.subjectId, days);
    }
    for (const [subjectId, count] of counts) {
      // المثالي: كل حصة في يوم مختلف، بحد أقصى عدد أيام الأسبوع.
      const ideal = Math.min(count, idx.teachingDays.length);
      const actual = bySubject.get(subjectId)?.size ?? 0;
      const ratio = ideal === 0 ? 1 : actual / ideal;
      sum += ratio;
      total += 1;
      if (!worst || ratio < worst.ratio) {
        worst = {
          label: `${idx.subjectById.get(subjectId)?.nameAr ?? 'مادة'} — ${section.label}`,
          ratio,
        };
      }
    }
  }

  const value = total === 0 ? 1 : sum / total;
  const detail =
    total === 0
      ? 'لا توجد حصص لتقييم توزيعها.'
      : value >= 0.95
        ? 'حصص المواد موزّعة على أيام الأسبوع بصورة جيدة.'
        : `أضعف توزيع: ${worst?.label ?? '—'} (${pct(worst?.ratio ?? 1)} من التوزيع المثالي).`;
  return { value: clamp01(value), detail };
}

/* ── تجميع المادة في يوم أو يومين ── */
function subjectClustering(idx: SnapshotIndex): { value: number; detail: string } {
  let violations = 0;
  let checked = 0;
  const examples: string[] = [];

  for (const section of idx.snapshot.sections) {
    if (!section.isActive) continue;
    const perSubjectDay = new Map<string, number>();
    const perSubject = new Map<ID, number>();
    for (const lesson of idx.bySection.get(section.id) ?? []) {
      const k = `${lesson.subjectId}#${lesson.dayId}`;
      perSubjectDay.set(k, (perSubjectDay.get(k) ?? 0) + 1);
      perSubject.set(lesson.subjectId, (perSubject.get(lesson.subjectId) ?? 0) + 1);
    }
    for (const [subjectId, count] of perSubject) {
      if (count < 3) continue;
      checked += 1;
      let maxInDay = 0;
      for (const day of idx.teachingDays) {
        maxInDay = Math.max(maxInDay, perSubjectDay.get(`${subjectId}#${day.id}`) ?? 0);
      }
      // أكثر من نصف حصص المادة في يوم واحد = تجميع.
      if (maxInDay > count / 2) {
        violations += 1;
        if (examples.length < 3) {
          examples.push(`${idx.subjectById.get(subjectId)?.nameAr ?? 'مادة'} — ${section.label}`);
        }
      }
    }
  }

  const value = checked === 0 ? 1 : 1 - violations / checked;
  return {
    value: clamp01(value),
    detail:
      violations === 0
        ? 'لا توجد مادة مجمَّعة في يوم واحد.'
        : `${violations} حالة تجميع${examples.length ? ` — منها: ${examples.join('، ')}` : ''}.`,
  };
}

/* ── فراغات المعلمات ── */
function teacherGaps(idx: SnapshotIndex): { value: number; detail: string } {
  let gaps = 0;
  let teacherDays = 0;
  let worst: { name: string; gaps: number } | null = null;

  for (const teacher of idx.snapshot.teachers) {
    let teacherGapCount = 0;
    for (const run of teacherDayRuns(idx, teacher.id)) {
      if (run.busy.length === 0) continue;
      teacherDays += 1;
      teacherGapCount += gapsInDay(run.busy, run.available);
    }
    gaps += teacherGapCount;
    if (!worst || teacherGapCount > worst.gaps) worst = { name: teacher.nameAr, gaps: teacherGapCount };
  }

  if (teacherDays === 0) return { value: 1, detail: 'لا توجد حصص لتقييم فراغاتها.' };

  /**
   * المعيار: متوسط الفراغات في اليوم الواحد للمعلمة الواحدة.
   *
   * القياس نسبةً إلى عدد الحصص كان يعطي عقوبة كاملة لأي مدرسة واقعية:
   * معلمة تدرّس ٢٠ حصة في أسبوع من ٣٦ خانة لا بدّ أن يتخلّل جدولها فراغات.
   * المرجع هنا ما يمكن بلوغه فعلًا: فراغ واحد في اليوم مقبول، وثلاثة فأكثر مرهقة.
   */
  const perDay = gaps / teacherDays;
  const value = 1 - Math.min(1, Math.max(0, (perDay - 1) / 2));

  return {
    value: clamp01(value),
    detail:
      gaps === 0
        ? 'لا توجد فراغات في جداول المعلمات.'
        : `متوسط ${perDay.toFixed(1)} فراغ في اليوم لكل معلمة (الإجمالي ${gaps})${
            worst && worst.gaps > 0 ? ` — أعلاها ${worst.name} بـ${worst.gaps} أسبوعيًا.` : '.'
          }`,
  };
}

/* ── الحصص المتتالية الطويلة ── */
function teacherConsecutive(idx: SnapshotIndex): { value: number; detail: string } {
  let overLong = 0;
  let days = 0;
  let worst = 0;
  let worstName = '';

  for (const teacher of idx.snapshot.teachers) {
    for (const run of teacherDayRuns(idx, teacher.id)) {
      if (run.busy.length === 0) continue;
      days += 1;
      const order = new Map(run.available.map((p, i) => [p, i]));
      let streak = 1;
      let best = 1;
      for (let i = 1; i < run.busy.length; i++) {
        const prev = order.get(run.busy[i - 1]);
        const cur = order.get(run.busy[i]);
        if (prev !== undefined && cur !== undefined && cur === prev + 1) streak += 1;
        else streak = 1;
        best = Math.max(best, streak);
      }
      if (best > MAX_COMFORTABLE_RUN) overLong += 1;
      if (best > worst) {
        worst = best;
        worstName = teacher.nameAr;
      }
    }
  }

  const value = days === 0 ? 1 : 1 - overLong / days;
  return {
    value: clamp01(value),
    detail:
      overLong === 0
        ? `لا توجد سلاسل تتجاوز ${MAX_COMFORTABLE_RUN} حصص متتالية.`
        : `${overLong} يوم فيه تتابع يتجاوز ${MAX_COMFORTABLE_RUN} حصص — أطولها ${worst} حصص لدى ${worstName}.`,
  };
}

/* ── عدالة الحصص الأولى والأخيرة ── */
function firstLastFairness(idx: SnapshotIndex): { value: number; detail: string } {
  const counts: number[] = [];
  let maxName = '';
  let maxCount = 0;

  for (const teacher of idx.snapshot.teachers) {
    const lessons = idx.byTeacher.get(teacher.id) ?? [];
    if (lessons.length === 0) continue;
    let count = 0;
    for (const day of idx.teachingDays) {
      const periods = teachingPeriodsOf(day);
      if (periods.length === 0) continue;
      const first = periods[0];
      const last = periods[periods.length - 1];
      for (const lesson of lessons) {
        if (lesson.dayId !== day.id) continue;
        if (lesson.periodIndex === first || lesson.periodIndex === last) count += 1;
      }
    }
    counts.push(count);
    if (count > maxCount) {
      maxCount = count;
      maxName = teacher.nameAr;
    }
  }

  if (counts.length === 0) return { value: 1, detail: 'لا توجد بيانات كافية.' };
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  const variance = counts.reduce((a, b) => a + (b - mean) ** 2, 0) / counts.length;
  const sd = Math.sqrt(variance);
  // انحراف معياري ≤ 1 حصة يُعدّ عدلًا مقبولًا.
  const value = 1 - Math.min(1, sd / 3);
  return {
    value: clamp01(value),
    detail: `متوسط الحصص الأولى/الأخيرة ${mean.toFixed(1)} لكل معلمة (انحراف ${sd.toFixed(1)})${maxCount ? ` — أعلاها ${maxName} بـ${maxCount}.` : '.'}`,
  };
}

/* ── المواد الأساسية في الحصص المبكرة ── */
function coreSubjectEarly(idx: SnapshotIndex): { value: number; detail: string } {
  let core = 0;
  let early = 0;
  for (const day of idx.teachingDays) {
    const periods = teachingPeriodsOf(day);
    if (periods.length === 0) continue;
    const half = periods[Math.floor(periods.length / 2)];
    for (const lesson of idx.snapshot.lessons) {
      if (lesson.dayId !== day.id) continue;
      if (!idx.subjectById.get(lesson.subjectId)?.isCore) continue;
      core += 1;
      if (lesson.periodIndex <= half) early += 1;
    }
  }
  if (core === 0) return { value: 1, detail: 'لم تُحدَّد مواد أساسية.' };
  const ratio = early / core;
  return {
    value: clamp01(ratio / 0.7), // 70% في النصف الأول = درجة كاملة
    detail: `${pct(ratio)} من حصص المواد الأساسية في النصف الأول من اليوم.`,
  };
}

/* ── رغبات المعلمات ── */
function teacherPreferences(idx: SnapshotIndex): { value: number; detail: string } {
  let weightSum = 0;
  let earned = 0;
  let honoured = 0;
  let breached = 0;

  for (const teacher of idx.snapshot.teachers) {
    if (teacher.preferences.length === 0) continue;
    const busy = new Set(
      (idx.byTeacher.get(teacher.id) ?? []).map((l) => slotKey(l.dayId, l.periodIndex)),
    );
    for (const pref of teacher.preferences) {
      const key = slotKey(pref.dayId, pref.periodIndex);
      const has = busy.has(key);
      const satisfied = pref.kind === 'preferred' ? has : !has;
      weightSum += pref.weight;
      if (satisfied) {
        earned += pref.weight;
        honoured += 1;
      } else {
        breached += 1;
      }
    }
  }

  if (weightSum === 0) return { value: 1, detail: 'لم تُسجَّل رغبات للمعلمات.' };
  return {
    value: clamp01(earned / weightSum),
    detail: `تحقّقت ${honoured} رغبة ولم تتحقق ${breached}.`,
  };
}

/* ── توازن الأنصبة ── */
function workloadBalance(idx: SnapshotIndex): { value: number; detail: string } {
  const loads = computeAllWorkloads(idx).filter((w) => w.required > 0);
  if (loads.length === 0) return { value: 1, detail: 'لم تُحدَّد أنصبة.' };
  const under = loads.filter((w) => w.status === 'under').length;
  const over = loads.filter((w) => w.status === 'over').length;
  const deviation =
    loads.reduce((a, w) => a + Math.abs(w.assigned - w.required), 0) / loads.length;
  const value = 1 - Math.min(1, deviation / 4);
  return {
    value: clamp01(value),
    detail:
      under + over === 0
        ? 'كل المعلمات ضمن النصاب المطلوب.'
        : `${under} معلمة أقل من النصاب و${over} أعلى منه (متوسط الانحراف ${deviation.toFixed(1)} حصة).`,
  };
}

export const SOFT_CONSTRAINTS = [
  { id: 'subject-day-spread', key: 'subjectDaySpread', labelAr: 'توزيع المادة على الأيام', run: subjectDaySpread },
  { id: 'teacher-gaps', key: 'teacherGaps', labelAr: 'تقليل فراغات المعلمات', run: teacherGaps },
  { id: 'teacher-consecutive', key: 'teacherConsecutive', labelAr: 'تقليل التتابع الطويل', run: teacherConsecutive },
  { id: 'first-last-fairness', key: 'firstLastFairness', labelAr: 'عدالة الحصص الأولى والأخيرة', run: firstLastFairness },
  { id: 'subject-clustering', key: 'subjectClustering', labelAr: 'منع تجميع المادة', run: subjectClustering },
  { id: 'core-subject-early', key: 'coreSubjectEarly', labelAr: 'المواد الأساسية مبكرًا', run: coreSubjectEarly },
  { id: 'teacher-preferences', key: 'teacherPreferences', labelAr: 'مراعاة رغبات المعلمات', run: teacherPreferences },
  { id: 'workload-balance', key: 'workloadBalance', labelAr: 'توازن الأنصبة', run: workloadBalance },
] as const satisfies ReadonlyArray<{
  id: string;
  key: keyof SoftWeights;
  labelAr: string;
  run: (idx: SnapshotIndex) => { value: number; detail: string };
}>;

export function runSoftConstraints(
  idx: SnapshotIndex,
  weights: SoftWeights = DEFAULT_WEIGHTS,
): ScoreLine[] {
  return SOFT_CONSTRAINTS.map((c) => {
    const { value, detail } = c.run(idx);
    return {
      constraintId: c.id,
      labelAr: c.labelAr,
      weight: weights[c.key],
      normalized: value,
      detailAr: detail,
    };
  });
}
