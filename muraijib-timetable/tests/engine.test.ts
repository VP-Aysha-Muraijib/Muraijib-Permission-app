import { describe, expect, it } from 'vitest';
import { makeSnapshot } from './fixtures';
import { buildIndex } from '@/lib/engine/snapshot';
import { buildGrid } from '@/lib/engine/grid';
import { applyOps, buildChangeSet, diffLessons, invertOps } from '@/lib/engine/changeset';
import { validateChangeSet } from '@/lib/engine/validator';
import { computeTeacherWorkload, gapsInDay, longestRunInDay } from '@/lib/engine/workload';
import { findAvailableSlots, findAvailableTeachers } from '@/lib/engine/solver';
import { generateRepairProposals, simulateTeacherRemoval } from '@/lib/engine/repair';
import { runHealthCheck } from '@/lib/engine/conflicts';
import { scoreSnapshot } from '@/lib/engine/score';

const cs = (ops: Parameters<typeof buildChangeSet>[0]['ops']) =>
  buildChangeSet({
    baseVersionId: 'v1',
    source: 'user',
    summaryAr: 'اختبار',
    reason: 'اختبار',
    ops,
    createdBy: 'test',
  });

describe('الأنصبة', () => {
  it('يحسب الفراغات بين الحصص فقط، لا قبل الأولى ولا بعد الأخيرة', () => {
    expect(gapsInDay([1, 4], [1, 2, 3, 4, 5])).toBe(2);
    expect(gapsInDay([3, 4], [1, 2, 3, 4, 5])).toBe(0);
    expect(gapsInDay([1], [1, 2, 3])).toBe(0);
  });

  it('يحسب أطول تتابع', () => {
    expect(longestRunInDay([1, 2, 3, 5], [1, 2, 3, 4, 5])).toBe(3);
    expect(longestRunInDay([1, 3, 5], [1, 2, 3, 4, 5])).toBe(1);
  });

  it('يصنّف حالة النصاب بدقة', () => {
    const idx = buildIndex(makeSnapshot());
    const load = computeTeacherWorkload(idx, 't1');
    expect(load.assigned).toBe(2);
    expect(load.required).toBe(4);
    expect(load.remaining).toBe(2);
    expect(load.status).toBe('under');
  });
});

describe('مجموعات التغيير', () => {
  it('لا تُعدّل اللقطة الأصلية', () => {
    const snapshot = makeSnapshot();
    const before = JSON.stringify(snapshot);
    applyOps(snapshot, [{ t: 'move', lessonId: 'l1', to: { dayId: 'd4', periodIndex: 3 } }]);
    expect(JSON.stringify(snapshot)).toBe(before);
  });

  it('عكس العمليات يعيد الجدول إلى حاله تمامًا', () => {
    const snapshot = makeSnapshot();
    const ops = [
      { t: 'move' as const, lessonId: 'l1', to: { dayId: 'd4', periodIndex: 3 } },
      { t: 'assign' as const, lessonId: 'l2', teacherId: null },
    ];
    const next = applyOps(snapshot, ops);
    const restored = applyOps(next, invertOps(snapshot, ops));
    const diff = diffLessons(snapshot, restored);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.changed).toHaveLength(0);
  });

  it('التبديل يتبادل الخانتين', () => {
    const snapshot = makeSnapshot();
    const next = applyOps(snapshot, [{ t: 'swap', aId: 'l1', bId: 'l3' }]);
    const l1 = next.lessons.find((l) => l.id === 'l1')!;
    const l3 = next.lessons.find((l) => l.id === 'l3')!;
    expect(l1.dayId).toBe('d2');
    expect(l3.dayId).toBe('d0');
  });
});

