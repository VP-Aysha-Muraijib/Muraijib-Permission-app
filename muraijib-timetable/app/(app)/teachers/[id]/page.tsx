'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSchedule } from '@/lib/state/schedule-provider';
import { Badge, Button, Card, CardHeader, EmptyState, Tabs } from '@/components/ui';
import { PageHeader } from '@/components/layout/page-header';
import { Icon } from '@/components/layout/icon';
import { TimetableGrid } from '@/components/timetable/timetable-grid';
import { LoadBar, LoadBadge } from '@/components/workload-cell';
import { periodLabel } from '@/lib/engine/snapshot';
import { teacherDayRuns } from '@/lib/engine/workload';
import { formatDateAr } from '@/lib/utils';

type Tab = 'schedule' | 'classes' | 'workload' | 'preferences' | 'changes';

export default function TeacherProfilePage() {
  const params = useParams<{ id: string }>();
  const { snapshot, index, workloads, audit, health } = useSchedule();
  const [tab, setTab] = React.useState<Tab>('schedule');

  if (!snapshot || !index) return null;

  const teacher = snapshot.teachers.find((t) => t.id === params.id);
  if (!teacher) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={<Icon name="UserX" className="h-5 w-5" />}
          title="المعلمة غير موجودة"
          description="ربما حُذف سجلها أو تغيّر معرّفها."
          action={
            <Link href="/teachers">
              <Button variant="secondary" size="sm">
                العودة إلى قائمة المعلمات
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const load = workloads.find((w) => w.teacherId === teacher.id)!;
  const lessons = snapshot.lessons.filter((l) => l.teacherId === teacher.id);
  const primary = snapshot.subjects.find((s) => s.id === teacher.primarySubjectId);
  const department = snapshot.departments.find((d) => d.id === teacher.departmentId);

  const sectionsTaught = [...new Set(lessons.map((l) => l.sectionId))]
    .map((id) => snapshot.sections.find((s) => s.id === id))
    .filter(Boolean);

  const teacherViolations = (health?.violations ?? []).filter((v) =>
    v.teacherIds.includes(teacher.id),
  );

  const teacherAudit = audit.filter((entry) => entry.summaryAr.includes(teacher.nameAr));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {teacher.nameAr}
            {teacher.status === 'transferred' && <Badge tone="danger">منقولة من المدرسة</Badge>}
            {teacher.status === 'on_leave' && <Badge tone="warn">في إجازة</Badge>}
            {teacher.status === 'new' && <Badge tone="info">معلمة جديدة</Badge>}
          </span>
        }
        description={[department?.nameAr, primary?.nameAr].filter(Boolean).join(' · ')}
        actions={
          <>
            <Link href={`/print?kind=teacher&id=${teacher.id}`}>
              <Button size="sm" variant="secondary">
                <Icon name="Printer" className="h-3.5 w-3.5" />
                طباعة الجدول
              </Button>
            </Link>
            <Link href={`/timetable?view=teacher&id=${teacher.id}`}>
              <Button size="sm" variant="primary">
                <Icon name="CalendarRange" className="h-3.5 w-3.5" />
                تعديل الجدول
              </Button>
            </Link>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="px-4 py-3">
          <p className="mb-2 text-2xs font-medium text-ink-muted">النصاب الأسبوعي</p>
          <LoadBar load={load} />
          <div className="mt-2">
            <LoadBadge load={load} />
          </div>
        </Card>
        <Card className="px-4 py-3">
          <p className="text-2xs font-medium text-ink-muted">الفراغات في الجدول</p>
          <p className="tabular mt-1 text-2xl font-bold leading-none">{load.gaps}</p>
          <p className="mt-1.5 text-2xs text-ink-faint">
            حصص شاغرة بين حصتين في اليوم نفسه
          </p>
        </Card>
        <Card className="px-4 py-3">
          <p className="text-2xs font-medium text-ink-muted">أطول تتابع</p>
          <p className="tabular mt-1 text-2xl font-bold leading-none">{load.longestRun}</p>
          <p className="mt-1.5 text-2xs text-ink-faint">حصص متتالية بلا فاصل</p>
        </Card>
        <Card className="px-4 py-3">
          <p className="text-2xs font-medium text-ink-muted">الحصص الأولى والأخيرة</p>
          <p className="tabular mt-1 text-2xl font-bold leading-none">
            {load.firstPeriods + load.lastPeriods}
          </p>
          <p className="mt-1.5 text-2xs text-ink-faint">
            {load.firstPeriods} أولى · {load.lastPeriods} أخيرة
          </p>
        </Card>
      </div>

      {teacherViolations.length > 0 && (
        <Card className="mb-4 border-danger/30">
          <CardHeader
            title={`${teacherViolations.length} ملاحظة على جدول هذه المعلمة`}
            subtitle="تُعالج من مساحة عمل الجدول أو عبر المساعد الذكي"
          />
          <ul className="divide-y divide-line">
            {teacherViolations.slice(0, 6).map((violation, i) => (
              <li key={i} className="px-4 py-2.5 text-xs leading-relaxed text-danger">
                {violation.messageAr}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="overflow-hidden">
        <Tabs
          className="px-4 pt-1"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'schedule', label: 'الجدول', count: lessons.length },
            { id: 'classes', label: 'الشعب', count: sectionsTaught.length },
            { id: 'workload', label: 'توزيع النصاب' },
            { id: 'preferences', label: 'القيود والرغبات', count: teacher.unavailable.length + teacher.preferences.length },
            { id: 'changes', label: 'التغييرات', count: teacherAudit.length },
          ]}
        />

        <div className="p-4">
          {tab === 'schedule' && (
            lessons.length === 0 ? (
              <EmptyState
                icon={<Icon name="CalendarOff" className="h-5 w-5" />}
                title="لا توجد حصص مسندة"
                description="لم تُسند إلى هذه المعلمة أي حصة بعد. يمكن إسناد الحصص من مساحة عمل الجدول."
              />
            ) : (
              <TimetableGrid index={index} lessons={lessons} context="teacher" readOnly emptyHintAr="فراغ" />
            )
          )}

          {tab === 'classes' && (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {sectionsTaught.map((section) => {
                const count = lessons.filter((l) => l.sectionId === section!.id).length;
                const subjectsHere = [
                  ...new Set(lessons.filter((l) => l.sectionId === section!.id).map((l) => l.subjectId)),
                ];
                return (
                  <li key={section!.id}>
                    <Link
                      href={`/timetable?view=class&id=${section!.id}`}
                      className="block rounded border border-line px-3 py-2.5 transition-colors hover:border-brand-soft hover:bg-brand-tint"
                    >
                      <p className="text-xs font-semibold text-ink">الشعبة {section!.label}</p>
                      <p className="mt-0.5 text-2xs text-ink-muted">
                        {count} حصة ·{' '}
                        {subjectsHere
                          .map((id) => snapshot.subjects.find((s) => s.id === id)?.nameAr)
                          .join('، ')}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {tab === 'workload' && <WorkloadByDay teacherId={teacher.id} />}

          {tab === 'preferences' && (
            <div className="space-y-4 text-xs">
              <section>
                <h3 className="mb-2 font-semibold text-ink">أوقات عدم التوفر (قيد صارم)</h3>
                {teacher.unavailable.length === 0 ? (
                  <p className="text-ink-muted">لا توجد أوقات عدم توفر مسجّلة.</p>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {teacher.unavailable.map((slot, i) => (
                      <li key={i}>
                        <Badge tone="danger">{periodLabel(index, slot)}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section>
                <h3 className="mb-2 font-semibold text-ink">الرغبات (قيد مرن يدخل في درجة الجودة)</h3>
                {teacher.preferences.length === 0 ? (
                  <p className="text-ink-muted">لا توجد رغبات مسجّلة.</p>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {teacher.preferences.map((preference, i) => (
                      <li key={i}>
                        <Badge tone={preference.kind === 'preferred' ? 'ok' : 'warn'}>
                          {preference.kind === 'preferred' ? 'تفضّل' : 'تتجنّب'} ·{' '}
                          {periodLabel(index, preference)}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section>
                <h3 className="mb-2 font-semibold text-ink">المواد المكلَّفة بها</h3>
                <ul className="flex flex-wrap gap-1.5">
                  {teacher.subjectIds.map((id) => (
                    <li key={id}>
                      <Badge tone="brand">{snapshot.subjects.find((s) => s.id === id)?.nameAr ?? id}</Badge>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}

          {tab === 'changes' && (
            teacherAudit.length === 0 ? (
              <EmptyState
                icon={<Icon name="ScrollText" className="h-5 w-5" />}
                title="لا توجد تغييرات مسجّلة"
                description="لم يُجرَ أي تعديل يخص هذه المعلمة منذ اعتماد الجدول."
              />
            ) : (
              <ul className="divide-y divide-line">
                {teacherAudit.map((entry) => (
                  <li key={entry.id} className="py-2.5">
                    <p className="text-xs leading-relaxed text-ink">{entry.summaryAr}</p>
                    <p className="mt-0.5 text-2xs text-ink-faint">
                      {entry.actor} · {formatDateAr(entry.at)}
                    </p>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      </Card>
    </div>
  );
}

function WorkloadByDay({ teacherId }: { teacherId: string }) {
  const { index } = useSchedule();
  if (!index) return null;
  const runs = teacherDayRuns(index, teacherId);
  const max = Math.max(1, ...runs.map((r) => r.available.length));

  return (
    <div className="space-y-2">
      {runs.map((run) => {
        const day = index.dayById.get(run.dayId);
        return (
          <div key={run.dayId} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-xs text-ink-muted">{day?.nameAr}</span>
            <div className="flex flex-1 gap-1">
              {run.available.map((periodIndex) => {
                const busy = run.busy.includes(periodIndex);
                const isGap =
                  !busy &&
                  run.busy.length > 1 &&
                  periodIndex > run.busy[0] &&
                  periodIndex < run.busy[run.busy.length - 1];
                return (
                  <div
                    key={periodIndex}
                    title={`الحصة ${periodIndex}${busy ? '' : isGap ? ' — فراغ' : ' — خالية'}`}
                    className="h-6 flex-1 rounded-sm border"
                    style={{
                      background: busy
                        ? 'var(--brand-primary)'
                        : isGap
                          ? 'var(--warn-soft)'
                          : 'var(--surface-sunken)',
                      borderColor: isGap ? 'var(--warn)' : 'transparent',
                    }}
                  />
                );
              })}
              {Array.from({ length: max - run.available.length }, (_, i) => (
                <div key={`pad-${i}`} className="h-6 flex-1" />
              ))}
            </div>
            <span className="tabular w-16 shrink-0 text-left text-2xs text-ink-muted">
              {run.busy.length} حصة
            </span>
          </div>
        );
      })}
      <p className="pt-2 text-2xs text-ink-faint">
        الأزرق = حصة · البرتقالي = فراغ بين حصتين · الرمادي = خانة خالية في طرف اليوم
      </p>
    </div>
  );
}
