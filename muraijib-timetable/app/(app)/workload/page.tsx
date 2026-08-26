'use client';

import * as React from 'react';
import Link from 'next/link';
import type { Teacher, TeacherWorkload } from '@/lib/domain/types';
import { useSchedule } from '@/lib/state/schedule-provider';
import { Badge, Button, Card, CardHeader, Input, Select, Stat } from '@/components/ui';
import { DataTable, type Column } from '@/components/ui/data-table';
import { PageHeader } from '@/components/layout/page-header';
import { Icon } from '@/components/layout/icon';
import { LoadBadge, LoadBar, LOAD_LABEL } from '@/components/workload-cell';
import { matchesAr } from '@/lib/utils';

interface Row extends TeacherWorkload {
  id: string;
  teacher: Teacher;
}

export default function WorkloadPage() {
  const { snapshot, workloads } = useSchedule();
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState('');

  if (!snapshot) return null;

  const all: Row[] = workloads.map((load) => ({
    ...load,
    id: load.teacherId,
    teacher: snapshot.teachers.find((t) => t.id === load.teacherId)!,
  }));

  const rows = all.filter((row) => {
    if (query && !matchesAr(row.teacher.nameAr, query)) return false;
    if (status && row.status !== status) return false;
    return true;
  });

  const totalRequired = all.reduce((a, r) => a + r.required, 0);
  const totalAssigned = all.reduce((a, r) => a + r.assigned, 0);
  const under = all.filter((r) => r.status === 'under');
  const over = all.filter((r) => r.status === 'over');
  const spare = under.reduce((a, r) => a + r.remaining, 0);

  const columns: Array<Column<Row>> = [
    {
      key: 'name',
      header: 'المعلمة',
      width: '18%',
      sortValue: (r) => r.teacher.nameAr,
      render: (row) => (
        <Link
          href={`/teachers/${row.teacherId}`}
          className="font-semibold text-ink hover:text-brand-ink hover:underline"
        >
          {row.teacher.nameAr}
        </Link>
      ),
    },
    {
      key: 'subject',
      header: 'المادة',
      sortValue: (r) => snapshot.subjects.find((s) => s.id === r.teacher.primarySubjectId)?.nameAr ?? '',
      render: (row) => snapshot.subjects.find((s) => s.id === row.teacher.primarySubjectId)?.nameAr ?? '—',
    },
    { key: 'required', header: 'المطلوب', numeric: true, sortValue: (r) => r.required, render: (r) => r.required },
    { key: 'assigned', header: 'المسند', numeric: true, sortValue: (r) => r.assigned, render: (r) => r.assigned },
    {
      key: 'remaining',
      header: 'المتبقي',
      numeric: true,
      sortValue: (r) => r.remaining,
      render: (row) => (
        <span className={row.remaining > 0 ? 'text-warn' : row.remaining < 0 ? 'text-danger' : 'text-ok'}>
          {row.remaining > 0 ? `+${row.remaining}` : row.remaining}
        </span>
      ),
    },
    { key: 'max', header: 'الحد الأعلى', numeric: true, sortValue: (r) => r.maxLoad, render: (r) => r.maxLoad },
    { key: 'gaps', header: 'الفراغات', numeric: true, sortValue: (r) => r.gaps, render: (r) => r.gaps },
    { key: 'run', header: 'أطول تتابع', numeric: true, sortValue: (r) => r.longestRun, render: (r) => r.longestRun },
    {
      key: 'progress',
      header: 'التقدّم',
      width: '16%',
      sortValue: (r) => (r.required === 0 ? 0 : r.assigned / r.required),
      render: (row) => <LoadBar load={row} />,
    },
    {
      key: 'status',
      header: 'الحالة',
      sortValue: (r) => r.status,
      render: (row) => <LoadBadge load={row} />,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="الأنصبة"
        description="مصدر الحقيقة عند أي تغيير: من لديها متسع، ومن تجاوزت نصابها، وكم حصة يمكن إعادة توزيعها اليوم."
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="إجمالي الحصص المسندة"
          value={`${totalAssigned} / ${totalRequired}`}
          hint={`${snapshot.lessons.length} حصة في الجدول`}
        />
        <Stat label="دون النصاب" value={under.length} tone={under.length ? 'warn' : 'ok'} hint={`${spare} حصة متاحة للاستيعاب`} />
        <Stat label="فوق النصاب" value={over.length} tone={over.length ? 'danger' : 'ok'} />
        <Stat
          label="متوسط الفراغات"
          value={(all.reduce((a, r) => a + r.gaps, 0) / Math.max(1, all.length)).toFixed(1)}
          hint="لكل معلمة أسبوعيًا"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث باسم المعلمة…"
              className="w-52"
            />
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto min-w-[10rem]">
              <option value="">كل الحالات</option>
              {Object.entries(LOAD_LABEL).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </Select>
            <span className="mr-auto text-2xs text-ink-muted">{rows.length} معلمة</span>
          </div>

          <DataTable
            columns={columns}
            rows={rows}
            initialSort={{ key: 'remaining', dir: 'desc' }}
            rowTone={(row) => (row.status === 'over' || row.status === 'conflict' ? 'danger' : row.status === 'under' ? 'warn' : null)}
          />
        </Card>

        <Card className="h-fit">
          <CardHeader
            title="من يمكنها أخذ حصص إضافية؟"
            subtitle="مرتّبة حسب المتاح ضمن الحد الأعلى"
          />
          {under.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-ink-muted">
              كل المعلمات مكتملات النصاب — أي حصة إضافية ستتجاوز النصاب المطلوب.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {[...under]
                .sort((a, b) => b.remaining - a.remaining)
                .slice(0, 10)
                .map((row) => (
                  <li key={row.teacherId} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <Link
                      href={`/teachers/${row.teacherId}`}
                      className="min-w-0 flex-1 truncate text-xs font-medium text-ink hover:text-brand-ink hover:underline"
                    >
                      {row.teacher.nameAr}
                    </Link>
                    <Badge tone="warn">{row.remaining} حصة</Badge>
                    <span className="tabular shrink-0 text-2xs text-ink-faint">
                      حتى {row.maxLoad - row.assigned} ضمن الحد
                    </span>
                  </li>
                ))}
            </ul>
          )}
          <div className="border-t border-line p-3">
            <Link href="/agent">
              <Button variant="secondary" size="sm" className="w-full">
                <Icon name="Sparkles" className="h-3.5 w-3.5" />
                اطلب من المساعد إعادة توزيع
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
