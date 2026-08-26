'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { Period, PeriodKind, SchoolDay } from '@/lib/domain/types';
import { useSchedule } from '@/lib/state/schedule-provider';
import { DATA_MODE } from '@/lib/data/client';
import { localStore } from '@/lib/data/local';
import { BRAND, hasOfficialAssets } from '@/lib/brand';
import { Badge, Button, Card, CardHeader, Field, Input, Modal, Select, Tabs } from '@/components/ui';
import { PageHeader } from '@/components/layout/page-header';
import { Icon } from '@/components/layout/icon';
import { cn } from '@/lib/utils';

type Tab = 'week' | 'identity' | 'roles' | 'data';

const KIND_LABEL: Record<PeriodKind, string> = {
  lesson: 'حصة دراسية',
  break: 'فسحة',
  prayer: 'صلاة',
  assembly: 'طابور',
  reserved: 'فترة محجوزة',
};

export default function SettingsPage() {
  const [tab, setTab] = React.useState<Tab>('week');

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="الإعدادات"
        description="أسبوع الدراسة والهوية البصرية والصلاحيات ومصدر البيانات."
      />
      <Card className="overflow-hidden">
        <Tabs
          className="px-4 pt-1"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'week', label: 'أسبوع الدراسة' },
            { id: 'identity', label: 'الهوية البصرية' },
            { id: 'roles', label: 'الصلاحيات' },
            { id: 'data', label: 'البيانات' },
          ]}
        />
        <div className="p-5">
          {tab === 'week' && <WeekSettings />}
          {tab === 'identity' && <IdentitySettings />}
          {tab === 'roles' && <RolesSettings />}
          {tab === 'data' && <DataSettings />}
        </div>
      </Card>
    </div>
  );
}

/* ────────── أسبوع الدراسة ────────── */

