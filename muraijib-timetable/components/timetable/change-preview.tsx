'use client';

import * as React from 'react';
import type { ChangeSet, Lesson, Violation } from '@/lib/domain/types';
import type { ValidationResult } from '@/lib/engine/validator';
import { periodLabel, type SnapshotIndex } from '@/lib/engine/snapshot';
import { isBlocking } from '@/lib/engine/constraints/hard';
import { Badge, Button, Modal } from '@/components/ui';
import { Icon } from '@/components/layout/icon';
import { cn } from '@/lib/utils';

/**
 * البوابة الإلزامية قبل أي كتابة.
 *
 * لا يُعتمد أي تغيير — من السحب أو من المساعد الذكي — قبل عرض هذه المعاينة:
 * ماذا سيتغيّر، وماذا سيتحسّن، وماذا سيُكسر، وكم حصة ستتأثر.
 */
export function ChangePreviewDialog({
  open,
  onClose,
  onApprove,
  index,
  validation,
  changeSet,
  titleAr,
  subtitleAr,
  busy = false,
  errorAr,
}: {
  open: boolean;
  onClose: () => void;
  onApprove: () => void;
  index: SnapshotIndex;
  validation: ValidationResult | null;
  changeSet: ChangeSet | null;
  titleAr: string;
  subtitleAr?: string;
  busy?: boolean;
  errorAr?: string | null;
}) {
  if (!validation || !changeSet) return null;

  const blocking = validation.blocking;
  const introduced = validation.introduced.filter((v) => !isBlocking(v));
  const scoreDelta = validation.scoreAfter - validation.scoreBefore;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={titleAr}
      subtitle={subtitleAr}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            إلغاء
          </Button>
          <Button
            variant={blocking.length > 0 ? 'danger' : 'primary'}
            onClick={onApprove}
            disabled={blocking.length > 0 || busy}
            title={blocking.length > 0 ? 'لا يمكن الاعتماد مع وجود تعارض مانع' : undefined}
          >
            {busy ? 'جارٍ الاعتماد…' : 'اعتماد التغييرات'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {errorAr && (
          <div className="flex items-start gap-2 rounded border border-danger/30 bg-danger-soft px-3 py-2.5 text-xs leading-relaxed text-danger">
            <Icon name="CircleAlert" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorAr}</span>
          </div>
        )}

        {/* ── حكم واضح في سطر واحد ── */}
        <div
          className={cn(
            'flex items-start gap-2.5 rounded-lg border px-4 py-3',
            blocking.length > 0
              ? 'border-danger/30 bg-danger-soft'
              : introduced.length > 0
                ? 'border-warn/30 bg-warn-soft'
                : 'border-ok/30 bg-ok-soft',
          )}
        >
          <Icon
            name={blocking.length > 0 ? 'CircleX' : introduced.length > 0 ? 'TriangleAlert' : 'CircleCheck'}
            className={cn(
              'mt-0.5 h-4 w-4 shrink-0',
              blocking.length > 0 ? 'text-danger' : introduced.length > 0 ? 'text-warn' : 'text-ok',
            )}
          />
          <div className="min-w-0">
            <p
              className={cn(
                'text-[13px] font-bold',
                blocking.length > 0 ? 'text-danger' : introduced.length > 0 ? 'text-warn' : 'text-ok',
              )}
            >
              {blocking.length > 0
                ? 'يوجد تعارض يمنع الاعتماد'
                : introduced.length > 0
                  ? 'لا يوجد تعارض مانع، لكن هناك ملاحظات'
                  : 'لا يوجد تعارض — التغيير صالح'}
            </p>
            {blocking.length === 0 && (
              <ul className="mt-1.5 grid gap-1 text-2xs text-ink-muted sm:grid-cols-2">
                <Check ok label="جدول المعلمة متاح" />
                <Check ok label="جدول الشعبة متاح" />
                <Check ok label="النصاب ضمن الحد المسموح" />
                <Check ok label="الحصص المقفلة لم تُمسّ" />
              </ul>
            )}
          </div>
        </div>

        {/* ── الأثر بالأرقام ── */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="حصص ستتغيّر" value={validation.impact.lessonsChanged} emphasis />
          <Metric label="معلمات متأثرات" value={validation.impact.teachersAffected.length} />
          <Metric label="شعب متأثرة" value={validation.impact.sectionsAffected.length} />
          <Metric
            label="درجة الجودة"
            value={
              <span className="flex items-baseline gap-1">
                <span className="text-ink-faint">{validation.scoreBefore}</span>
                <Icon name="MoveLeft" className="h-3 w-3 text-ink-faint" />
                <span
                  className={cn(
                    scoreDelta > 0 ? 'text-ok' : scoreDelta < 0 ? 'text-danger' : 'text-ink',
                  )}
                >
                  {validation.scoreAfter}
                </span>
              </span>
            }
          />
        </div>

        {blocking.length > 0 && (
          <ViolationList
            titleAr="تعارضات مانعة"
            tone="danger"
            violations={blocking}
            index={index}
          />
        )}
        {introduced.length > 0 && (
          <ViolationList
            titleAr="ملاحظات جديدة سببها هذا التغيير"
            tone="warn"
            violations={introduced}
            index={index}
          />
        )}
        {validation.resolved.length > 0 && (
          <ViolationList
            titleAr="مشكلات سيصلحها هذا التغيير"
            tone="ok"
            violations={validation.resolved}
            index={index}
          />
        )}

        <DiffList validation={validation} index={index} />
      </div>
    </Modal>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <Icon name={ok ? 'Check' : 'X'} className={cn('h-3 w-3', ok ? 'text-ok' : 'text-danger')} />
      {label}
    </li>
  );
}

