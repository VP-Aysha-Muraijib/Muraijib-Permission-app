'use client';

import * as React from 'react';
import type { Slot, Teacher, TeacherStatus } from '@/lib/domain/types';
import { useSchedule } from '@/lib/state/schedule-provider';
import { Button, Field, Input, Modal, Select } from '@/components/ui';
import { localId } from '@/lib/engine/changeset';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: Array<{ id: TeacherStatus; label: string }> = [
  { id: 'active', label: 'على رأس العمل' },
  { id: 'new', label: 'معلمة جديدة' },
  { id: 'transferred', label: 'منقولة من المدرسة' },
  { id: 'on_leave', label: 'في إجازة' },
  { id: 'unavailable', label: 'غير متاحة مؤقتًا' },
];

const empty = (): Teacher => ({
  id: '',
  nameAr: '',
  departmentId: null,
  primarySubjectId: null,
  subjectIds: [],
  requiredLoad: 22,
  maxLoad: 26,
  status: 'active',
  unavailable: [],
  preferences: [],
});

/**
 * محرّر بيانات المعلمة.
 *
 * أوقات عدم التوفر تُحرَّر هنا بشبكة قابلة للنقر، لأنها قيد صارم يؤثر
 * في كل عملية إعادة توزيع — وإخفاؤها في حقل نصّي يجعلها غير مستخدمة عمليًا.
 */
