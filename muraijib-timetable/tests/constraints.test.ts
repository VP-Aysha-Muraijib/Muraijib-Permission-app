import { describe, expect, it } from 'vitest';
import { makeSnapshot } from './fixtures';
import { buildIndex } from '@/lib/engine/snapshot';
import { isBlocking, runHardConstraints } from '@/lib/engine/constraints/hard';
import { scoreSnapshot } from '@/lib/engine/score';

describe('القيود الصارمة', () => {
  it('جدول سليم لا يُنتج انتهاكات مانعة', () => {
    const idx = buildIndex(makeSnapshot());
    expect(runHardConstraints(idx).filter(isBlocking)).toHaveLength(0);
  });

  it('يكشف وجود المعلمة في شعبتين في الحصة نفسها', () => {
    const snapshot = makeSnapshot({
      sections: [
        { id: 's1', gradeId: 'g6', name: '1', label: '6/1', classTeacherId: null, isActive: true },
        { id: 's2', gradeId: 'g6', name: '2', label: '6/2', classTeacherId: null, isActive: true },
      ],
      lessons: [
        { id: 'l1', sectionId: 's1', subjectId: 'math', teacherId: 't1', dayId: 'd0', periodIndex: 1, roomId: null, isLocked: false },
        { id: 'l2', sectionId: 's2', subjectId: 'math', teacherId: 't1', dayId: 'd0', periodIndex: 1, roomId: null, isLocked: false },
      ],
    });
    const violations = runHardConstraints(buildIndex(snapshot));
    expect(violations.some((v) => v.constraintId === 'teacher-double-booking')).toBe(true);
  });

  it('يكشف وجود مادتين للشعبة نفسها في الحصة نفسها', () => {
    const snapshot = makeSnapshot({
      lessons: [
        { id: 'l1', sectionId: 's1', subjectId: 'math', teacherId: 't1', dayId: 'd0', periodIndex: 1, roomId: null, isLocked: false },
        { id: 'l2', sectionId: 's1', subjectId: 'sci', teacherId: 't2', dayId: 'd0', periodIndex: 1, roomId: null, isLocked: false },
      ],
    });
    const violations = runHardConstraints(buildIndex(snapshot));
    expect(violations.some((v) => v.constraintId === 'section-double-booking')).toBe(true);
  });

  it('يرفض إسناد مادة لمعلمة غير مكلَّفة بها', () => {
    const snapshot = makeSnapshot();
    snapshot.lessons[0].teacherId = 't2'; // معلمة العلوم على حصة رياضيات
    const violations = runHardConstraints(buildIndex(snapshot));
    expect(violations.some((v) => v.constraintId === 'teacher-not-qualified')).toBe(true);
  });

  it('يحترم أوقات عدم توفر المعلمة', () => {
    const snapshot = makeSnapshot();
    snapshot.teachers[0].unavailable = [{ dayId: 'd0', periodIndex: 1 }];
    const violations = runHardConstraints(buildIndex(snapshot));
    expect(violations.some((v) => v.constraintId === 'teacher-unavailable')).toBe(true);
  });

  it('يكشف نقص نصاب المادة للشعبة', () => {
    const snapshot = makeSnapshot();
    snapshot.lessons = snapshot.lessons.slice(0, 3); // حذف حصة علوم
    const violations = runHardConstraints(buildIndex(snapshot));
    const missing = violations.find((v) => v.constraintId === 'curriculum-completeness');
    expect(missing?.messageAr).toContain('ينقصها');
  });

  it('يمنع تكرار المادة فوق الحد اليومي', () => {
    const snapshot = makeSnapshot({
      lessons: [
        { id: 'l1', sectionId: 's1', subjectId: 'sci', teacherId: 't2', dayId: 'd0', periodIndex: 1, roomId: null, isLocked: false },
        { id: 'l2', sectionId: 's1', subjectId: 'sci', teacherId: 't2', dayId: 'd0', periodIndex: 2, roomId: null, isLocked: false },
      ],
    });
    const violations = runHardConstraints(buildIndex(snapshot));
    expect(violations.some((v) => v.constraintId === 'subject-max-per-day')).toBe(true);
  });

  it('يمنع وضع حصة في فترة غير تدريسية', () => {
    const snapshot = makeSnapshot();
    snapshot.week.days[0].periods[0].kind = 'assembly';
    const violations = runHardConstraints(buildIndex(snapshot));
    expect(violations.some((v) => v.constraintId === 'period-not-teaching')).toBe(true);
  });
});

describe('درجة جودة الجدول', () => {
  it('تساوي صفرًا عند وجود انتهاك مانع', () => {
    const snapshot = makeSnapshot({
      sections: [
        { id: 's1', gradeId: 'g6', name: '1', label: '6/1', classTeacherId: null, isActive: true },
        { id: 's2', gradeId: 'g6', name: '2', label: '6/2', classTeacherId: null, isActive: true },
      ],
      lessons: [
        { id: 'l1', sectionId: 's1', subjectId: 'math', teacherId: 't1', dayId: 'd0', periodIndex: 1, roomId: null, isLocked: false },
        { id: 'l2', sectionId: 's2', subjectId: 'math', teacherId: 't1', dayId: 'd0', periodIndex: 1, roomId: null, isLocked: false },
      ],
    });
    const score = scoreSnapshot(snapshot);
    expect(score.valid).toBe(false);
    expect(score.total).toBe(0);
  });

  it('تعطي درجة موجبة وقابلة للتفسير لجدول سليم', () => {
    const score = scoreSnapshot(makeSnapshot());
    expect(score.valid).toBe(true);
    expect(score.total).toBeGreaterThan(0);
    expect(score.lines.every((l) => l.detailAr.length > 0)).toBe(true);
  });
});
