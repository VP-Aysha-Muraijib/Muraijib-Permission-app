'use client';

import * as React from 'react';
import type { ScheduleVersion } from '@/lib/domain/types';
import { useSchedule } from '@/lib/state/schedule-provider';
import { getStore } from '@/lib/data/client';
import { diffLessons } from '@/lib/engine/changeset';
import { periodLabel } from '@/lib/engine/snapshot';
import { Badge, Button, Card, CardHeader, EmptyState, Modal, Select } from '@/components/ui';
import { PageHeader } from '@/components/layout/page-header';
import { Icon } from '@/components/layout/icon';
import { cn, formatDateAr } from '@/lib/utils';

export default function VersionsPage() {
  const { versions, snapshot, index, restore, refresh } = useSchedule();
  const [compareA, setCompareA] = React.useState('');
  const [compareB, setCompareB] = React.useState('');
  const [comparison, setComparison] = React.useState<React.ReactNode>(null);
  const [confirmRestore, setConfirmRestore] = React.useState<ScheduleVersion | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (versions.length >= 2 && !compareA) {
      setCompareA(versions[1].id);
      setCompareB(versions[0].id);
    }
  }, [versions, compareA]);

  if (!snapshot || !index) return null;

  const runCompare = async () => {
    if (!compareA || !compareB || compareA === compareB) return;
    const store = getStore();
    const [before, after] = await Promise.all([store.getSnapshot(compareA), store.getSnapshot(compareB)]);
    const diff = diffLessons(before, after);
    const labelA = versions.find((v) => v.id === compareA)?.label ?? '';
    const labelB = versions.find((v) => v.id === compareB)?.label ?? '';

    const describe = (lesson: (typeof diff.added)[number]) =>
      `${index.subjectById.get(lesson.subjectId)?.nameAr ?? ''} — الشعبة ${index.sectionById.get(lesson.sectionId)?.label ?? ''}`;

    setComparison(
      <div className="space-y-4">
        <p className="text-xs text-ink-muted">
          مقارنة {labelA} بـ{labelB}: <span className="font-bold text-ink">{diff.changed.length + diff.added.length + diff.removed.length} حصة تغيّرت</span>
        </p>

        <div className="grid grid-cols-3 gap-2">
          <DiffStat color="var(--ok)" label="مضافة" value={diff.added.length} />
          <DiffStat color="var(--danger)" label="محذوفة" value={diff.removed.length} />
          <DiffStat color="var(--warn)" label="معدّلة" value={diff.changed.length} />
        </div>

        {diff.changed.length + diff.added.length + diff.removed.length === 0 ? (
          <p className="rounded border border-line bg-surface-sunken px-3 py-4 text-center text-xs text-ink-muted">
            لا فرق بين النسختين على مستوى الحصص.
          </p>
        ) : (
          <ul className="max-h-80 divide-y divide-line overflow-y-auto rounded border border-line">
            {diff.added.map((lesson) => (
              <li key={`a-${lesson.id}`} className="flex items-start gap-2 px-3 py-2 text-xs">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: 'var(--ok)' }} />
                <span>
                  أُضيفت {describe(lesson)} في{' '}
                  {periodLabel(index, { dayId: lesson.dayId, periodIndex: lesson.periodIndex })}
                </span>
              </li>
            ))}
            {diff.removed.map((lesson) => (
              <li key={`r-${lesson.id}`} className="flex items-start gap-2 px-3 py-2 text-xs">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: 'var(--danger)' }} />
                <span>
                  حُذفت {describe(lesson)} من{' '}
                  {periodLabel(index, { dayId: lesson.dayId, periodIndex: lesson.periodIndex })}
                </span>
              </li>
            ))}
            {diff.changed.map((change) => (
              <li key={`c-${change.after.id}`} className="flex items-start gap-2 px-3 py-2 text-xs">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: 'var(--warn)' }} />
                <span className="min-w-0">
                  <span className="block font-medium text-ink">{describe(change.after)}</span>
                  <span className="block text-2xs text-ink-muted">
                    {change.fields.includes('slot') &&
                      `${periodLabel(index, { dayId: change.before.dayId, periodIndex: change.before.periodIndex })} ← ${periodLabel(index, { dayId: change.after.dayId, periodIndex: change.after.periodIndex })}`}
                    {change.fields.includes('teacher') &&
                      ` · المعلمة: ${change.before.teacherId ? (index.teacherById.get(change.before.teacherId)?.nameAr ?? '—') : 'بلا معلمة'} ← ${change.after.teacherId ? (index.teacherById.get(change.after.teacherId)?.nameAr ?? '—') : 'بلا معلمة'}`}
                    {change.fields.includes('lock') && (change.after.isLocked ? ' · أُقفلت' : ' · فُتح قفلها')}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>,
    );
  };

  const doRestore = async () => {
    if (!confirmRestore) return;
    setBusy(true);
    setError(null);
    const result = await restore(confirmRestore.id);
    setBusy(false);
    if (result.ok) {
      setConfirmRestore(null);
      await refresh();
    } else {
      setError(result.errorAr ?? 'تعذّر الاسترجاع.');
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="نسخ الجدول"
        description="كل اعتماد يُنشئ نسخة جديدة ولا يُعدّل نسخة سابقة. لا تضيع أي حالة سابقة للجدول، والاسترجاع متاح دائمًا."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader title="سجل النسخ" subtitle={`${versions.length} نسخة`} />
          <ol className="divide-y divide-line">
            {versions.map((version) => (
              <li key={version.id} className="flex items-start gap-3 px-5 py-3">
                <span
                  className={cn(
                    'mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-2xs font-bold',
                    version.isCurrent
                      ? 'bg-brand text-ink-invert'
                      : version.isBaseline
                        ? 'bg-accent-soft text-accent'
                        : 'bg-surface-sunken text-ink-muted',
                  )}
                >
                  <Icon name={version.isBaseline ? 'Flag' : 'GitCommitHorizontal'} className="h-3.5 w-3.5" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-xs font-bold text-ink">
                    <span className="ltr-run">{version.label}</span>
                    {version.isCurrent && <Badge tone="brand">النسخة الحالية</Badge>}
                    {version.isBaseline && <Badge tone="accent">الجدول المرجعي</Badge>}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{version.reason}</p>
                  <p className="mt-0.5 text-2xs text-ink-faint">
                    {version.createdBy} · {formatDateAr(version.createdAt)}
                    {version.lessonsChanged > 0 && ` · ${version.lessonsChanged} حصة تغيّرت`}
                    {version.qualityScore !== null && ` · جودة ${version.qualityScore}%`}
                  </p>
                </div>

                {!version.isCurrent && (
                  <Button size="sm" variant="ghost" onClick={() => setConfirmRestore(version)}>
                    <Icon name="RotateCcw" className="h-3.5 w-3.5" />
                    استرجاع
                  </Button>
                )}
              </li>
            ))}
          </ol>
        </Card>

        <Card className="h-fit">
          <CardHeader title="مقارنة نسختين" />
          <div className="space-y-3 p-4">
            {versions.length < 2 ? (
              <p className="text-xs text-ink-muted">تحتاج نسختين على الأقل للمقارنة.</p>
            ) : (
              <>
                <label className="block">
                  <span className="mb-1 block text-2xs text-ink-muted">من النسخة</span>
                  <Select value={compareA} onChange={(e) => setCompareA(e.target.value)}>
                    {versions.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label} — {v.reason}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-2xs text-ink-muted">إلى النسخة</span>
                  <Select value={compareB} onChange={(e) => setCompareB(e.target.value)}>
                    {versions.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label} — {v.reason}
                      </option>
                    ))}
                  </Select>
                </label>
                <Button variant="secondary" size="sm" className="w-full" onClick={() => void runCompare()}>
                  <Icon name="GitCompare" className="h-3.5 w-3.5" />
                  عرض الفرق
                </Button>
              </>
            )}
          </div>
        </Card>
      </div>

      <Modal open={Boolean(comparison)} onClose={() => setComparison(null)} size="lg" title="الفرق بين النسختين">
        {comparison}
      </Modal>

      <Modal
        open={Boolean(confirmRestore)}
        onClose={() => setConfirmRestore(null)}
        title={`استرجاع النسخة ${confirmRestore?.label ?? ''}`}
        subtitle="الاسترجاع لا يحذف شيئًا: يُنشئ نسخة جديدة بمحتوى النسخة المختارة، وتبقى كل النسخ السابقة كما هي."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmRestore(null)} disabled={busy}>
              إلغاء
            </Button>
            <Button variant="primary" onClick={doRestore} disabled={busy}>
              {busy ? 'جارٍ الاسترجاع…' : 'استرجاع'}
            </Button>
          </>
        }
      >
        {error && (
          <p className="mb-3 rounded border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
            {error}
          </p>
        )}
        <p className="text-xs leading-relaxed text-ink-muted">
          سيصبح جدول {confirmRestore?.label} هو الجدول المعتمد الحالي، وسيُسجَّل ذلك في سجل التغييرات.
        </p>
      </Modal>
    </div>
  );
}

function DiffStat({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="rounded border border-line px-3 py-2 text-center">
      <span className="mx-auto mb-1 block h-2 w-2 rounded-full" style={{ background: color }} />
      <p className="tabular text-lg font-bold leading-none text-ink">{value}</p>
      <p className="mt-0.5 text-2xs text-ink-muted">{label}</p>
    </div>
  );
}
