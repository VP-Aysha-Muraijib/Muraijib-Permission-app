'use client';

import * as React from 'react';
import type { ChangeSet, ID, Op, Scenario } from '@/lib/domain/types';
import type { ValidationResult } from '@/lib/engine/validator';
import { createScenario, evaluateScenario, compareResults, simulateTeacherAddition, type ScenarioResult } from '@/lib/engine/scenario';
import { simulateTeacherRemoval } from '@/lib/engine/repair';
import { useSchedule } from '@/lib/state/schedule-provider';
import { getStore } from '@/lib/data/client';
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Select } from '@/components/ui';
import { PageHeader } from '@/components/layout/page-header';
import { Icon } from '@/components/layout/icon';
import { ChangePreviewDialog } from '@/components/timetable/change-preview';
import { cn, formatDateAr } from '@/lib/utils';

type Kind = 'teacher-leaves' | 'teacher-joins' | 'load-change';

const KINDS: Array<{ id: Kind; label: string; question: string; icon: string }> = [
  { id: 'teacher-leaves', label: 'انتقال معلمة', question: 'ماذا يحدث للجدول لو غادرت هذه المعلمة؟', icon: 'UserMinus' },
  { id: 'teacher-joins', label: 'انضمام معلمة', question: 'كم حصة تستطيع معلمة جديدة أن تخفّف؟', icon: 'UserPlus' },
  { id: 'load-change', label: 'تغيير نصاب', question: 'ماذا يترتب على رفع أو خفض نصاب معلمة؟', icon: 'Gauge' },
];

/**
 * محاكاة «ماذا لو».
 *
 * السيناريو ليس نسخة من الجدول، بل قائمة عمليات فوق النسخة الحالية. لذلك
 * إنشاؤه فوري، ولا يمسّ الجدول الأساسي إطلاقًا، وحذفه بلا أثر.
 */
