'use client';

import * as React from 'react';
import Link from 'next/link';
import type { Section } from '@/lib/domain/types';
import { useSchedule } from '@/lib/state/schedule-provider';
import { requiredLessons } from '@/lib/engine/snapshot';
import { Badge, Button, Card, CardHeader, Field, Input, Modal, Select } from '@/components/ui';
import { PageHeader } from '@/components/layout/page-header';
import { Icon } from '@/components/layout/icon';
import { localId } from '@/lib/engine/changeset';
import { cn } from '@/lib/utils';

export default function ClassesPage() {
  const { snapshot, index } = useSchedule();
  const [editing, setEditing] = React.useState<Section | null>(null);
  const [open, setOpen] = React.useState(false);

  if (!snapshot || !index) return null;

  const totalSlots = index.teachingSlots.length;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="الصفوف والشعب"
        description={`أسبوع الدراسة الحالي ${totalSlots} حصة لكل شعبة. تُضاف الشعب وتُعدَّل من هنا دون تعديل أي كود.`}
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
            إضافة شعبة
          </Button>
        }
      />

      <div className="space-y-4">
        {snapshot.grades
          .slice()
          .sort((a, b) => a.sort - b.sort)
          .map((grade) => {
            const sections = snapshot.sections.filter((s) => s.gradeId === grade.id);
            const plan = snapshot.curriculum.filter((c) => c.gradeId === grade.id);
            const planTotal = plan.reduce((a, c) => a + c.weeklyLessons, 0);

            return (
              <Card key={grade.id}>
                <CardHeader
                  title={grade.nameAr}
                  subtitle={`${sections.length} شعبة · خطة الصف ${planTotal} حصة أسبوعيًا من ${totalSlots} خانة متاحة`}
                  action={
                    planTotal !== totalSlots ? (
                      <Badge tone={planTotal > totalSlots ? 'danger' : 'warn'}>
                        {planTotal > totalSlots
                          ? `الخطة تتجاوز الخانات المتاحة بـ${planTotal - totalSlots}`
                          : `${totalSlots - planTotal} خانة بلا مادة مخطّطة`}
                      </Badge>
                    ) : (
                      <Badge tone="ok">الخطة مطابقة للخانات المتاحة</Badge>
                    )
                  }
                />

                <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  <div>
                    <p className="table-head mb-2">الشعب</p>
                    <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {sections.map((section) => {
                        const lessons = index.bySection.get(section.id) ?? [];
                        const missing = plan.reduce((acc, entry) => {
                          const required = requiredLessons(
                            snapshot.curriculum,
                            grade.id,
                            entry.subjectId,
                            section.id,
                          );
                          const actual = lessons.filter((l) => l.subjectId === entry.subjectId).length;
                          return acc + Math.max(0, required - actual);
                        }, 0);

                        return (
                          <li key={section.id}>
                            <div
                              className={cn(
                                'rounded border px-3 py-2.5',
                                section.isActive ? 'border-line' : 'border-dashed border-line opacity-60',
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <Link
                                  href={`/timetable?view=class&id=${section.id}`}
                                  className="text-sm font-bold text-ink hover:text-brand-ink hover:underline"
                                >
                                  {section.label}
                                </Link>
                                <button
                                  onClick={() => {
                                    setEditing(section);
                                    setOpen(true);
                                  }}
                                  className="text-ink-faint transition-colors hover:text-ink"
                                  aria-label="تعديل"
                                >
                                  <Icon name="Pencil" className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <p className="mt-1 text-2xs text-ink-muted">
                                {lessons.length} / {totalSlots} حصة
                                {section.studentCount ? ` · ${section.studentCount} طالبة` : ''}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-1">
                                {!section.isActive && <Badge tone="neutral">غير مفعّلة</Badge>}
                                {missing > 0 && <Badge tone="warn">{missing} حصة ناقصة</Badge>}
                                {missing === 0 && section.isActive && <Badge tone="ok">مكتملة</Badge>}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div>
                    <p className="table-head mb-2">خطة المواد لهذا الصف</p>
                    <ul className="space-y-1">
                      {plan.map((entry) => {
                        const subject = snapshot.subjects.find((s) => s.id === entry.subjectId);
                        return (
                          <li
                            key={entry.subjectId}
                            className="flex items-center justify-between gap-2 rounded border border-line px-2.5 py-1.5 text-xs"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                                style={{ background: subject?.color }}
                              />
                              <span className="truncate text-ink">{subject?.nameAr ?? entry.subjectId}</span>
                            </span>
                            <span className="tabular shrink-0 font-semibold text-ink-muted">
                              {entry.weeklyLessons}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    <Link href="/subjects" className="mt-2 block text-2xs text-brand-ink hover:underline">
                      تعديل خطة المواد ←
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
      </div>

      <SectionEditor open={open} section={editing} onClose={() => setOpen(false)} />
    </div>
  );
}

function SectionEditor({
  open,
  section,
  onClose,
}: {
  open: boolean;
  section: Section | null;
  onClose: () => void;
}) {
  const { snapshot, saveReference } = useSchedule();
  const [draft, setDraft] = React.useState<Section | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!snapshot) return;
    setError(null);
    setDraft(
      section ?? {
        id: '',
        gradeId: snapshot.grades[0]?.id ?? '',
        name: '',
        label: '',
        classTeacherId: null,
        isActive: true,
      },
    );
  }, [section, open, snapshot]);

  if (!snapshot || !draft) return null;
  const isNew = !section;
  const lessonCount = snapshot.lessons.filter((l) => l.sectionId === draft.id).length;

  const save = async () => {
    if (!draft.name.trim()) {
      setError('اسم الشعبة مطلوب (مثال: 1).');
      return;
    }
    const grade = snapshot.grades.find((g) => g.id === draft.gradeId);
    const label = `${grade?.level ?? ''}/${draft.name.trim()}`;

    const duplicate = snapshot.sections.some((s) => s.label === label && s.id !== draft.id);
    if (duplicate) {
      setError(`الشعبة ${label} موجودة بالفعل.`);
      return;
    }
    if (!draft.isActive && lessonCount > 0) {
      setError(
        `لا يمكن تعطيل الشعبة ${label} وفيها ${lessonCount} حصة على الجدول. احذف حصصها أولًا أو أعد توزيعها.`,
      );
      return;
    }

    setBusy(true);
    const record: Section = { ...draft, id: draft.id || localId('sec'), label };
    const sections = isNew
      ? [...snapshot.sections, record]
      : snapshot.sections.map((s) => (s.id === record.id ? record : s));
    await saveReference(
      { sections },
      isNew ? `إضافة الشعبة ${label}` : `تعديل بيانات الشعبة ${label}`,
    );
    setBusy(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? 'إضافة شعبة' : `تعديل الشعبة ${section?.label}`}
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
        <Field label="الصف">
          <Select value={draft.gradeId} onChange={(e) => setDraft({ ...draft, gradeId: e.target.value })}>
            {snapshot.grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.nameAr}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="رقم الشعبة" hint="يُدمج مع رقم الصف تلقائيًا: 6/2 مثلًا.">
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <Field label="عدد الطالبات (اختياري)">
          <Input
            type="number"
            min={0}
            value={draft.studentCount ?? ''}
            onChange={(e) =>
              setDraft({ ...draft, studentCount: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        </Field>
        <label className="flex items-center gap-2 text-xs text-ink">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
            className="h-3.5 w-3.5 accent-[var(--brand-primary)]"
          />
          شعبة مفعّلة (تدخل في الجدول والفحص)
        </label>
        {lessonCount > 0 && (
          <p className="text-2xs text-ink-faint">على هذه الشعبة {lessonCount} حصة حاليًا.</p>
        )}
      </div>
    </Modal>
  );
}
