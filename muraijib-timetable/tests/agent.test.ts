import { describe, expect, it } from 'vitest';
import { buildDemoSnapshot } from '@/lib/data/demo';
import { detectIntent, runAgent } from '@/lib/agent/runtime';
import { extractEntities } from '@/lib/agent/entities';
import { applyOps } from '@/lib/engine/changeset';
import { runHealthCheck } from '@/lib/engine/conflicts';

const snapshot = buildDemoSnapshot();

describe('التعرّف على النية', () => {
  const cases: Array<[string, string]> = [
    ['انتقلت المعلمة من المدرسة، ما أثر ذلك على الجدول؟', 'teacher-transfer'],
    ['ابحث عن تعارضات', 'find-conflicts'],
    ['أظهر المعلمات الأقل نصابًا', 'lowest-load'],
    ['من يمكنها أخذ حصتين إضافيتين؟', 'spare-capacity'],
    ['أعد توزيع حصص العلوم فقط', 'redistribute-subject'],
    ['ثبّت حصص معلمة ٢', 'lock-teacher'],
    ['ما درجة جودة الجدول؟', 'schedule-quality'],
    ['غيّر نصاب معلمة ٥ إلى ٢٠', 'teacher-load-change'],
  ];

  for (const [text, expected] of cases) {
    it(`«${text}» → ${expected}`, () => {
      expect(detectIntent(text)).toBe(expected);
    });
  }
});

describe('التعرّف على الكيانات', () => {
  it('يتعرّف على اسم المعلمة بأرقام هندية', () => {
    const found = extractEntities('انتقلت معلمة ٣ من المدرسة', snapshot);
    expect(found.teacherIds).toContain('t3');
  });

  it('يتعرّف على الشعبة بصيغة 7/2', () => {
    const found = extractEntities('أصلح جدول الشعبة 7/2 فقط', snapshot);
    expect(found.sectionIds).toContain('g7-2');
  });

  it('يتعرّف على الصف بالاسم', () => {
    const found = extractEntities('لا تغيّر جداول الصف الثامن', snapshot);
    expect(found.gradeIds).toContain('g8');
  });

  it('يتعرّف على المادة', () => {
    const found = extractEntities('أعد توزيع حصص العلوم', snapshot);
    expect(found.subjectIds).toContain('sci');
  });

  it('لا يخلط معلمة ١ بمعلمة ١٢', () => {
    const found = extractEntities('انتقلت معلمة ١٢', snapshot);
    expect(found.teacherIds).toEqual(['t12']);
  });
});

describe('تشغيل المساعد', () => {
  it('يحلّل انتقال معلمة ويقدّم مقترحات قابلة للاعتماد', () => {
    const result = runAgent('انتقلت معلمة ١ من المدرسة، ما الحل؟', snapshot);
    expect(result.intent).toBe('teacher-transfer');
    expect(result.stepsAr.length).toBeGreaterThan(3);
    expect(result.proposals?.length).toBeGreaterThan(0);
    expect(result.facts.some((f) => f.labelAr.includes('الحصص المطلوب'))).toBe(true);
  });

  it('كل مقترح ينتج جدولًا بلا تعارضات صارمة', () => {
    const result = runAgent('انتقلت معلمة ٤ من المدرسة', snapshot);
    // المعلمة تُعلَّم منقولة قبل تقييم المقترح، وإلا احتُسبت حصصها القديمة تعارضًا وهميًا.
    const simulated = {
      ...snapshot,
      teachers: snapshot.teachers.map((t) => (t.id === 't4' ? { ...t, status: 'transferred' as const } : t)),
      lessons: snapshot.lessons.map((l) => (l.teacherId === 't4' ? { ...l, teacherId: null } : l)),
    };
    for (const proposal of result.proposals ?? []) {
      const health = runHealthCheck(applyOps(simulated, proposal.changeSet.ops));
      expect(health.totals.teacherConflicts).toBe(0);
      expect(health.totals.sectionConflicts).toBe(0);
      expect(health.totals.blocking).toBe(0);
    }
  });

  it('يحترم القيد المكتوب في الأمر: لا تغيّر جداول صف معيّن', () => {
    const result = runAgent(
      'انتقلت معلمة ١ من المدرسة، أوجد أفضل حل دون تغيير جداول الصف الثامن',
      snapshot,
    );
    expect(result.constraintsAr.some((c) => c.includes('الثامن'))).toBe(true);

    const g8Sections = new Set(snapshot.sections.filter((s) => s.gradeId === 'g8').map((s) => s.id));
    for (const proposal of result.proposals ?? []) {
      for (const op of proposal.changeSet.ops) {
        const lessonId = 'lessonId' in op ? op.lessonId : null;
        if (!lessonId) continue;
        const lesson = snapshot.lessons.find((l) => l.id === lessonId);
        expect(g8Sections.has(lesson?.sectionId ?? '')).toBe(false);
      }
    }
  });

  it('يطلب توضيحًا بدل التخمين عند غياب الاسم', () => {
    const result = runAgent('انتقلت المعلمة من المدرسة', snapshot);
    expect(result.needsClarificationAr).toBeTruthy();
    expect(result.proposals).toBeUndefined();
  });

  it('يُنتج عمليات قفل جاهزة للمعاينة عند طلب التثبيت', () => {
    const result = runAgent('ثبّت حصص معلمة ٢', snapshot);
    expect(result.directOps?.ops.every((op) => op.t === 'lock')).toBe(true);
    expect(result.directOps!.ops.length).toBeGreaterThan(0);
  });

  it('يشرح درجة الجودة بندًا بندًا', () => {
    const result = runAgent('ما درجة جودة الجدول؟', snapshot);
    expect(result.table?.rows.length).toBe(8);
    expect(result.table!.rows.every((r) => String(r.cells[3]).length > 0)).toBe(true);
  });

  it('لا يقترح شيئًا خارج القيود عند إعادة توزيع مادة واحدة', () => {
    const result = runAgent('أعد توزيع حصص العلوم فقط', snapshot);
    for (const proposal of result.proposals ?? []) {
      for (const op of proposal.changeSet.ops) {
        if (op.t !== 'assign' && op.t !== 'move') continue;
        const lesson = snapshot.lessons.find((l) => l.id === op.lessonId);
        expect(lesson?.subjectId).toBe('sci');
      }
    }
  });
});