export default function ScenariosPage() {
  const { snapshot, index, workloads, preview, makeChangeSet, apply, refresh } = useSchedule();

  const [kind, setKind] = React.useState<Kind>('teacher-leaves');
  const [teacherId, setTeacherId] = React.useState('');
  const [newLoad, setNewLoad] = React.useState(20);
  const [subjectId, setSubjectId] = React.useState('');
  const [result, setResult] = React.useState<{ label: string; evaluated: ScenarioResult; ops: Op[] } | null>(null);
  const [saved, setSaved] = React.useState<Scenario[]>([]);
  const [note, setNote] = React.useState('');

  const [pending, setPending] = React.useState<{ changeSet: ChangeSet; validation: ValidationResult; titleAr: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    void getStore().listScenarios().then(setSaved);
  }, []);

  React.useEffect(() => {
    if (snapshot && !teacherId) setTeacherId(snapshot.teachers[0]?.id ?? '');
    if (snapshot && !subjectId) setSubjectId(snapshot.subjects[0]?.id ?? '');
  }, [snapshot, teacherId, subjectId]);

  if (!snapshot || !index) return null;

  const teacher = snapshot.teachers.find((t) => t.id === teacherId);

  const run = () => {
    setError(null);
    if (kind === 'teacher-joins') {
      // انضمام معلمة لا يُمثَّل بعمليات على الجدول الحالي — يُعرض كتحليل طاقة.
      setResult(null);
      return;
    }

    let ops: Op[] = [];
    let label = '';

    if (kind === 'teacher-leaves' && teacher) {
      const impact = simulateTeacherRemoval(snapshot, teacher.id);
      ops = impact.proposals[0]?.changeSet.ops ?? [];
      label = `انتقال ${teacher.nameAr}`;
      // العمليات المقترحة تعالج ما تستطيع؛ ما تبقى يظهر كحصص بلا معلمة في نتيجة المحاكاة.
      const orphanOps: Op[] = snapshot.lessons
        .filter((l) => l.teacherId === teacher.id)
        .map((l) => ({ t: 'assign' as const, lessonId: l.id, teacherId: null }));
      ops = [...orphanOps, ...ops];
    }

    if (kind === 'load-change' && teacher) {
      const load = workloads.find((w) => w.teacherId === teacher.id);
      const delta = (load?.assigned ?? 0) - newLoad;
      label = `نصاب ${teacher.nameAr} → ${newLoad}`;
      if (delta > 0) {
        // خفض النصاب: تُسحب آخر الحصص من جدولها وتُترك بلا معلمة لتظهر كلفة القرار.
        ops = (index.byTeacher.get(teacher.id) ?? [])
          .filter((l) => !index.lockedLessonIds.has(l.id))
          .slice(0, delta)
          .map((l) => ({ t: 'assign' as const, lessonId: l.id, teacherId: null }));
      }
    }

    const scenario = createScenario(snapshot, { name: label, ops, createdBy: 'محاكاة', note });
    setResult({ label, evaluated: evaluateScenario(snapshot, scenario), ops });
  };

  const saveScenario = async () => {
    if (!result) return;
    const scenario = createScenario(snapshot, {
      name: result.label,
      ops: result.ops,
      createdBy: 'نائب المدير',
      note,
    });
    await getStore().saveScenario(scenario);
    setSaved(await getStore().listScenarios());
  };

  const applyScenario = () => {
    if (!result) return;
    setError(null);
    const validation = preview(result.ops);
    const changeSet = makeChangeSet({
      ops: result.ops,
      summaryAr: `تطبيق سيناريو: ${result.label}`,
      reason: note || 'تطبيق سيناريو محاكاة',
      source: 'scenario',
    });
    if (!validation || !changeSet) return;
    setPending({ changeSet, validation, titleAr: `تطبيق سيناريو: ${result.label}` });
  };

  const approve = async () => {
    if (!pending) return;
    setBusy(true);
    const outcome = await apply(pending.changeSet);
    setBusy(false);
    if (outcome.ok) {
      setPending(null);
      setResult(null);
      await refresh();
    } else {
      setError(outcome.errorAr ?? 'تعذّر تطبيق السيناريو.');
    }
  };

  const addition =
    kind === 'teacher-joins' && subjectId
      ? simulateTeacherAddition(snapshot, { subjectIds: [subjectId], requiredLoad: newLoad })
      : null;

  const comparison = result
    ? compareResults(
        'الجدول الحالي',
        evaluateScenario(snapshot, createScenario(snapshot, { name: 'الحالي', ops: [], createdBy: '—' })),
        result.label,
        result.evaluated,
      )
    : null;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="محاكاة السيناريوهات"
        description="جرّب التغيير قبل اتخاذه. لا تمسّ المحاكاة الجدول الأساسي إطلاقًا، ولا يُطبَّق شيء إلا بمعاينة وموافقة صريحة."
      />

      {error && (
        <p className="mb-4 rounded border border-danger/30 bg-danger-soft px-4 py-2.5 text-xs text-danger">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="space-y-3">
          <Card>
            <CardHeader title="ما الذي تريد تجربته؟" />
            <ul className="p-2">
              {KINDS.map((option) => (
                <li key={option.id}>
                  <button
                    onClick={() => {
                      setKind(option.id);
                      setResult(null);
                    }}
                    className={cn(
                      'flex w-full items-start gap-2.5 rounded px-2.5 py-2 text-right transition-colors',
                      kind === option.id ? 'bg-brand-tint text-brand-ink' : 'text-ink-muted hover:bg-surface-sunken',
                    )}
                  >
                    <Icon name={option.icon} className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold">{option.label}</span>
                      <span className="block text-2xs opacity-80">{option.question}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="معطيات السيناريو" />
            <div className="space-y-3 p-4">
              {kind !== 'teacher-joins' && (
                <Field label="المعلمة">
                  <Select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                    {snapshot.teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nameAr}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              {kind === 'teacher-joins' && (
                <Field label="مادة المعلمة الجديدة">
                  <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                    {snapshot.subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nameAr}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              {kind !== 'teacher-leaves' && (
                <Field label={kind === 'load-change' ? 'النصاب الجديد' : 'نصاب المعلمة الجديدة'}>
                  <Input
                    type="number"
                    min={0}
                    max={40}
                    value={newLoad}
                    onChange={(e) => setNewLoad(Number(e.target.value))}
                  />
                </Field>
              )}

              <Field label="ملاحظة (اختياري)">
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="سبب التجربة" />
              </Field>

              <Button variant="primary" size="sm" className="w-full" onClick={run}>
                <Icon name="Play" className="h-3.5 w-3.5" />
                تشغيل المحاكاة
              </Button>
            </div>
          </Card>

          {saved.length > 0 && (
            <Card>
              <CardHeader title="سيناريوهات محفوظة" subtitle={`${saved.length} سيناريو`} />
              <ul className="divide-y divide-line">
                {saved.map((scenario) => (
                  <li key={scenario.id} className="flex items-start gap-2 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-ink">{scenario.name}</p>
                      <p className="text-2xs text-ink-faint">
                        {scenario.ops.length} عملية · {formatDateAr(scenario.createdAt)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setResult({
                          label: scenario.name,
                          evaluated: evaluateScenario(snapshot, scenario),
                          ops: scenario.ops,
                        })
                      }
                    >
                      فتح
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await getStore().deleteScenario(scenario.id);
                        setSaved(await getStore().listScenarios());
                      }}
                      aria-label="حذف"
                    >
                      <Icon name="Trash2" className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-3">
          {addition && (
            <Card>
              <CardHeader
                title="أثر انضمام معلمة جديدة"
                subtitle={`بنصاب ${newLoad} حصة في ${snapshot.subjects.find((s) => s.id === subjectId)?.nameAr ?? ''}`}
              />
              <div className="grid grid-cols-2 gap-px border-y border-line bg-line">
                <Metric label="حصص يمكن تخفيفها" value={addition.relievableLessons} tone="ok" />
                <Metric label="معلمات مثقلات في المادة" value={addition.fromTeachers.length} />
              </div>
              {addition.fromTeachers.length === 0 ? (
                <p className="px-5 py-4 text-xs leading-relaxed text-ink-muted">
                  لا توجد معلمة فوق نصابها في هذه المادة حاليًا. المعلمة الجديدة ستُستفاد منها في تغطية
                  الحصص غير المسندة أو في استيعاب أي تغيير مستقبلي، لا في تخفيف حمل قائم.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {addition.fromTeachers.map((item) => (
                    <li key={item.nameAr} className="flex items-center justify-between px-5 py-2.5 text-xs">
                      <span className="text-ink">{item.nameAr}</span>
                      <Badge tone="warn">فوق نصابها بـ{item.over}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {result && comparison ? (
            <>
              <Card>
                <CardHeader
                  title={`نتيجة المحاكاة: ${result.label}`}
                  subtitle="الجدول الأساسي لم يتغيّر — هذه نسخة افتراضية للمقارنة فقط"
                  action={
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => void saveScenario()}>
                        <Icon name="Save" className="h-3.5 w-3.5" />
                        حفظ
                      </Button>
                      <Button size="sm" variant="primary" onClick={applyScenario} disabled={result.ops.length === 0}>
                        <Icon name="Check" className="h-3.5 w-3.5" />
                        تطبيق
                      </Button>
                    </div>
                  }
                />
                <table className="w-full border-collapse text-right">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="table-head px-5 py-2">المؤشر</th>
                      <th className="table-head px-5 py-2 text-center">{comparison.aLabel}</th>
                      <th className="table-head px-5 py-2 text-center">{comparison.bLabel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.rows.map((row) => (
                      <tr key={row.labelAr} className="border-b border-line last:border-0">
                        <td className="px-5 py-2 text-xs text-ink">{row.labelAr}</td>
                        <td
                          className={cn(
                            'tabular px-5 py-2 text-center text-xs',
                            row.better === 'a' ? 'font-bold text-ok' : 'text-ink-muted',
                          )}
                        >
                          {row.a}
                        </td>
                        <td
                          className={cn(
                            'tabular px-5 py-2 text-center text-xs',
                            row.better === 'b' ? 'font-bold text-ok' : row.better === 'a' ? 'text-danger' : 'text-ink-muted',
                          )}
                        >
                          {row.b}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              <Card>
                <CardHeader title="ما سيتغيّر في الجدول" subtitle={`${result.evaluated.impact.lessonsChanged} حصة`} />
                <div className="grid grid-cols-3 gap-px border-y border-line bg-line">
                  <Metric label="مضافة" value={result.evaluated.diff.added.length} tone="ok" />
                  <Metric label="محذوفة" value={result.evaluated.diff.removed.length} tone="danger" />
                  <Metric label="معدّلة" value={result.evaluated.diff.changed.length} tone="warn" />
                </div>
                {result.evaluated.health.violations.length > 0 && (
                  <ul className="max-h-56 divide-y divide-line overflow-y-auto">
                    {result.evaluated.health.violations.slice(0, 12).map((violation, i) => (
                      <li key={i} className="px-5 py-2 text-xs leading-relaxed text-ink-muted">
                        {violation.messageAr}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          ) : (
            !addition && (
              <Card>
                <EmptyState
                  icon={<Icon name="FlaskConical" className="h-5 w-5" />}
                  title="لم تُشغَّل محاكاة بعد"
                  description="اختر نوع السيناريو ومعطياته ثم اضغط «تشغيل المحاكاة». لن يتأثر الجدول الأساسي بأي شيء تجربه هنا."
                />
              </Card>
            )
          )}
        </div>
      </div>

      <ChangePreviewDialog
        open={Boolean(pending)}
        onClose={() => {
          setPending(null);
          setError(null);
        }}
        onApprove={approve}
        index={index}
        validation={pending?.validation ?? null}
        changeSet={pending?.changeSet ?? null}
        titleAr={pending?.titleAr ?? ''}
        busy={busy}
        errorAr={error}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'ok' | 'warn' | 'danger';
}) {
  return (
    <div className="bg-surface px-4 py-3 text-center">
      <p className="text-2xs text-ink-muted">{label}</p>
      <p
        className={cn(
          'tabular mt-0.5 text-xl font-bold leading-none',
          tone === 'ok' && 'text-ok',
          tone === 'warn' && 'text-warn',
          tone === 'danger' && 'text-danger',
        )}
      >
        {value}
      </p>
    </div>
  );
}