export function TeacherEditor({
  open,
  teacher,
  onClose,
}: {
  open: boolean;
  teacher: Teacher | null;
  onClose: () => void;
}) {
  const { snapshot, saveReference } = useSchedule();
  const [draft, setDraft] = React.useState<Teacher>(teacher ?? empty());
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setDraft(teacher ?? empty());
    setError(null);
  }, [teacher, open]);

  if (!snapshot) return null;
  const isNew = !teacher;

  const toggleSubject = (subjectId: string) => {
    setDraft((d) => ({
      ...d,
      subjectIds: d.subjectIds.includes(subjectId)
        ? d.subjectIds.filter((s) => s !== subjectId)
        : [...d.subjectIds, subjectId],
    }));
  };

  const toggleUnavailable = (slot: Slot) => {
    setDraft((d) => {
      const exists = d.unavailable.some(
        (s) => s.dayId === slot.dayId && s.periodIndex === slot.periodIndex,
      );
      return {
        ...d,
        unavailable: exists
          ? d.unavailable.filter((s) => !(s.dayId === slot.dayId && s.periodIndex === slot.periodIndex))
          : [...d.unavailable, slot],
      };
    });
  };

  const save = async () => {
    setError(null);
    if (!draft.nameAr.trim()) {
      setError('اسم المعلمة مطلوب.');
      return;
    }
    if (draft.subjectIds.length === 0) {
      setError('حدّد مادة واحدة على الأقل — لن يُسند للمعلمة أي حصة خارج المواد المكلَّفة بها.');
      return;
    }
    if (draft.maxLoad < draft.requiredLoad) {
      setError('الحد الأعلى للنصاب لا يمكن أن يكون أقل من النصاب المطلوب.');
      return;
    }

    // إسناد حصص لمعلمة لم تعد على رأس العمل يترك الجدول في حالة غير صالحة.
    const assigned = snapshot.lessons.filter((l) => l.teacherId === draft.id).length;
    if ((draft.status === 'transferred' || draft.status === 'on_leave') && assigned > 0) {
      setError(
        `لدى ${draft.nameAr} ${assigned} حصة على الجدول. احفظ التغيير ثم استخدم المساعد الذكي لإعادة توزيعها — سيقترح حلولًا بأقل تغيير ممكن.`,
      );
    }

    setBusy(true);
    const record: Teacher = {
      ...draft,
      id: draft.id || localId('t'),
      primarySubjectId: draft.primarySubjectId ?? draft.subjectIds[0] ?? null,
      departmentId:
        draft.departmentId ??
        snapshot.subjects.find((s) => s.id === draft.subjectIds[0])?.departmentId ??
        null,
    };

    const teachers = isNew
      ? [...snapshot.teachers, record]
      : snapshot.teachers.map((t) => (t.id === record.id ? record : t));

    await saveReference(
      { teachers },
      isNew ? `إضافة المعلمة ${record.nameAr}` : `تعديل بيانات المعلمة ${record.nameAr}`,
    );
    setBusy(false);
    onClose();
  };

  const teachingDays = snapshot.week.days.filter((d) => d.isTeaching);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isNew ? 'إضافة معلمة' : `تعديل بيانات ${teacher?.nameAr}`}
      subtitle="المواد المكلَّفة وأوقات عدم التوفر قيود صارمة يحترمها المحرك في كل عملية توزيع."
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
      <div className="space-y-5">
        {error && (
          <p className="rounded border border-warn/30 bg-warn-soft px-3 py-2 text-xs leading-relaxed text-warn">
            {error}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="الاسم بالعربية">
            <Input
              value={draft.nameAr}
              onChange={(e) => setDraft({ ...draft, nameAr: e.target.value })}
              placeholder="اسم المعلمة"
            />
          </Field>
          <Field label="الاسم بالإنجليزية (اختياري)">
            <Input
              value={draft.nameEn ?? ''}
              onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })}
              dir="ltr"
            />
          </Field>
          <Field label="النصاب الأسبوعي المطلوب">
            <Input
              type="number"
              min={0}
              max={40}
              value={draft.requiredLoad}
              onChange={(e) => setDraft({ ...draft, requiredLoad: Number(e.target.value) })}
            />
          </Field>
          <Field label="الحد الأعلى المسموح" hint="لن يتجاوزه المحرك حتى عند إعادة التوزيع الاضطراري.">
            <Input
              type="number"
              min={0}
              max={40}
              value={draft.maxLoad}
              onChange={(e) => setDraft({ ...draft, maxLoad: Number(e.target.value) })}
            />
          </Field>
          <Field label="الحالة">
            <Select
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value as TeacherStatus })}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="القسم">
            <Select
              value={draft.departmentId ?? ''}
              onChange={(e) => setDraft({ ...draft, departmentId: e.target.value || null })}
            >
              <option value="">— يُحدَّد من المادة —</option>
              {snapshot.departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.nameAr}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <section>
          <p className="mb-2 text-xs font-semibold text-ink">
            المواد المكلَّفة بها
            <span className="mr-2 font-normal text-ink-faint">
              لن يُسند للمعلمة أي حصة خارج هذه المواد
            </span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {snapshot.subjects.map((subject) => {
              const active = draft.subjectIds.includes(subject.id);
              return (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => toggleSubject(subject.id)}
                  className={cn(
                    'rounded-sm border px-2.5 py-1 text-xs transition-colors',
                    active
                      ? 'border-brand bg-brand-tint font-medium text-brand-ink'
                      : 'border-line text-ink-muted hover:bg-surface-sunken',
                  )}
                >
                  {subject.nameAr}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <p className="mb-2 text-xs font-semibold text-ink">
            أوقات عدم التوفر
            <span className="mr-2 font-normal text-ink-faint">
              اضغط على أي حصة لمنع إسنادها ({draft.unavailable.length} محدّدة)
            </span>
          </p>
          <div className="overflow-x-auto rounded border border-line">
            <table className="w-full border-collapse text-center">
              <thead>
                <tr className="border-b border-line bg-surface-sunken">
                  <th className="table-head px-2 py-1.5 text-right">الحصة</th>
                  {teachingDays.map((day) => (
                    <th key={day.id} className="px-2 py-1.5 text-2xs font-semibold text-ink">
                      {day.nameAr}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(teachingDays[0]?.periods.filter((p) => p.kind === 'lesson') ?? []).map((period, rowIndex) => (
                  <tr key={period.index} className="border-b border-line last:border-0">
                    <th className="px-2 py-1 text-right text-2xs font-medium text-ink-muted">
                      {period.labelAr}
                    </th>
                    {teachingDays.map((day) => {
                      const dayPeriods = day.periods.filter((p) => p.kind === 'lesson');
                      const target = dayPeriods[rowIndex];
                      if (!target) {
                        return (
                          <td key={day.id} className="bg-surface-sunken p-1">
                            <span className="text-2xs text-ink-faint">—</span>
                          </td>
                        );
                      }
                      const blocked = draft.unavailable.some(
                        (s) => s.dayId === day.id && s.periodIndex === target.index,
                      );
                      return (
                        <td key={day.id} className="p-1">
                          <button
                            type="button"
                            onClick={() => toggleUnavailable({ dayId: day.id, periodIndex: target.index })}
                            className={cn(
                              'h-6 w-full rounded-sm border text-2xs transition-colors',
                              blocked
                                ? 'border-danger bg-danger-soft font-medium text-danger'
                                : 'border-line text-ink-faint hover:bg-surface-sunken',
                            )}
                          >
                            {blocked ? 'غير متاحة' : '—'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <Field label="ملاحظات">
          <Input
            value={draft.notes ?? ''}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            placeholder="أي ملاحظة تخص جدول المعلمة"
          />
        </Field>
      </div>
    </Modal>
  );
}