function WeekSettings() {
  const { snapshot, index, saveReference } = useSchedule();
  const [editing, setEditing] = React.useState<SchoolDay | null>(null);

  if (!snapshot || !index) return null;
  const totalSlots = index.teachingSlots.length;

  const toggleTeaching = async (day: SchoolDay) => {
    const lessons = snapshot.lessons.filter((l) => l.dayId === day.id).length;
    if (day.isTeaching && lessons > 0) {
      alert(
        `لا يمكن تعطيل ${day.nameAr} وفيه ${lessons} حصة. انقل حصصه أولًا أو احذفها من مساحة عمل الجدول.`,
      );
      return;
    }
    await saveReference(
      {
        week: {
          ...snapshot.week,
          days: snapshot.week.days.map((d) =>
            d.id === day.id ? { ...d, isTeaching: !d.isTeaching } : d,
          ),
        },
      },
      `${day.isTeaching ? 'تعطيل' : 'تفعيل'} يوم ${day.nameAr} في أسبوع الدراسة`,
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded border border-line bg-surface-sunken px-4 py-3">
        <div>
          <p className="text-xs font-semibold text-ink">إجمالي الخانات التدريسية الأسبوعية</p>
          <p className="text-2xs text-ink-muted">
            هذا الرقم هو سقف عدد الحصص لكل شعبة، ويجب أن تطابقه خطة المواد.
          </p>
        </div>
        <span className="tabular mr-auto text-2xl font-bold text-brand-ink">{totalSlots}</span>
      </div>

      <p className="text-2xs leading-relaxed text-ink-muted">
        لا يُفترض أن الأيام متطابقة: لكل يوم عدد حصصه وأوقاته الخاصة، والمحرك يقرأها كما هي.
      </p>

      <ul className="space-y-2">
        {snapshot.week.days
          .slice()
          .sort((a, b) => a.sort - b.sort)
          .map((day) => {
            const lessons = day.periods.filter((p) => p.kind === 'lesson').length;
            const used = snapshot.lessons.filter((l) => l.dayId === day.id).length;
            return (
              <li
                key={day.id}
                className={cn(
                  'flex flex-wrap items-center gap-3 rounded border px-4 py-3',
                  day.isTeaching ? 'border-line' : 'border-dashed border-line opacity-60',
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink">{day.nameAr}</p>
                  <p className="mt-0.5 text-2xs text-ink-muted">
                    {lessons} حصة دراسية · {day.periods.length} فترة إجمالًا · {used} حصة مجدولة
                  </p>
                </div>
                <div className="mr-auto flex items-center gap-2">
                  {!day.isTeaching && <Badge tone="neutral">غير تدريسي</Badge>}
                  <Button size="sm" variant="ghost" onClick={() => setEditing(day)}>
                    <Icon name="Clock" className="h-3.5 w-3.5" />
                    الفترات والأوقات
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void toggleTeaching(day)}>
                    {day.isTeaching ? 'تعطيل' : 'تفعيل'}
                  </Button>
                </div>
              </li>
            );
          })}
      </ul>

      <DayEditor day={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function DayEditor({ day, onClose }: { day: SchoolDay | null; onClose: () => void }) {
  const { snapshot, saveReference } = useSchedule();
  const [periods, setPeriods] = React.useState<Period[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setPeriods(day ? day.periods.map((p) => ({ ...p })) : []);
    setError(null);
  }, [day]);

  if (!day || !snapshot) return null;

  const save = async () => {
    // تعطيل فترة تحتها حصص مجدولة يجعل الجدول غير صالح فورًا.
    const removedLessonSlots = day.periods
      .filter((p) => p.kind === 'lesson')
      .filter((p) => periods.find((n) => n.index === p.index)?.kind !== 'lesson')
      .map((p) => p.index);

    const affected = snapshot.lessons.filter(
      (l) => l.dayId === day.id && removedLessonSlots.includes(l.periodIndex),
    ).length;

    if (affected > 0) {
      setError(
        `تحويل هذه الفترات إلى غير تدريسية يترك ${affected} حصة مجدولة خارج الفترات الدراسية. انقلها أولًا من مساحة عمل الجدول.`,
      );
      return;
    }

    setBusy(true);
    await saveReference(
      {
        week: {
          ...snapshot.week,
          days: snapshot.week.days.map((d) => (d.id === day.id ? { ...d, periods } : d)),
        },
      },
      `تعديل فترات يوم ${day.nameAr}`,
    );
    setBusy(false);
    onClose();
  };

  return (
    <Modal
      open={Boolean(day)}
      onClose={onClose}
      size="lg"
      title={`فترات يوم ${day.nameAr}`}
      subtitle="الفترات غير التدريسية (فسحة، صلاة، طابور) تظهر في الجدول ولا تُسند إليها حصص."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            إلغاء
          </Button>
          <Button variant="primary" onClick={save} disabled={busy}>
            {busy ? 'جارٍ الحفظ…' : 'حفظ'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {error && (
          <p className="rounded border border-warn/30 bg-warn-soft px-3 py-2 text-xs leading-relaxed text-warn">
            {error}
          </p>
        )}

        <table className="w-full border-collapse text-right">
          <thead>
            <tr className="border-b border-line">
              <th className="table-head px-2 py-1.5">#</th>
              <th className="table-head px-2 py-1.5">النوع</th>
              <th className="table-head px-2 py-1.5">الاسم</th>
              <th className="table-head px-2 py-1.5">من</th>
              <th className="table-head px-2 py-1.5">إلى</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((period, i) => (
              <tr key={period.index} className="border-b border-line last:border-0">
                <td className="tabular px-2 py-1.5 text-xs text-ink-muted">{period.index}</td>
                <td className="px-2 py-1.5">
                  <Select
                    value={period.kind}
                    onChange={(e) => {
                      const next = [...periods];
                      next[i] = { ...period, kind: e.target.value as PeriodKind };
                      setPeriods(next);
                    }}
                    className="h-8 text-2xs"
                  >
                    {Object.entries(KIND_LABEL).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    value={period.labelAr}
                    onChange={(e) => {
                      const next = [...periods];
                      next[i] = { ...period, labelAr: e.target.value };
                      setPeriods(next);
                    }}
                    className="h-8 text-2xs"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="time"
                    value={period.startTime}
                    onChange={(e) => {
                      const next = [...periods];
                      next[i] = { ...period, startTime: e.target.value };
                      setPeriods(next);
                    }}
                    className="h-8 w-28 text-2xs"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="time"
                    value={period.endTime}
                    onChange={(e) => {
                      const next = [...periods];
                      next[i] = { ...period, endTime: e.target.value };
                      setPeriods(next);
                    }}
                    className="h-8 w-28 text-2xs"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            setPeriods([
              ...periods,
              {
                index: Math.max(0, ...periods.map((p) => p.index)) + 1,
                kind: 'lesson',
                labelAr: `الحصة ${periods.filter((p) => p.kind === 'lesson').length + 1}`,
                startTime: '13:00',
                endTime: '13:45',
              },
            ])
          }
        >
          <Icon name="Plus" className="h-3.5 w-3.5" />
          إضافة فترة
        </Button>
      </div>
    </Modal>
  );
}

/* ────────── الهوية البصرية ────────── */

function IdentitySettings() {
  return (
    <div className="space-y-4 text-xs leading-relaxed">
      <div className="rounded border border-line bg-surface-sunken px-4 py-3">
        <p className="font-semibold text-ink">حالة الأصول الرسمية</p>
        <p className="mt-1 text-ink-muted">
          {hasOfficialAssets()
            ? 'الشعار الرسمي محمّل ويظهر في كل المطبوعات.'
            : 'لم تُزوَّد الأصول الرسمية بعد. لم يُرسم شعار تقريبي ولم تُخترع ألوان وزارية — يظهر في الترويسة إطار محجوز إلى حين تزويد الملف المعتمد.'}
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        <Row label="اسم الجهة" value={BRAND.ministryNameAr} />
        <Row label="اسم المدرسة" value={BRAND.schoolNameAr} />
        <Row label="اسم النظام في التذييل" value={BRAND.systemNameAr} />
        <Row label="ملف الشعار" value={BRAND.ministryLogo ?? 'غير مزوَّد'} />
      </dl>

      <div className="rounded border border-line px-4 py-3">
        <p className="font-semibold text-ink">كيف تُضاف الأصول الرسمية</p>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-ink-muted">
          <li>ضع ملفات الشعار المعتمدة في مجلد <code className="ltr-run rounded bg-surface-sunken px-1">public/brand/</code>.</li>
          <li>حدّث المسارات في <code className="ltr-run rounded bg-surface-sunken px-1">lib/brand.ts</code>.</li>
          <li>حدّث الألوان في <code className="ltr-run rounded bg-surface-sunken px-1">app/tokens.css</code> — كل ألوان الواجهة تشير إليها، فلا حاجة لتعديل أي مكوّن.</li>
        </ol>
      </div>
    </div>
  );
}

/* ────────── الصلاحيات ────────── */

const ROLES = [
  {
    id: 'admin',
    nameAr: 'نائب المدير / مدير النظام',
    canAr: ['كل الصلاحيات', 'اعتماد التغييرات', 'الاستيراد واسترجاع النسخ', 'إدارة المستخدمين'],
  },
  {
    id: 'coordinator',
    nameAr: 'منسّق الجدول',
    canAr: ['تعديل الجدول ضمن نطاقه', 'اقتراح تغييرات', 'الطباعة والتصدير'],
    cannotAr: ['استيراد بيانات جديدة', 'استرجاع نسخة سابقة'],
  },
  {
    id: 'viewer',
    nameAr: 'اطّلاع فقط',
    canAr: ['عرض الجداول والتقارير', 'الطباعة'],
    cannotAr: ['أي تعديل على الجدول'],
  },
];

function RolesSettings() {
  const { profile } = useSchedule();
  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-ink-muted">
        المنصة داخلية ومحدودة الوصول. الأدوار قابلة للتوسّع لاحقًا، وكل كتابة تمرّ بتحقق على الخادم
        بغضّ النظر عن الدور — الصلاحية لا تُغني عن التحقق.
      </p>

      <ul className="space-y-2">
        {ROLES.map((role) => (
          <li
            key={role.id}
            className={cn(
              'rounded border px-4 py-3',
              profile?.role === role.id ? 'border-brand-soft bg-brand-tint' : 'border-line',
            )}
          >
            <p className="flex items-center gap-2 text-xs font-bold text-ink">
              {role.nameAr}
              {profile?.role === role.id && <Badge tone="brand">دورك الحالي</Badge>}
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-2xs font-semibold text-ok">يستطيع</p>
                <ul className="mt-0.5 space-y-0.5">
                  {role.canAr.map((item) => (
                    <li key={item} className="text-2xs text-ink-muted">
                      · {item}
                    </li>
                  ))}
                </ul>
              </div>
              {role.cannotAr && (
                <div>
                  <p className="text-2xs font-semibold text-danger">لا يستطيع</p>
                  <ul className="mt-0.5 space-y-0.5">
                    {role.cannotAr.map((item) => (
                      <li key={item} className="text-2xs text-ink-muted">
                        · {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ────────── البيانات ────────── */

function DataSettings() {
  const router = useRouter();
  const { isDemo, versions, snapshot, refresh } = useSchedule();
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  return (
    <div className="space-y-4 text-xs">
      <dl className="grid gap-3 sm:grid-cols-2">
        <Row label="مصدر البيانات" value={DATA_MODE === 'local' ? 'محلي (متصفح هذا الجهاز)' : 'خادم Supabase'} />
        <Row label="حالة البيانات" value={isDemo ? 'بيانات تجريبية' : 'بيانات المدرسة'} />
        <Row label="عدد النسخ المحفوظة" value={String(versions.length)} />
        <Row label="عدد الحصص" value={String(snapshot?.lessons.length ?? 0)} />
      </dl>

      <div className="rounded border border-info/30 bg-info-soft px-4 py-3 leading-relaxed text-info">
        <p className="font-semibold">حالة وضع الإنتاج</p>
        <p className="mt-1">
          مخطط قاعدة البيانات وسياسات الأمان جاهزان ومتحقَّق منهما على PostgreSQL (مجلد{' '}
          <code className="ltr-run rounded bg-surface px-1">supabase/</code>)، وتشمل فهارس تمنع الحجز
          المزدوج ودالة اعتماد ذرّية وسجل تدقيق لا يُعدَّل. المتبقي هو ربط مسارات{' '}
          <code className="ltr-run rounded bg-surface px-1">/api</code> بعميل Supabase؛ حتى ذلك الحين
          يعمل النظام في الوضع المحلي.
        </p>
      </div>

      {DATA_MODE === 'local' && (
        <div className="rounded border border-warn/30 bg-warn-soft px-4 py-3 leading-relaxed text-warn">
          <p className="font-semibold">تنبيه على الوضع المحلي</p>
          <p className="mt-1">
            البيانات محفوظة في متصفح هذا الجهاز فقط: لا تُشارَك بين المستخدمين، وتضيع بمسح بيانات المتصفح.
            هذا الوضع مخصّص للتقييم وبناء الجدول قبل الربط بالخادم. قبل الاعتماد الفعلي شغّل وضع الخادم
            لتفعيل الصلاحيات والنسخ الاحتياطي والتحقق على الخادم.
          </p>
        </div>
      )}

      <div className="rounded border border-line px-4 py-3">
        <p className="font-semibold text-ink">استيراد بيانات المدرسة</p>
        <p className="mt-1 text-ink-muted">
          يستبدل الاستيراد كل البيانات الحالية وينشئ جدولًا مرجعيًا جديدًا (Baseline v1.0).
        </p>
        <Button size="sm" variant="secondary" className="mt-2" onClick={() => router.push('/import')}>
          <Icon name="Upload" className="h-3.5 w-3.5" />
          فتح معالج الاستيراد
        </Button>
      </div>

      {DATA_MODE === 'local' && (
        <div className="rounded border border-line px-4 py-3">
          <p className="font-semibold text-ink">إعادة تحميل البيانات التجريبية</p>
          <p className="mt-1 text-ink-muted">
            يحذف كل ما أُدخل في هذا المتصفح ويعيد المنظومة إلى حالتها التجريبية الأولى. للتجريب فقط.
          </p>
          <Button size="sm" variant="danger" className="mt-2" onClick={() => setConfirmReset(true)}>
            <Icon name="RotateCcw" className="h-3.5 w-3.5" />
            إعادة التهيئة
          </Button>
        </div>
      )}

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="إعادة تهيئة البيانات"
        subtitle="سيُحذف كل ما أُدخل في هذا المتصفح: الجدول، النسخ، سجل التغييرات."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)} disabled={busy}>
              إلغاء
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await localStore.resetToDemo();
                await refresh();
                setBusy(false);
                setConfirmReset(false);
              }}
            >
              {busy ? 'جارٍ…' : 'تأكيد الحذف وإعادة التهيئة'}
            </Button>
          </>
        }
      >
        <p className="text-xs leading-relaxed text-ink-muted">
          لا يمكن التراجع عن هذه الخطوة. إن كان لديك جدول مستورد فصدّره من مركز الطباعة أولًا.
        </p>
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-line px-3 py-2">
      <dt className="text-2xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 truncate text-xs font-medium text-ink">{value}</dd>
    </div>
  );
}