describe('التحقق قبل الاعتماد', () => {
  it('يقبل نقلًا سليمًا ويحسب الأثر', () => {
    const snapshot = makeSnapshot();
    const result = validateChangeSet(snapshot, cs([{ t: 'move', lessonId: 'l1', to: { dayId: 'd4', periodIndex: 2 } }]));
    expect(result.ok).toBe(true);
    expect(result.impact.lessonsChanged).toBe(1);
  });

  it('يرفض نقلًا يُحدث حجزًا مزدوجًا للمعلمة', () => {
    const snapshot = makeSnapshot({
      sections: [
        { id: 's1', gradeId: 'g6', name: '1', label: '6/1', classTeacherId: null, isActive: true },
        { id: 's2', gradeId: 'g6', name: '2', label: '6/2', classTeacherId: null, isActive: true },
      ],
      lessons: [
        { id: 'l1', sectionId: 's1', subjectId: 'math', teacherId: 't1', dayId: 'd0', periodIndex: 1, roomId: null, isLocked: false },
        { id: 'l2', sectionId: 's2', subjectId: 'math', teacherId: 't1', dayId: 'd1', periodIndex: 1, roomId: null, isLocked: false },
      ],
    });
    const result = validateChangeSet(snapshot, cs([{ t: 'move', lessonId: 'l2', to: { dayId: 'd0', periodIndex: 1 } }]));
    expect(result.ok).toBe(false);
    expect(result.blocking.some((v) => v.constraintId === 'teacher-double-booking')).toBe(true);
  });

  it('يمنع تحريك حصة مقفلة ويشرح السبب بالعربية', () => {
    const snapshot = makeSnapshot();
    snapshot.lessons[0].isLocked = true;
    const result = validateChangeSet(snapshot, cs([{ t: 'move', lessonId: 'l1', to: { dayId: 'd4', periodIndex: 2 } }]));
    expect(result.ok).toBe(false);
    expect(result.blocking[0].constraintId).toBe('locked-lesson-moved');
    expect(result.blocking[0].messageAr).toContain('مقفلة');
  });

  it('يحترم القفل الواسع على مستوى الصف', () => {
    const snapshot = makeSnapshot();
    snapshot.locks = [
      { id: 'lk1', scope: 'grade', refId: 'g6', createdBy: 'test', createdAt: new Date().toISOString() },
    ];
    const result = validateChangeSet(snapshot, cs([{ t: 'move', lessonId: 'l1', to: { dayId: 'd4', periodIndex: 2 } }]));
    expect(result.ok).toBe(false);
  });

  it('لا يحسب انتهاكًا قائمًا أصلًا على أنه انتهاك جديد', () => {
    const snapshot = makeSnapshot();
    snapshot.lessons = snapshot.lessons.slice(0, 3); // نقص قائم في نصاب العلوم
    const result = validateChangeSet(snapshot, cs([{ t: 'move', lessonId: 'l1', to: { dayId: 'd4', periodIndex: 2 } }]));
    expect(result.ok).toBe(true);
    expect(result.introduced.some((v) => v.constraintId === 'curriculum-completeness')).toBe(false);
  });
});

describe('البحث عن بدائل', () => {
  it('يستبعد غير المؤهلة ويشرح سبب الاستبعاد', () => {
    const snapshot = makeSnapshot();
    const idx = buildIndex(snapshot);
    const search = findAvailableTeachers(idx, {
      subjectId: 'math',
      sectionId: 's1',
      dayId: 'd4',
      periodIndex: 1,
    });
    expect(search.candidates.map((c) => c.teacher.id)).toContain('t1');
    expect(search.candidates.map((c) => c.teacher.id)).not.toContain('t2');
    expect(search.rejected.find((r) => r.teacher.id === 't2')?.reasonAr).toContain('غير مكلَّفة');
  });

  it('لا يقترح خانة تكسر الحد اليومي للمادة', () => {
    const snapshot = makeSnapshot();
    const idx = buildIndex(snapshot);
    const lesson = idx.lessonById.get('l3')!; // علوم، الحد اليومي 1
    const slots = findAvailableSlots(idx, lesson);
    expect(slots.some((s) => s.slot.dayId === 'd3')).toBe(false); // d3 فيها حصة علوم أخرى
  });
});

