'use client';

import * as React from 'react';
import Link from 'next/link';
import type { ChangeSet, Op, Violation } from '@/lib/domain/types';
import type { ValidationResult } from '@/lib/engine/validator';
import { useSchedule } from '@/lib/state/schedule-provider';
import { periodLabel } from '@/lib/engine/snapshot';
import { findAvailableSlots, findAvailableTeachers, findSwapCandidates } from '@/lib/engine/solver';
import { Badge, Button, Card, CardHeader, EmptyState, SeverityDot, SEVERITY_LABEL, Stat } from '@/components/ui';
import { PageHeader } from '@/components/layout/page-header';
import { Icon } from '@/components/layout/icon';
import { ChangePreviewDialog } from '@/components/timetable/change-preview';
import { cn } from '@/lib/utils';

export default function ConflictsPage() {
  const { snapshot, index, health, scoreDetail, preview, makeChangeSet, apply, refresh } = useSchedule();
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<{
    changeSet: ChangeSet;
    validation: ValidationResult;
    titleAr: string;
  } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!snapshot || !index || !health) return null;

  const propose = (ops: Op[], titleAr: string) => {
    setError(null);
    const validation = preview(ops);
    const changeSet = makeChangeSet({ ops, summaryAr: titleAr, reason: 'معالجة تعارض من صفحة الفحص' });
    if (!validation || !changeSet) return;
    setPending({ changeSet, validation, titleAr });
  };

  const approve = async () => {
    if (!pending) return;
    setBusy(true);
    const result = await apply(pending.changeSet);
    setBusy(false);
    if (result.ok) setPending(null);
    else setError(result.errorAr ?? 'تعذّر اعتماد التغيير.');
  };

  const t = health.totals;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="فحص صحة الجدول"
        description="فحص كامل لكل القيود الصارمة والمرنة. كل ملاحظة مصحوبة بسببها وبحلول مقترحة مرتّبة."
        actions={
          <Button size="sm" variant="secondary" onClick={() => void refresh()}>
            <Icon name="RefreshCw" className="h-3.5 w-3.5" />
            إعادة الفحص
          </Button>
        }
      />

      <Card className="mb-4 overflow-hidden">
        <div className="grid gap-4 p-5 lg:grid-cols-[14rem_minmax(0,1fr)]">
          <div className="flex flex-col items-center justify-center rounded-lg border border-line bg-surface-sunken px-4 py-5 text-center">
            <p className="text-2xs font-medium text-ink-muted">درجة جودة الجدول</p>
            <p
              className="tabular mt-1 text-5xl font-bold leading-none"
              style={{
                color: !health.valid
                  ? 'var(--danger)'
                  : health.score >= 85
                    ? 'var(--ok)'
                    : health.score >= 65
                      ? 'var(--warn)'
                      : 'var(--danger)',
              }}
            >
              {health.valid ? health.score : 0}
            </p>
            <p className="mt-1 text-2xs text-ink-faint">من 100</p>
            {!health.valid && (
              <p className="mt-2 rounded bg-danger-soft px-2 py-1 text-2xs font-medium text-danger">
                الجدول غير صالح — يوجد تعارض مانع
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-bold text-ink">من أين فُقدت الدرجة؟</p>
            <ul className="space-y-1.5">
              {scoreDetail.map((line) => (
                <li key={line.labelAr} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-xs text-ink">{line.labelAr}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-sunken">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${((line.of - line.lost) / Math.max(0.1, line.of)) * 100}%`,
                        background: line.lost > line.of / 2 ? 'var(--warn)' : 'var(--ok)',
                      }}
                    />
                  </span>
                  <span
                    className={cn(
                      'tabular w-20 shrink-0 text-left text-2xs',
                      line.lost > 0 ? 'text-warn' : 'text-ok',
                    )}
                  >
                    {line.lost > 0 ? `−${line.lost}` : '✓'} من {line.of}
                  </span>
                </li>
              ))}
            </ul>
            <details className="mt-3">
              <summary className="cursor-pointer text-2xs text-ink-muted hover:text-ink">
                تفاصيل كل بند
              </summary>
              <ul className="mt-2 space-y-1">
                {scoreDetail.map((line) => (
                  <li key={line.labelAr} className="text-2xs leading-relaxed text-ink-muted">
                    <span className="font-medium text-ink">{line.labelAr}:</span> {line.detailAr}
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="تعارضات المعلمات" value={t.teacherConflicts} tone={t.teacherConflicts ? 'danger' : 'ok'} />
        <Stat label="تعارضات الشعب" value={t.sectionConflicts} tone={t.sectionConflicts ? 'danger' : 'ok'} />
        <Stat label="تعارضات الغرف" value={t.roomConflicts} tone={t.roomConflicts ? 'danger' : 'ok'} />
        <Stat label="حصص ناقصة" value={t.missingLessons} tone={t.missingLessons ? 'warn' : 'ok'} />
        <Stat label="حصص بلا معلمة" value={t.unassigned} tone={t.unassigned ? 'warn' : 'ok'} />
        <Stat label="فوق النصاب" value={t.overload} tone={t.overload ? 'danger' : 'ok'} />
        <Stat label="دون النصاب" value={t.underload} tone={t.underload ? 'warn' : 'ok'} />
        <Stat label="ضعف التوزيع" value={t.poorDistribution} tone={t.poorDistribution ? 'warn' : 'ok'} />
      </div>

      {health.groups.length === 0 ? (
        <Card>
          <EmptyState
            tone="ok"
            icon={<Icon name="ShieldCheck" className="h-5 w-5" />}
            title="لا توجد تعارضات 🎉"
            description="جميع الحصص الحالية اجتازت الفحص: لا حجز مزدوج، ولا خرق لأوقات عدم التوفر، والأنصبة ضمن الحدود المسموحة."
            action={
              <Link href="/print">
                <Button size="sm" variant="secondary">
                  <Icon name="Printer" className="h-3.5 w-3.5" />
                  الانتقال إلى مركز الطباعة
                </Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {health.groups.map((group) => (
            <Card key={group.constraintId}>
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    <SeverityDot severity={group.severity} />
                    {group.labelAr}
                    <Badge
                      tone={group.severity === 'critical' ? 'danger' : group.severity === 'high' ? 'warn' : 'neutral'}
                    >
                      {group.count} · {SEVERITY_LABEL[group.severity]}
                    </Badge>
                  </span>
                }
                action={
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpanded((id) => (id === group.constraintId ? null : group.constraintId))}
                  >
                    {expanded === group.constraintId ? 'إخفاء' : 'عرض التفاصيل'}
                  </Button>
                }
              />
              {expanded === group.constraintId && (
                <ul className="divide-y divide-line">
                  {group.violations.slice(0, 25).map((violation, i) => (
                    <ViolationRow key={i} violation={violation} onPropose={propose} />
                  ))}
                  {group.violations.length > 25 && (
                    <li className="px-5 py-3 text-2xs text-ink-faint">
                      و{group.violations.length - 25} ملاحظة أخرى من النوع نفسه.
                    </li>
                  )}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}

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

/** صف الملاحظة مع حلول مقترحة — لا يُترك المستخدم أمام مشكلة بلا مخرج. */
function ViolationRow({
  violation,
  onPropose,
}: {
  violation: Violation;
  onPropose: (ops: Op[], titleAr: string) => void;
}) {
  const { index } = useSchedule();
  const [showFixes, setShowFixes] = React.useState(false);
  if (!index) return null;

  const lesson = violation.lessonIds[0] ? index.lessonById.get(violation.lessonIds[0]) : null;

  const fixes = React.useMemo(() => {
    if (!lesson) return [];
    const out: Array<{ label: string; detail: string; score: number; ops: Op[] }> = [];

    if (!lesson.teacherId || violation.constraintId === 'lesson-unassigned') {
      for (const candidate of findAvailableTeachers(index, lesson).candidates.slice(0, 3)) {
        out.push({
          label: `إسناد الحصة إلى ${candidate.teacher.nameAr}`,
          detail: candidate.reasonsAr.join(' · '),
          score: Math.round(candidate.fit * 100),
          ops: [{ t: 'assign', lessonId: lesson.id, teacherId: candidate.teacher.id }],
        });
      }
    }

    for (const slot of findAvailableSlots(index, lesson, { limit: 3 })) {
      out.push({
        label: `نقل الحصة إلى ${periodLabel(index, slot.slot)}`,
        detail: slot.reasonsAr.join(' · ') || 'خانة شاغرة لدى الشعبة والمعلمة.',
        score: Math.round(slot.fit * 100),
        ops: [{ t: 'move', lessonId: lesson.id, to: slot.slot }],
      });
    }

    for (const swap of findSwapCandidates(index, lesson, { limit: 2 })) {
      out.push({
        label: `تبديل مع ${index.subjectById.get(swap.other.subjectId)?.nameAr ?? 'حصة'} — الشعبة ${index.sectionById.get(swap.other.sectionId)?.label ?? ''}`,
        detail: periodLabel(index, { dayId: swap.other.dayId, periodIndex: swap.other.periodIndex }),
        score: 60,
        ops: [{ t: 'swap', aId: lesson.id, bId: swap.other.id }],
      });
    }

    return out.sort((a, b) => b.score - a.score).slice(0, 5);
  }, [index, lesson, violation.constraintId]);

  return (
    <li className="px-5 py-3">
      <div className="flex items-start gap-3">
        <p className="min-w-0 flex-1 text-xs leading-relaxed text-ink">{violation.messageAr}</p>
        {lesson && (
          <Button size="sm" variant="ghost" onClick={() => setShowFixes((v) => !v)}>
            {showFixes ? 'إخفاء الحلول' : `حلول مقترحة (${fixes.length})`}
          </Button>
        )}
      </div>

      {showFixes && (
        <div className="mt-2">
          {fixes.length === 0 ? (
            <p className="rounded border border-line bg-surface-sunken px-3 py-2 text-2xs leading-relaxed text-ink-muted">
              لا يوجد حل مباشر لهذه الملاحظة ضمن القيود الحالية. جرّب المساعد الذكي — يبحث في تسلسل تغييرات
              أوسع من خيار واحد.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {fixes.map((fix, i) => (
                <li key={i}>
                  <button
                    onClick={() => onPropose(fix.ops, fix.label)}
                    className="flex w-full items-center gap-3 rounded border border-line px-3 py-2 text-right transition-colors hover:border-brand-soft hover:bg-brand-tint"
                  >
                    <span className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-2xs font-bold text-ink">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-ink">{fix.label}</span>
                      <span className="block truncate text-2xs text-ink-muted">{fix.detail}</span>
                    </span>
                    <Badge tone={fix.score >= 75 ? 'ok' : 'brand'}>{fix.score}%</Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
