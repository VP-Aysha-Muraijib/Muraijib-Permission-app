/**
 * تحليل الأنصبة: كم أُسند لكل معلمة، كم بقي، وكم فراغًا في جدولها.
 */

import type { ID, LoadStatus, TeacherWorkload } from '@/lib/domain/types';
import { slotKey, teachingPeriodsOf, type SnapshotIndex } from './snapshot';

export interface DayRun {
  dayId: ID;
  /** أرقام الفترات المشغولة في هذا اليوم، مرتبة. */
  busy: number[];
  /** الفترات التدريسية المتاحة في هذا اليوم. */
  available: number[];
}

/** الفراغ = فترة تدريسية شاغرة تقع بين حصتين في اليوم نفسه (لا قبل الأولى ولا بعد الأخيرة). */
export function gapsInDay(busy: number[], available: number[]): number {
  if (busy.length < 2) return 0;
  const first = busy[0];
  const last = busy[busy.length - 1];
  const busySet = new Set(busy);
  return available.filter((p) => p > first && p < last && !busySet.has(p)).length;
}

/** أطول سلسلة حصص متتالية داخل اليوم. */
export function longestRunInDay(busy: number[], available: number[]): number {
  if (busy.length === 0) return 0;
  const order = new Map(available.map((p, i) => [p, i]));
  let best = 1;
  let run = 1;
  for (let i = 1; i < busy.length; i++) {
    const prev = order.get(busy[i - 1]);
    const cur = order.get(busy[i]);
    if (prev !== undefined && cur !== undefined && cur === prev + 1) run += 1;
    else run = 1;
    if (run > best) best = run;
  }
  return best;
}

export function teacherDayRuns(idx: SnapshotIndex, teacherId: ID): DayRun[] {
  const lessons = idx.byTeacher.get(teacherId) ?? [];
  return idx.teachingDays.map((day) => {
    const available = teachingPeriodsOf(day);
    const busy = lessons
      .filter((l) => l.dayId === day.id)
      .map((l) => l.periodIndex)
      .sort((a, b) => a - b);
    return { dayId: day.id, busy, available };
  });
}

export function computeTeacherWorkload(idx: SnapshotIndex, teacherId: ID): TeacherWorkload {
  const teacher = idx.teacherById.get(teacherId);
  const lessons = idx.byTeacher.get(teacherId) ?? [];
  const required = teacher?.requiredLoad ?? 0;
  const assigned = lessons.length;
  const runs = teacherDayRuns(idx, teacherId);

  let gaps = 0;
  let longestRun = 0;
  let daysUsed = 0;
  let firstPeriods = 0;
  let lastPeriods = 0;

  for (const run of runs) {
    if (run.busy.length === 0) continue;
    daysUsed += 1;
    gaps += gapsInDay(run.busy, run.available);
    longestRun = Math.max(longestRun, longestRunInDay(run.busy, run.available));
    const firstAvailable = run.available[0];
    const lastAvailable = run.available[run.available.length - 1];
    if (run.busy.includes(firstAvailable)) firstPeriods += 1;
    if (run.busy.includes(lastAvailable)) lastPeriods += 1;
  }

  // حجز مزدوج داخل نفس المعلمة
  let hasConflict = false;
  const seen = new Set<string>();
  for (const lesson of lessons) {
    const key = slotKey(lesson.dayId, lesson.periodIndex);
    if (seen.has(key)) {
      hasConflict = true;
      break;
    }
    seen.add(key);
  }

  let status: LoadStatus;
  if (hasConflict) status = 'conflict';
  else if (assigned === 0) status = 'empty';
  else if (assigned > (teacher?.maxLoad ?? required)) status = 'over';
  else if (assigned > required) status = 'over';
  else if (assigned < required) status = 'under';
  else status = 'complete';

  return {
    teacherId,
    required,
    assigned,
    remaining: required - assigned,
    maxLoad: teacher?.maxLoad ?? required,
    gaps,
    longestRun,
    firstPeriods,
    lastPeriods,
    daysUsed,
    status,
    hasConflict,
  };
}

export function computeAllWorkloads(idx: SnapshotIndex): TeacherWorkload[] {
  return idx.snapshot.teachers.map((t) => computeTeacherWorkload(idx, t.id));
}

/** الخانات التدريسية الشاغرة لدى معلمة معيّنة (مع احترام عدم التوفر). */
export function freeSlotsOf(idx: SnapshotIndex, teacherId: ID) {
  const teacher = idx.teacherById.get(teacherId);
  const busy = new Set(
    (idx.byTeacher.get(teacherId) ?? []).map((l) => slotKey(l.dayId, l.periodIndex)),
  );
  const blocked = new Set((teacher?.unavailable ?? []).map((s) => slotKey(s.dayId, s.periodIndex)));
  return idx.teachingSlots.filter((s) => {
    const key = slotKey(s.dayId, s.periodIndex);
    return !busy.has(key) && !blocked.has(key);
  });
}