describe('إعادة التوزيع بأقل تغيير', () => {
  it('يسند حصص المعلمة المنقولة إلى زميلة مؤهلة دون تحريك الجدول', () => {
    const snapshot = makeSnapshot();
    snapshot.teachers.push({
      id: 't3',
      nameAr: 'المعلمة ج',
      departmentId: null,
      primarySubjectId: 'sci',
      subjectIds: ['sci'],
      requiredLoad: 4,
      maxLoad: 6,
      status: 'active',
      unavailable: [],
      preferences: [],
    });

    const impact = simulateTeacherRemoval(snapshot, 't2');
    expect(impact.lessonsToRedistribute).toBe(2);
    expect(impact.candidateTeachers.map((c) => c.teacherId)).toContain('t3');

    const best = impact.proposals[0];
    expect(best.resolvedCount).toBe(2);
    // أقل تغيير = إسناد فقط، بلا نقل حصص
    expect(best.changeSet.ops.every((op) => op.t === 'assign')).toBe(true);
    expect(best.changeSet.ops).toHaveLength(2);
  });

  it('لا يخترع حلًا غير موجود — يذكر السبب بدل الإخفاء', () => {
    const snapshot = makeSnapshot();
    const impact = simulateTeacherRemoval(snapshot, 't2'); // لا بديل لمادة العلوم
    const best = impact.proposals[0];
    expect(best.resolvedCount).toBe(0);
    expect(best.unresolved).toHaveLength(2);
    expect(best.unresolved[0].reasonAr.length).toBeGreaterThan(10);
  });

  it('لا يمسّ الشعب المستثناة', () => {
    const snapshot = makeSnapshot();
    snapshot.teachers.push({
      id: 't3', nameAr: 'المعلمة ج', departmentId: null, primarySubjectId: 'sci',
      subjectIds: ['sci'], requiredLoad: 4, maxLoad: 6, status: 'active', unavailable: [], preferences: [],
    });
    const orphans = snapshot.lessons.filter((l) => l.teacherId === 't2').map((l) => ({ ...l, teacherId: null }));
    const proposals = generateRepairProposals(
      { ...snapshot, lessons: snapshot.lessons.map((l) => (l.teacherId === 't2' ? { ...l, teacherId: null } : l)) },
      orphans,
      { frozenSectionIds: new Set(['s1']) },
    );
    expect(proposals[0].changeSet.ops).toHaveLength(0);
    expect(proposals[0].unresolved).toHaveLength(2);
  });

  it('المقترحات لا تُنتج جدولًا غير صالح', () => {
    const snapshot = makeSnapshot();
    snapshot.teachers.push({
      id: 't3', nameAr: 'المعلمة ج', departmentId: null, primarySubjectId: 'sci',
      subjectIds: ['sci'], requiredLoad: 4, maxLoad: 6, status: 'active', unavailable: [], preferences: [],
    });
    const impact = simulateTeacherRemoval(snapshot, 't2');
    for (const proposal of impact.proposals) {
      const applied = applyOps(snapshot, proposal.changeSet.ops);
      const health = runHealthCheck(applied);
      expect(health.totals.teacherConflicts).toBe(0);
      expect(health.totals.sectionConflicts).toBe(0);
    }
  });
});

describe('فحص صحة الجدول', () => {
  it('يجمّع الانتهاكات حسب النوع ويرتّبها بالخطورة', () => {
    const snapshot = makeSnapshot();
    snapshot.lessons[0].teacherId = null;
    const report = runHealthCheck(snapshot);
    expect(report.totals.unassigned).toBe(1);
    expect(report.groups[0].severity === 'critical' || report.groups[0].severity === 'high').toBe(true);
  });
});

describe('معايرة مقياس الفراغات', () => {
  const build = (busyPerDay: number[][]) => {
    const snapshot = makeSnapshot({ periods: 8, lessons: [] });
    const lessons = busyPerDay.flatMap((periods, day) =>
      periods.map((p, i) => ({
        id: `x${day}-${i}`, sectionId: 's1', subjectId: 'math', teacherId: 't1',
        dayId: `d${day}`, periodIndex: p, roomId: null, isLocked: false,
      })),
    );
    return { ...snapshot, lessons };
  };

  const gapsScore = (s: ReturnType<typeof build>) =>
    scoreSnapshot(s).lines.find((l) => l.constraintId === 'teacher-gaps')!;

  it('جدول متلاصق بلا فراغات يأخذ الدرجة كاملة', () => {
    expect(gapsScore(build([[1, 2, 3], [1, 2, 3]])).normalized).toBe(1);
  });

  it('فراغ واحد في اليوم لا يُفقد شيئًا — وهو واقع أي مدرسة', () => {
    expect(gapsScore(build([[1, 2, 4], [1, 2, 4]])).normalized).toBe(1);
  });

  it('ثلاثة فراغات في اليوم تُفقد الدرجة كاملة', () => {
    expect(gapsScore(build([[1, 5], [1, 5]])).normalized).toBe(0);
  });

  it('الشرح يذكر المتوسط اليومي لا رقمًا مجرّدًا', () => {
    expect(gapsScore(build([[1, 3, 5]])).detailAr).toContain('في اليوم');
  });
});

describe('اختلاف أوقات الأيام', () => {
  it('يُعلَّم اليوم الذي تختلف أوقاته بدل أن يرث أوقات غيره', () => {
    const snapshot = makeSnapshot({ days: 2, periods: 3 });
    // اليوم الثاني بلا أوقات مزوّدة — كحال الجمعة في بيانات المدرسة
    for (const period of snapshot.week.days[1].periods) {
      period.startTime = '';
      period.endTime = '';
    }
    const grid = buildGrid(snapshot.week);
    expect(grid.daysWithOwnTimes.has('d1')).toBe(true);
    expect(grid.daysWithOwnTimes.has('d0')).toBe(false);
  });

  it('أيام متطابقة الأوقات لا تُعلَّم', () => {
    const grid = buildGrid(makeSnapshot({ days: 3 }).week);
    expect(grid.daysWithOwnTimes.size).toBe(0);
  });
});
