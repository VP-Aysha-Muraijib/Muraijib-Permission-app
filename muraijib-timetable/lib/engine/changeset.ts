/**
 * ChangeSet — الوحدة الوحيدة للتغيير في المنظومة.
 *
 * سواء جاء التغيير من السحب والإفلات، أو من المساعد الذكي، أو من الاستيراد،
 * فهو يُمثَّل هنا بالشكل نفسه، ويمرّ بالتحقق نفسه، ويُسجَّل بالطريقة نفسها.
 */

import type {
  ChangeImpact,
  ChangeSet,
  ChangeSource,
  ID,
  Lesson,
  Op,
  ScheduleSnapshot,
} from '@/lib/domain/types';

let counter = 0;
/** معرّف محلي مستقر داخل الجلسة — المعرّف النهائي يمنحه الخادم عند الاعتماد. */
export const localId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${(counter++).toString(36)}`;

export interface BuildChangeSetInput {
  baseVersionId: ID;
  source: ChangeSource;
  summaryAr: string;
  reason: string;
  ops: Op[];
  createdBy: string;
}

export function buildChangeSet(input: BuildChangeSetInput): ChangeSet {
  return {
    id: localId('cs'),
    baseVersionId: input.baseVersionId,
    source: input.source,
    status: 'draft',
    summaryAr: input.summaryAr,
    reason: input.reason,
    ops: input.ops,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
  };
}

/**
 * تطبيق العمليات على نسخة من اللقطة — بلا أي أثر جانبي على الأصل.
 * هذه الدالة هي أساس المعاينة والمحاكاة والتراجع معًا.
 */
export function applyOps(snapshot: ScheduleSnapshot, ops: Op[]): ScheduleSnapshot {
  const lessons = new Map<ID, Lesson>(snapshot.lessons.map((l) => [l.id, { ...l }]));

  for (const op of ops) {
    switch (op.t) {
      case 'move': {
        const lesson = lessons.get(op.lessonId);
        if (!lesson) break;
        lesson.dayId = op.to.dayId;
        lesson.periodIndex = op.to.periodIndex;
        break;
      }
      case 'swap': {
        const a = lessons.get(op.aId);
        const b = lessons.get(op.bId);
        if (!a || !b) break;
        const slot = { dayId: a.dayId, periodIndex: a.periodIndex };
        a.dayId = b.dayId;
        a.periodIndex = b.periodIndex;
        b.dayId = slot.dayId;
        b.periodIndex = slot.periodIndex;
        break;
      }
      case 'assign': {
        const lesson = lessons.get(op.lessonId);
        if (!lesson) break;
        lesson.teacherId = op.teacherId;
        break;
      }
      case 'room': {
        const lesson = lessons.get(op.lessonId);
        if (!lesson) break;
        lesson.roomId = op.roomId;
        break;
      }
      case 'lock':
      case 'unlock': {
        const lesson = lessons.get(op.lessonId);
        if (!lesson) break;
        lesson.isLocked = op.t === 'lock';
        break;
      }
      case 'create': {
        const id = op.lesson.id ?? localId('l');
        lessons.set(id, { ...(op.lesson as Lesson), id });
        break;
      }
      case 'delete': {
        lessons.delete(op.lessonId);
        break;
      }
    }
  }

  return { ...snapshot, lessons: [...lessons.values()] };
}

/** عكس مجموعة تغيير — أساس زر التراجع (Undo). */
export function invertOps(snapshot: ScheduleSnapshot, ops: Op[]): Op[] {
  const before = new Map(snapshot.lessons.map((l) => [l.id, l]));
  const inverted: Op[] = [];

  for (const op of [...ops].reverse()) {
    switch (op.t) {
      case 'move': {
        const lesson = before.get(op.lessonId);
        if (lesson) {
          inverted.push({
            t: 'move',
            lessonId: op.lessonId,
            to: { dayId: lesson.dayId, periodIndex: lesson.periodIndex },
          });
        }
        break;
      }
      case 'swap':
        inverted.push(op);
        break;
      case 'assign': {
        const lesson = before.get(op.lessonId);
        if (lesson) inverted.push({ t: 'assign', lessonId: op.lessonId, teacherId: lesson.teacherId });
        break;
      }
      case 'room': {
        const lesson = before.get(op.lessonId);
        if (lesson) inverted.push({ t: 'room', lessonId: op.lessonId, roomId: lesson.roomId });
        break;
      }
      case 'lock':
        inverted.push({ t: 'unlock', lessonId: op.lessonId });
        break;
      case 'unlock':
        inverted.push({ t: 'lock', lessonId: op.lessonId });
        break;
      case 'create':
        if (op.lesson.id) inverted.push({ t: 'delete', lessonId: op.lesson.id });
        break;
      case 'delete': {
        const lesson = before.get(op.lessonId);
        if (lesson) inverted.push({ t: 'create', lesson });
        break;
      }
    }
  }

  return inverted;
}

/** فرق حقيقي بين لقطتين على مستوى الحصة — لا يعتمد على عدد العمليات. */
export interface LessonDiff {
  added: Lesson[];
  removed: Lesson[];
  changed: Array<{ before: Lesson; after: Lesson; fields: string[] }>;
}

export function diffLessons(before: ScheduleSnapshot, after: ScheduleSnapshot): LessonDiff {
  const beforeMap = new Map(before.lessons.map((l) => [l.id, l]));
  const afterMap = new Map(after.lessons.map((l) => [l.id, l]));

  const added: Lesson[] = [];
  const removed: Lesson[] = [];
  const changed: LessonDiff['changed'] = [];

  for (const [id, lesson] of afterMap) {
    const prev = beforeMap.get(id);
    if (!prev) {
      added.push(lesson);
      continue;
    }
    const fields: string[] = [];
    if (prev.dayId !== lesson.dayId || prev.periodIndex !== lesson.periodIndex) fields.push('slot');
    if (prev.teacherId !== lesson.teacherId) fields.push('teacher');
    if (prev.roomId !== lesson.roomId) fields.push('room');
    if (prev.subjectId !== lesson.subjectId) fields.push('subject');
    if (prev.isLocked !== lesson.isLocked) fields.push('lock');
    if (fields.length > 0) changed.push({ before: prev, after: lesson, fields });
  }

  for (const [id, lesson] of beforeMap) {
    if (!afterMap.has(id)) removed.push(lesson);
  }

  return { added, removed, changed };
}

export function computeImpact(
  before: ScheduleSnapshot,
  after: ScheduleSnapshot,
  scoreBefore: number,
  scoreAfter: number,
): ChangeImpact {
  const diff = diffLessons(before, after);
  const teachers = new Set<ID>();
  const sections = new Set<ID>();

  const touch = (lesson: Lesson) => {
    if (lesson.teacherId) teachers.add(lesson.teacherId);
    sections.add(lesson.sectionId);
  };
  diff.added.forEach(touch);
  diff.removed.forEach(touch);
  diff.changed.forEach((c) => {
    touch(c.before);
    touch(c.after);
  });

  return {
    lessonsChanged: diff.added.length + diff.removed.length + diff.changed.length,
    teachersAffected: [...teachers],
    sectionsAffected: [...sections],
    scoreBefore,
    scoreAfter,
  };
}
