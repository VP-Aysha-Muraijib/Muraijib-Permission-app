import { describe, expect, it } from 'vitest';
import { buildDemoSnapshot } from '@/lib/data/demo';
import { runHealthCheck } from '@/lib/engine/conflicts';
import { buildIndex } from '@/lib/engine/snapshot';
import { computeAllWorkloads } from '@/lib/engine/workload';

describe('الجدول التجريبي', () => {
  const snapshot = buildDemoSnapshot();
  const report = runHealthCheck(snapshot);

  it('لا يحتوي أي تعارض صارم', () => {
    expect(report.totals.teacherConflicts).toBe(0);
    expect(report.totals.sectionConflicts).toBe(0);
    expect(report.totals.roomConflicts).toBe(0);
    expect(report.totals.blocking).toBe(0);
  });

  it('لا يترك حصة بلا معلمة', () => {
    expect(report.totals.unassigned).toBe(0);
  });

  it('يغطي نصاب المواد لكل شعبة', () => {
    expect(report.totals.missingLessons).toBe(0);
  });

  it('أنصبة المعلمات متسقة مع ما أُسند لهن', () => {
    const idx = buildIndex(snapshot);
    for (const load of computeAllWorkloads(idx)) {
      expect(load.assigned).toBeLessThanOrEqual(load.maxLoad);
      expect(load.status).not.toBe('conflict');
    }
  });

  it('درجة الجودة صالحة وقابلة للتفسير', () => {
    expect(report.valid).toBe(true);
    expect(report.score).toBeGreaterThan(50);
  });
});
