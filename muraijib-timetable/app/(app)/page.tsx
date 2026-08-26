'use client';

import Link from 'next/link';
import { useSchedule } from '@/lib/state/schedule-provider';
import { Badge, Button, Card, CardHeader, EmptyState, Stat } from '@/components/ui';
import { Icon } from '@/components/layout/icon';
import { formatDateAr, greetingAr } from '@/lib/utils';
import { buildNotifications, TONE_COLOR } from '@/lib/notifications';

const QUICK_ACTIONS = [
  { href: '/print?kind=teacher', label: 'طباعة جدول معلمة', icon: 'Printer' },
  { href: '/print?kind=class', label: 'طباعة جدول صف', icon: 'FileText' },
  { href: '/timetable', label: 'تعديل الجدول', icon: 'CalendarRange' },
  { href: '/teachers?new=1', label: 'إضافة معلمة', icon: 'UserPlus' },
  { href: '/conflicts', label: 'تشغيل الفحص', icon: 'ShieldCheck' },
  { href: '/import', label: 'استيراد البيانات', icon: 'Upload' },
];

export default function DashboardPage() {
  const { snapshot, health, workloads, audit, versions, scoreDetail } = useSchedule();
  if (!snapshot || !health) return null;

  const activeSections = snapshot.sections.filter((s) => s.isActive);
  const activeTeachers = snapshot.teachers.filter(
    (t) => t.status !== 'transferred' && t.status !== 'on_leave',
  );
  const under = workloads.filter((w) => w.status === 'under');
  const over = workloads.filter((w) => w.status === 'over');
  const current = versions.find((v) => v.isCurrent);

  const alerts = buildNotifications(snapshot, health, workloads);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <p className="text-xs font-medium text-ink-muted">{greetingAr()}</p>
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-ink">
          جدول {snapshot.week.schoolNameAr} · <span className="ltr-run">{snapshot.week.yearLabel}</span>
        </h1>
        <p className="mt-1 text-xs text-ink-muted">
          النسخة الحالية {current?.label ?? '—'}
          {current && ` · ${formatDateAr(current.createdAt)}`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="المعلمات" value={activeTeachers.length} hint={`${snapshot.teachers.length} في السجل`} icon={<Icon name="Users" className="h-4 w-4" />} href="/teachers" />
        <Stat label="الشعب" value={activeSections.length} hint={`${snapshot.grades.length} صفوف`} icon={<Icon name="School" className="h-4 w-4" />} href="/classes" />
        <Stat label="الحصص الأسبوعية" value={snapshot.lessons.length} hint={`${snapshot.subjects.length} مادة`} icon={<Icon name="CalendarRange" className="h-4 w-4" />} href="/timetable" />
        <Stat
          label="صحة الجدول"
          value={health.valid ? `${health.score}%` : 'غير صالح'}
          tone={!health.valid ? 'danger' : health.score >= 85 ? 'ok' : 'warn'}
          hint={scoreDetail[0] ? `أكبر خصم: ${scoreDetail[0].labelAr}` : undefined}
          icon={<Icon name="Activity" className="h-4 w-4" />}
          href="/conflicts"
        />

        <Stat label="حصص غير مسندة" value={health.totals.unassigned} tone={health.totals.unassigned > 0 ? 'warn' : 'ok'} icon={<Icon name="CircleHelp" className="h-4 w-4" />} href="/conflicts" />
        <Stat label="تعارضات مانعة" value={health.totals.blocking} tone={health.totals.blocking > 0 ? 'danger' : 'ok'} icon={<Icon name="TriangleAlert" className="h-4 w-4" />} href="/conflicts" />
        <Stat label="معلمات دون النصاب" value={under.length} tone={under.length > 0 ? 'warn' : 'ok'} icon={<Icon name="TrendingDown" className="h-4 w-4" />} href="/workload" />
        <Stat label="معلمات فوق النصاب" value={over.length} tone={over.length > 0 ? 'danger' : 'ok'} icon={<Icon name="TrendingUp" className="h-4 w-4" />} href="/workload" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="تنبيهات تحتاج انتباهك"
            subtitle="مرتّبة بالأولوية — الأهم أولًا"
            action={
              <Link href="/conflicts">
                <Button size="sm" variant="ghost">
                  عرض الفحص الكامل
                  <Icon name="ArrowLeft" className="h-3.5 w-3.5" />
                </Button>
              </Link>
            }
          />
          {alerts.length === 0 ? (
            <EmptyState
              tone="ok"
              icon={<Icon name="CheckCheck" className="h-5 w-5" />}
              title="لا توجد تنبيهات 🎉"
              description="اجتاز الجدول الحالي كل الفحوص: لا تعارضات، ولا حصص ناقصة، والأنصبة ضمن الحدود."
            />
          ) : (
            <ul className="divide-y divide-line">
              {alerts.slice(0, 7).map((alert) => (
                <li key={alert.id}>
                  <Link
                    href={alert.href}
                    className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-surface-sunken"
                  >
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: TONE_COLOR[alert.tone] }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-ink">{alert.titleAr}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
                        {alert.detailAr}
                      </span>
                    </span>
                    <Icon name="ChevronLeft" className="mt-1 h-4 w-4 shrink-0 text-ink-faint" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="إجراءات سريعة" />
          <div className="grid grid-cols-2 gap-2 p-4">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col items-center gap-2 rounded border border-line px-3 py-4 text-center transition-colors hover:border-brand-soft hover:bg-brand-tint"
              >
                <Icon name={action.icon} className="h-4 w-4 text-brand" />
                <span className="text-2xs font-medium leading-tight text-ink">{action.label}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="آخر التغييرات"
          subtitle="كل تعديل معتمد يُسجَّل هنا ولا يمكن حذفه"
          action={
            <Link href="/audit">
              <Button size="sm" variant="ghost">
                السجل الكامل
                <Icon name="ArrowLeft" className="h-3.5 w-3.5" />
              </Button>
            </Link>
          }
        />
        {audit.length === 0 ? (
          <EmptyState icon={<Icon name="ScrollText" className="h-5 w-5" />} title="لا توجد تغييرات بعد" />
        ) : (
          <ul className="divide-y divide-line">
            {audit.slice(0, 6).map((entry) => (
              <li key={entry.id} className="flex items-start gap-3 px-5 py-3">
                <Badge tone="neutral" className="mt-0.5 shrink-0">
                  {entry.actor}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-relaxed text-ink">{entry.summaryAr}</p>
                  <p className="mt-0.5 text-2xs text-ink-faint">{formatDateAr(entry.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
