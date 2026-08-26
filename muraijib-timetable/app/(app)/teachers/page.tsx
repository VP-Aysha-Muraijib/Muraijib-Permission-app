'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Teacher } from '@/lib/domain/types';
import { useSchedule } from '@/lib/state/schedule-provider';
import { Badge, Button, Card, Input, Select } from '@/components/ui';
import { DataTable, type Column } from '@/components/ui/data-table';
import { PageHeader } from '@/components/layout/page-header';
import { Icon } from '@/components/layout/icon';
import { LoadBadge, LoadBar } from '@/components/workload-cell';
import { matchesAr } from '@/lib/utils';
import { TeacherEditor } from './teacher-editor';

const STATUS_LABEL: Record<Teacher['status'], string> = {
  active: 'على رأس العمل',
  new: 'جديدة',
  transferred: 'منقولة',
  on_leave: 'إجازة',
  unavailable: 'غير متاحة',
};

export default function TeachersPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { snapshot, workloads } = useSchedule();

  const [query, setQuery] = React.useState('');
  const [departmentId, setDepartmentId] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [editing, setEditing] = React.useState<Teacher | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(params.get('new') === '1');

  if (!snapshot) return null;

  const rows = snapshot.teachers.filter((teacher) => {
    if (query && !matchesAr(teacher.nameAr, query) && !matchesAr(teacher.nameEn ?? '', query)) return false;
    if (departmentId && teacher.departmentId !== departmentId) return false;
    if (statusFilter && teacher.status !== statusFilter) return false;
    return true;
  });

  const loadOf = (id: string) => workloads.find((w) => w.teacherId === id)!;

  const columns: Array<Column<Teacher>> = [
    {
      key: 'name',
      header: 'المعلمة',
      width: '20%',
      sortValue: (t) => t.nameAr,
      render: (teacher) => (
        <div className="min-w-0">
          <Link
            href={`/teachers/${teacher.id}`}
            className="block truncate font-semibold text-ink hover:text-brand-ink hover:underline"
          >
            {teacher.nameAr}
          </Link>
          {teacher.notes && <p className="truncate text-2xs text-ink-faint">{teacher.notes}</p>}
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'المادة',
      sortValue: (t) => snapshot.subjects.find((s) => s.id === t.primarySubjectId)?.nameAr ?? '',
      render: (teacher) => (
        <div className="flex flex-wrap gap-1">
          {teacher.subjectIds.slice(0, 2).map((id) => {
            const subject = snapshot.subjects.find((s) => s.id === id);
            return (
              <span
                key={id}
                className="rounded-sm px-1.5 py-0.5 text-2xs font-medium"
                style={{ background: `${subject?.color ?? '#888'}1f`, color: subject?.color ?? undefined }}
              >
                {subject?.nameAr ?? id}
              </span>
            );
          })}
          {teacher.subjectIds.length > 2 && (
            <span className="text-2xs text-ink-faint">+{teacher.subjectIds.length - 2}</span>
          )}
        </div>
      ),
    },
    {
      key: 'load',
      header: 'النصاب',
      width: '18%',
      sortValue: (t) => loadOf(t.id).assigned,
      render: (teacher) => <LoadBar load={loadOf(teacher.id)} />,
    },
    {
      key: 'remaining',
      header: 'المتبقي',
      numeric: true,
      sortValue: (t) => loadOf(t.id).remaining,
      render: (teacher) => {
        const load = loadOf(teacher.id);
        return (
          <span className={load.remaining > 0 ? 'text-warn' : load.remaining < 0 ? 'text-danger' : 'text-ok'}>
            {load.remaining > 0 ? `+${load.remaining}` : load.remaining}
          </span>
        );
      },
    },
    {
      key: 'gaps',
      header: 'الفراغات',
      numeric: true,
      sortValue: (t) => loadOf(t.id).gaps,
      render: (teacher) => loadOf(teacher.id).gaps,
    },
    {
      key: 'status',
      header: 'الحالة',
      sortValue: (t) => t.status,
      render: (teacher) => {
        const load = loadOf(teacher.id);
        if (teacher.status !== 'active' && teacher.status !== 'new') {
          return <Badge tone="danger">{STATUS_LABEL[teacher.status]}</Badge>;
        }
        return <LoadBadge load={load} />;
      },
    },
    {
      key: 'actions',
      header: '',
      width: '5rem',
      render: (teacher) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            setEditing(teacher);
            setEditorOpen(true);
          }}
        >
          <Icon name="Pencil" className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="المعلمات"
        description="كل بيانات المعلمات ديناميكية: المواد المكلَّفة، النصاب، وأوقات عدم التوفر تُقرأ مباشرةً من قِبَل محرك الجدولة."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
          >
            <Icon name="UserPlus" className="h-3.5 w-3.5" />
            إضافة معلمة
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث باسم المعلمة…"
            className="w-52"
          />
          <Select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="w-auto min-w-[10rem]"
          >
            <option value="">كل الأقسام</option>
            {snapshot.departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.nameAr}
              </option>
            ))}
          </Select>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-auto min-w-[9rem]"
          >
            <option value="">كل الحالات</option>
            {Object.entries(STATUS_LABEL).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </Select>
          <span className="mr-auto text-2xs text-ink-muted">
            {rows.length} من {snapshot.teachers.length}
          </span>
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          initialSort={{ key: 'name', dir: 'asc' }}
          onRowClick={(teacher) => router.push(`/teachers/${teacher.id}`)}
          rowTone={(teacher) => {
            const load = loadOf(teacher.id);
            if (load.status === 'conflict' || teacher.status === 'transferred') return 'danger';
            if (load.status === 'over') return 'danger';
            if (load.status === 'under') return 'warn';
            return null;
          }}
          emptyAr="لا توجد معلمة مطابقة لهذا البحث."
        />
      </Card>

      <TeacherEditor
        open={editorOpen}
        teacher={editing}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}