function Metric({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="rounded border border-line px-3 py-2">
      <p className="text-2xs text-ink-muted">{label}</p>
      <p className={cn('tabular mt-0.5 text-lg font-bold leading-none', emphasis && 'text-brand-ink')}>
        {value}
      </p>
    </div>
  );
}

function ViolationList({
  titleAr,
  tone,
  violations,
  index,
}: {
  titleAr: string;
  tone: 'danger' | 'warn' | 'ok';
  violations: Violation[];
  index: SnapshotIndex;
}) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-xs font-bold text-ink">
        {titleAr}
        <Badge tone={tone}>{violations.length}</Badge>
      </h3>
      <ul className="space-y-1.5">
        {violations.slice(0, 8).map((violation, i) => (
          <li
            key={i}
            className={cn(
              'rounded border px-3 py-2 text-xs leading-relaxed',
              tone === 'danger' && 'border-danger/25 bg-danger-soft text-danger',
              tone === 'warn' && 'border-warn/25 bg-warn-soft text-warn',
              tone === 'ok' && 'border-ok/25 bg-ok-soft text-ok',
            )}
          >
            {violation.messageAr}
          </li>
        ))}
        {violations.length > 8 && (
          <li className="px-1 text-2xs text-ink-faint">و{violations.length - 8} أخرى…</li>
        )}
      </ul>
    </section>
  );
}

function DiffList({ validation, index }: { validation: ValidationResult; index: SnapshotIndex }) {
  const { diff } = validation;
  const rows: Array<{ icon: string; tone: string; text: string }> = [];

  const describe = (lesson: Lesson) => {
    const subject = index.subjectById.get(lesson.subjectId)?.nameAr ?? '—';
    const section = index.sectionById.get(lesson.sectionId)?.label ?? '—';
    return `${subject} · الشعبة ${section}`;
  };

  for (const lesson of diff.added) {
    rows.push({
      icon: 'Plus',
      tone: 'text-ok',
      text: `إضافة ${describe(lesson)} في ${periodLabel(index, { dayId: lesson.dayId, periodIndex: lesson.periodIndex })}`,
    });
  }
  for (const lesson of diff.removed) {
    rows.push({
      icon: 'Minus',
      tone: 'text-danger',
      text: `حذف ${describe(lesson)} من ${periodLabel(index, { dayId: lesson.dayId, periodIndex: lesson.periodIndex })}`,
    });
  }
  for (const change of diff.changed) {
    const parts: string[] = [];
    if (change.fields.includes('slot')) {
      parts.push(
        `من ${periodLabel(index, { dayId: change.before.dayId, periodIndex: change.before.periodIndex })} إلى ${periodLabel(index, { dayId: change.after.dayId, periodIndex: change.after.periodIndex })}`,
      );
    }
    if (change.fields.includes('teacher')) {
      const from = change.before.teacherId ? index.teacherById.get(change.before.teacherId)?.nameAr : 'بلا معلمة';
      const to = change.after.teacherId ? index.teacherById.get(change.after.teacherId)?.nameAr : 'بلا معلمة';
      parts.push(`المعلمة: ${from ?? '—'} ← ${to ?? '—'}`);
    }
    if (change.fields.includes('room')) parts.push('تغيير الغرفة');
    if (change.fields.includes('lock')) parts.push(change.after.isLocked ? 'إقفال الحصة' : 'فتح قفل الحصة');
    rows.push({ icon: 'ArrowLeftRight', tone: 'text-info', text: `${describe(change.after)} — ${parts.join(' · ')}` });
  }

  if (rows.length === 0) {
    return (
      <p className="rounded border border-line bg-surface-sunken px-3 py-2 text-xs text-ink-muted">
        لن يتغيّر أي شيء في الجدول نتيجة هذه العملية.
      </p>
    );
  }

  return (
    <section>
      <h3 className="mb-2 text-xs font-bold text-ink">تفصيل التغييرات</h3>
      <ul className="divide-y divide-line rounded border border-line">
        {rows.slice(0, 15).map((row, i) => (
          <li key={i} className="flex items-start gap-2 px-3 py-2 text-xs leading-relaxed">
            <Icon name={row.icon} className={cn('mt-0.5 h-3 w-3 shrink-0', row.tone)} />
            <span className="text-ink">{row.text}</span>
          </li>
        ))}
        {rows.length > 15 && (
          <li className="px-3 py-2 text-2xs text-ink-faint">و{rows.length - 15} تغييرًا آخر…</li>
        )}
      </ul>
    </section>
  );
}
