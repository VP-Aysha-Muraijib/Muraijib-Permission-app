'use client';

import * as React from 'react';
import type { CurriculumEntry, Subject } from '@/lib/domain/types';
import { useSchedule } from '@/lib/state/schedule-provider';
import { Badge, Button, Card, CardHeader, Field, Input, Modal, Select } from '@/components/ui';
import { PageHeader } from '@/components/layout/page-header';
import { Icon } from '@/components/layout/icon';
import { localId } from '@/lib/engine/changeset';
import { cn } from '@/lib/utils';

export default function SubjectsPage() {
  const { snapshot, index } = useSchedule();
  const [editing, setEditing] = React.useState<Subject | null>(null);
  const [open, setOpen] = React.useState(false);

  if (!snapshot || !index) return null;
  const grades = [...snapshot.grades].sort((a, b) => a.sort - b.sort);
  const totalSlots = index.teachingSlots.length;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="المواد"
        description="عدد الحصص الأسبوعية لكل صف، والحد اليومي، ومتطلبات المختبر — كلها قيود يقرأها المحرك مباشرةً."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Icon name="Plus" className="h-3.5 w-3.5" />
            إضافة مادة
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <CardHeader
          title="خطة المواد"
          subtitle={`الأسبوع الحالي ${totalSlots} حصة لكل شعبة — يجب أن يساوي مجموع الخطة هذا الرقم`}
        />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-right">
            <thead>
              <tr className="border-b border-line">
                <th className="table-head px-3 py-2">المادة</th>
                <th className="table-head px-3 py-2">القسم</th>
                {grades.map((grade) => (
                  <th key={grade.id} className="table-head px-3 py-2 text-center">
                    {grade.nameAr}
                  </th>
                ))}
                <th className="table-head px-3 py-2 text-center">الحد اليومي</th>
                <th className="table-head px-3 py-2 text-center">إجمالي الحصص</th>
                <th className="table-head px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {snapshot.subjects.map((subject) => {
                const total = (index.bySubject.get(subject.id) ?? []).length;
                return (
                  <tr key={subject.id} className="border-b border-line last:border-0 hover:bg-surface-sunken">
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: subject.color }} />
                        <span className="text-xs font-semibold text-ink">{subject.nameAr}</span>
                        {subject.isCore && <Badge tone="brand">أساسية</Badge>}
                        {subject.needsLab && (
                          <span title="تحتاج مختبرًا">
                            <Icon name="FlaskConical" className="h-3 w-3 text-ink-faint" />
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-ink-muted">
                      {snapshot.departments.find((d) => d.id === subject.departmentId)?.nameAr ?? '—'}
                    </td>
                    {grades.map((grade) => {
                      const entry = snapshot.curriculum.find(
                        (c) => c.gradeId === grade.id && c.subjectId === subject.id,
                      );
                      return (
                        <td key={grade.id} className="tabular px-3 py-2 text-center text-xs">
                          {entry ? (
                            <span className="font-semibold text-ink">{entry.weeklyLessons}</span>
                          ) : (
                            <span className="text-ink-faint">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="tabular px-3 py-2 text-center text-xs text-ink-muted">{subject.maxPerDay}</td>
                    <td className="tabular px-3 py-2 text-center text-xs font-semibold text-ink">{total}</td>
                    <td className="px-3 py-2 text-left">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(subject);
                          setOpen(true);
                        }}
                      >
                        <Icon name="Pencil" className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-line-strong bg-surface-sunken">
                <td className="px-3 py-2 text-xs font-bold text-ink" colSpan={2}>
                  مجموع الخطة لكل شعبة
                </td>
                {grades.map((grade) => {
                  const sum = snapshot.curriculum
                    .filter((c) => c.gradeId === grade.id)
                    .reduce((a, c) => a + c.weeklyLessons, 0);
                  return (
                    <td key={grade.id} className="tabular px-3 py-2 text-center text-xs font-bold">
                      <span
                        className={cn(
                          sum === totalSlots ? 'text-ok' : sum > totalSlots ? 'text-danger' : 'text-warn',
                        )}
                      >
                        {sum} / {totalSlots}
                      </span>
                    </td>
                  );
                })}
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <SubjectEditor open={open} subject={editing} onClose={() => setOpen(false)} />
    </div>
  );
}

const PALETTE = ['#8b5a3c', '#4b7a52', '#2f6f8f', '#2c5f9e', '#2e6b52', '#8a6a2f', '#6b5b8f', '#a05a7a', '#3f7f6f', '#7a6a5a'];

function SubjectEditor({
  open,
  subject,
  onClose,
}: {
  open: boolean;
  subject: Subject | null;
  onClose: () => void;
}) {
  const { snapshot, saveReference } = useSchedule();
  const [draft, setDraft] = React.useState<Subject | null>(null);
  const [weekly, setWeekly] = React.useState<Record<string, number>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!snapshot) return;
    setError(null);
    const base: Subject =
      subject ?? {
        id: '',
        code: '',
        nameAr: '',
        departmentId: snapshot.departments[0]?.id ?? null,
        color: PALETTE[snapshot.subjects.length % PALETTE.length],
        needsLab: false,
        roomKind: null,
        maxPerDay: 1,
        allowsDouble: false,
        preferredDistribution: 'spread',
        isCore: false,
      };
    setDraft(base);
    setWeekly(
      Object.fromEntries(
        snapshot.grades.map((grade) => [
          grade.id,
          snapshot.curriculum.find((c) => c.gradeId === grade.id && c.subjectId === base.id)?.weeklyLessons ?? 0,
        ]),
      ),
    );
  }, [subject, open, snapshot]);

  if (!snapshot || !draft) return null;
  const isNew = !subject;

  const save = async () => {
    if (!draft.nameAr.trim()) {
      setError('اسم المادة مطلوب.');
      return;
    }
    setBusy(true);

    const record: Subject = {
      ...draft,
      id: draft.id || localId('sub'),
      code: draft.code.trim() || draft.nameAr.slice(0, 2).toUpperCase(),
      roomKind: draft.needsLab ? 'lab' : null,
    };

    const subjects = isNew
      ? [...snapshot.subjects, record]
      : snapshot.subjects.map((s) => (s.id === record.id ? record : s));

    // خطة المواد تُحدَّث معها: لا معنى لمادة بلا نصاب لأي صف.
    const curriculum: CurriculumEntry[] = snapshot.curriculum.filter((c) => c.subjectId !== record.id);
    for (const [gradeId, count] of Object.entries(weekly)) {
      if (count > 0) curriculum.push({ gradeId, subjectId: record.id, weeklyLessons: count });
    }

    await saveReference(
      { subjects, curriculum },
      isNew ? `إضافة مادة ${record.nameAr}` : `تعديل مادة ${record.nameAr}`,
    );
    setBusy(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? 'إضافة مادة' : `تعديل ${subject?.nameAr}`}
      subtitle="تغيير عدد الحصص الأسبوعية يجعل الجدول ناقصًا أو زائدًا حتى تُعدَّل الحصص فعليًا — سيظهر ذلك في فحص الصحة."
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
      <div className="space-y-4">
        {error && (
          <p className="rounded border border-warn/30 bg-warn-soft px-3 py-2 text-xs text-warn">{error}</p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="اسم المادة">
            <Input value={draft.nameAr} onChange={(e) => setDraft({ ...draft, nameAr: e.target.value })} />
          </Field>
          <Field label="الرمز">
            <Input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} dir="ltr" />
          </Field>
          <Field label="القسم">
            <Select
              value={draft.departmentId ?? ''}
              onChange={(e) => setDraft({ ...draft, departmentId: e.target.value || null })}
            >
              <option value="">بلا قسم</option>
              {snapshot.departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.nameAr}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="الحد الأقصى يوميًا للشعبة الواحدة">
            <Input
              type="number"
              min={1}
              max={4}
              value={draft.maxPerDay}
              onChange={(e) => setDraft({ ...draft, maxPerDay: Number(e.target.value) })}
            />
          </Field>
        </div>

        <Field label="اللون التعريفي">
          <div className="flex flex-wrap gap-1.5">
            {PALETTE.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setDraft({ ...draft, color })}
                className={cn(
                  'h-7 w-7 rounded-sm border-2 transition-transform',
                  draft.color === color ? 'scale-110 border-ink' : 'border-transparent',
                )}
                style={{ background: color }}
                aria-label={color}
              />
            ))}
          </div>
        </Field>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-ink">
            <input
              type="checkbox"
              checked={draft.isCore}
              onChange={(e) => setDraft({ ...draft, isCore: e.target.checked })}
              className="h-3.5 w-3.5 accent-[var(--brand-primary)]"
            />
            مادة أساسية — تُفضَّل في الحصص المبكرة
          </label>
          <label className="flex items-center gap-2 text-xs text-ink">
            <input
              type="checkbox"
              checked={draft.needsLab}
              onChange={(e) => setDraft({ ...draft, needsLab: e.target.checked })}
              className="h-3.5 w-3.5 accent-[var(--brand-primary)]"
            />
            تحتاج مختبرًا أو غرفة خاصة
          </label>
          <label className="flex items-center gap-2 text-xs text-ink">
            <input
              type="checkbox"
              checked={draft.allowsDouble}
              onChange={(e) => setDraft({ ...draft, allowsDouble: e.target.checked })}
              className="h-3.5 w-3.5 accent-[var(--brand-primary)]"
            />
            تسمح بحصتين متتاليتين
          </label>
        </div>

        <section>
          <p className="mb-2 text-xs font-semibold text-ink">عدد الحصص الأسبوعية لكل صف</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {snapshot.grades.map((grade) => (
              <Field key={grade.id} label={grade.nameAr}>
                <Input
                  type="number"
                  min={0}
                  max={12}
                  value={weekly[grade.id] ?? 0}
                  onChange={(e) => setWeekly({ ...weekly, [grade.id]: Number(e.target.value) })}
                />
              </Field>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  );
}
