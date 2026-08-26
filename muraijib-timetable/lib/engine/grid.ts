/**
 * هندسة الشبكة.
 *
 * الأيام ليست متطابقة: الخميس أقصر، والفسحة والصلاة تقع في مواضع مختلفة.
 * لذلك تُبنى صفوف الشبكة من اتحاد فترات كل الأيام، وتُترك الخلية فارغة
 * في اليوم الذي لا توجد فيه تلك الفترة — بدل افتراض أسبوع متماثل.
 */

import type { PeriodKind, SchoolDay, SchoolWeek } from '@/lib/domain/types';

export interface GridRow {
  index: number;
  kind: PeriodKind;
  labelAr: string;
  /** التوقيت المعروض — من أول يوم يحتوي هذه الفترة. */
  timeRange: string;
  /** تسلسل الحصة داخل اليوم (1، 2، 3…) — يتجاهل الطابور والفسحة والصلاة. */
  ordinal: number | null;
}

export interface GridGeometry {
  days: SchoolDay[];
  /** أيام توقيتها يخالف الصف المشترك أو لم يُزوَّد — تُعلَّم في الرأس. */
  daysWithOwnTimes: Set<string>;
  rows: GridRow[];
  /** أعمدة مسطّحة (يوم + فترة) — للعرض الرئيسي العريض. */
  columns: Array<{ day: SchoolDay; index: number; ordinal: number; labelAr: string; kind: PeriodKind }>;
  totalTeachingSlots: number;
}

export function buildGrid(week: SchoolWeek): GridGeometry {
  const days = week.days.filter((d) => d.isTeaching).sort((a, b) => a.sort - b.sort);

  const rowMap = new Map<number, GridRow>();
  for (const day of days) {
    let lessonNo = 0;
    for (const period of day.periods) {
      if (period.kind === 'lesson') lessonNo += 1;
      const existing = rowMap.get(period.index);
      if (!existing) {
        rowMap.set(period.index, {
          index: period.index,
          kind: period.kind,
          labelAr: period.labelAr,
          timeRange: period.startTime && period.endTime ? `${period.startTime} – ${period.endTime}` : '',
          ordinal: period.kind === 'lesson' ? lessonNo : null,
        });
      } else if (existing.kind !== 'lesson' && period.kind === 'lesson') {
        // إن اختلف نوع الفترة بين الأيام، تُعرض بوصفها حصة حتى لا تُخفى.
        rowMap.set(period.index, {
          ...existing,
          kind: 'lesson',
          labelAr: period.labelAr,
          ordinal: lessonNo,
        });
      }
    }
  }

  const rows = [...rowMap.values()].sort((a, b) => a.index - b.index);

  const columns = days.flatMap((day) => {
    let lessonNo = 0;
    return day.periods
      .filter((p) => p.kind === 'lesson')
      .map((p) => ({ day, index: p.index, ordinal: ++lessonNo, labelAr: p.labelAr, kind: p.kind }));
  });

  /**
   * صف الأوقات في الشبكة واحد لكل الأيام. اليوم الذي تختلف أوقاته — أو لم
   * تُزوَّد بعد — لا يجوز أن يرث أوقات غيره بصمت، فيُعلَّم ليُعرف أن الوقت
   * المعروض لا ينطبق عليه.
   */
  const daysWithOwnTimes = new Set<string>();
  for (const day of days) {
    for (const period of day.periods) {
      if (period.kind !== 'lesson') continue;
      const row = rowMap.get(period.index);
      if (!row) continue;
      const own = period.startTime && period.endTime ? `${period.startTime} – ${period.endTime}` : '';
      if (own !== row.timeRange) {
        daysWithOwnTimes.add(day.id);
        break;
      }
    }
  }

  return { days, rows, columns, daysWithOwnTimes, totalTeachingSlots: columns.length };
}

/** هل هذا اليوم يحتوي فعلًا فترة بهذا الرقم، وهل هي حصة؟ */
export function dayHasLesson(day: SchoolDay, index: number): boolean {
  return day.periods.some((p) => p.index === index && p.kind === 'lesson');
}

export function periodOf(day: SchoolDay, index: number) {
  return day.periods.find((p) => p.index === index) ?? null;
}
