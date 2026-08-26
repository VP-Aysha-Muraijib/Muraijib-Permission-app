'use client';

import * as React from 'react';
import { useSchedule } from '@/lib/state/schedule-provider';
import { Badge, Card, EmptyState, Input, Select } from '@/components/ui';
import { PageHeader } from '@/components/layout/page-header';
import { Icon } from '@/components/layout/icon';
import { formatDateAr, matchesAr } from '@/lib/utils';

const ACTION_LABEL: Record<string, { label: string; icon: string; tone: 'brand' | 'ok' | 'warn' | 'neutral' }> = {
  'apply-changeset': { label: 'تعديل الجدول', icon: 'CalendarCog', tone: 'brand' },
  'restore-version': { label: 'استرجاع نسخة', icon: 'RotateCcw', tone: 'warn' },
  'edit-reference': { label: 'تعديل بيانات', icon: 'Pencil', tone: 'neutral' },
  'import-baseline': { label: 'استيراد الجدول المرجعي', icon: 'Upload', tone: 'ok' },
  seed: { label: 'تهيئة النظام', icon: 'Sparkles', tone: 'neutral' },
};

export default function AuditPage() {
  const { audit } = useSchedule();
  const [query, setQuery] = React.useState('');
  const [action, setAction] = React.useState('');

  const rows = audit.filter((entry) => {
    if (action && entry.action !== action) return false;
    if (query && !matchesAr(entry.summaryAr, query) && !matchesAr(entry.actor, query)) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="سجل التغييرات"
        description="سجل دائم لكل تعديل معتمد: من أجراه، ومتى، وسببه، وأثره. لا يمكن حذف السجل من داخل النظام."
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في السجل…"
            className="w-56"
          />
          <Select value={action} onChange={(e) => setAction(e.target.value)} className="w-auto min-w-[12rem]">
            <option value="">كل الأنواع</option>
            {Object.entries(ACTION_LABEL).map(([id, meta]) => (
              <option key={id} value={id}>
                {meta.label}
              </option>
            ))}
          </Select>
          <span className="mr-auto text-2xs text-ink-muted">{rows.length} سجل</span>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<Icon name="ScrollText" className="h-5 w-5" />}
            title="لا توجد سجلات مطابقة"
            description="جرّب توسيع البحث أو إزالة التصفية."
          />
        ) : (
          <ol className="divide-y divide-line">
            {rows.map((entry) => {
              const meta = ACTION_LABEL[entry.action] ?? {
                label: entry.action,
                icon: 'Circle',
                tone: 'neutral' as const,
              };
              return (
                <li key={entry.id} className="flex items-start gap-3 px-5 py-3.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-muted">
                    <Icon name={meta.icon} className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      <span className="text-2xs text-ink-faint">{formatDateAr(entry.at)}</span>
                      <span className="text-2xs font-medium text-ink-muted">{entry.actor}</span>
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-ink">{entry.summaryAr}</p>
                    {entry.reason && entry.reason !== entry.summaryAr && (
                      <p className="mt-0.5 text-2xs text-ink-muted">السبب: {entry.reason}</p>
                    )}
                    {entry.before !== undefined && entry.after !== undefined && (
                      <p className="mt-1 text-2xs text-ink-faint">
                        {describeScoreShift(entry.before, entry.after)}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}

function describeScoreShift(before: unknown, after: unknown): string {
  const b = (before as { score?: number })?.score;
  const a = (after as { score?: number })?.score;
  if (typeof b !== 'number' || typeof a !== 'number') return '';
  if (a === b) return `درجة جودة الجدول لم تتغيّر (${a}%).`;
  return `درجة جودة الجدول: ${b}% ← ${a}% (${a > b ? '+' : ''}${a - b}).`;
}
