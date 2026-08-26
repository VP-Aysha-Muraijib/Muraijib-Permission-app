'use client';

import type { ID } from '@/lib/domain/types';
import type { SnapshotIndex } from '@/lib/engine/snapshot';
import { buildGrid } from '@/lib/engine/grid';
import { slotKey } from '@/lib/engine/snapshot';
import { computeTeacherWorkload, computeAllWorkloads } from '@/lib/engine/workload';
import type { HealthReport } from '@/lib/engine/conflicts';
import { PrintFooter, PrintHeader } from './print-header';
import { PrintGrid } from './print-grid';
import { LOAD_LABEL } from '@/components/workload-cell';

export interface SheetChrome {
  yearLabel: string;
  versionLabel: string;
  issuedAt: string;
  hideFooter: boolean;
}

const page = 'print-page print-block';

/* ────────── جدول معلمة ────────── */

export function TeacherSheet({
  index,
  teacherId,
  chrome,
}: {
  index: SnapshotIndex;
  teacherId: ID;
  chrome: SheetChrome;
}) {
  const teacher = index.teacherById.get(teacherId);
  if (!teacher) return null;

  const lessons = index.byTeacher.get(teacherId) ?? [];
  const load = computeTeacherWorkload(index, teacherId);
  const subjects = [...new Set(lessons.map((l) => l.subjectId))]
    .map((id) => index.subjectById.get(id)?.nameAr)
    .filter(Boolean)
    .join('، ');

  return (
    <section className={page}>
      <PrintHeader
        titleAr="جدول المعلمة"
        subtitleAr={teacher.nameAr}
        yearLabel={chrome.yearLabel}
        metaAr={[
          { label: 'المادة', value: subjects || '—' },
          { label: 'النصاب', value: `${load.assigned} / ${load.required}` },
          { label: 'عدد الشعب', value: String(new Set(lessons.map((l) => l.sectionId)).size) },
        ]}
      />
      <PrintGrid index={index} lessons={lessons} context="teacher" />
      <PrintFooter
        versionLabel={chrome.versionLabel}
        issuedAt={chrome.issuedAt}
        hidden={chrome.hideFooter}
      />
    </section>
  );
}

/* ────────── جدول شعبة ────────── */

export function ClassSheet({
  index,
  sectionId,
  chrome,
}: {
  index: SnapshotIndex;
  sectionId: ID;
  chrome: SheetChrome;
}) {
  const section = index.sectionById.get(sectionId);
  if (!section) return null;

  const grade = index.gradeById.get(section.gradeId);
  const lessons = index.bySection.get(sectionId) ?? [];
  const classTeacher = section.classTeacherId
    ? index.teacherById.get(section.classTeacherId)?.nameAr
    : null;

  return (
    <section className={page}>
      <PrintHeader
        titleAr="جدول الصف"
        subtitleAr={`${grade?.nameAr ?? ''} — الشعبة ${section.label}`}
        yearLabel={chrome.yearLabel}
        metaAr={[
          { label: 'عدد الحصص', value: String(lessons.length) },
          ...(section.studentCount ? [{ label: 'عدد الطالبات', value: String(section.studentCount) }] : []),
          ...(classTeacher ? [{ label: 'رائدة الفصل', value: classTeacher }] : []),
        ]}
      />
      <PrintGrid index={index} lessons={lessons} context="class" />
      <PrintFooter
        versionLabel={chrome.versionLabel}
        issuedAt={chrome.issuedAt}
        hidden={chrome.hideFooter}
      />
    </section>
  );
}

/* ────────── الجدول الرئيسي ────────── */

export function MasterSheet({ index, chrome }: { index: SnapshotIndex; chrome: SheetChrome }) {
  const grid = buildGrid(index.snapshot.week);
  const sections = [...index.snapshot.sections]
    .filter((s) => s.isActive)
    .sort((a, b) => a.label.localeCompare(b.label, 'ar', { numeric: true }));

  const lookup = new Map(
    index.snapshot.lessons.map((l) => [`${l.sectionId}#${slotKey(l.dayId, l.periodIndex)}`, l]),
  );

  return (
    <section className={page}>
      <PrintHeader
        titleAr="الجدول المدرسي العام"
        subtitleAr="جميع الشعب"
        yearLabel={chrome.yearLabel}
        metaAr={[
          { label: 'عدد الشعب', value: String(sections.length) },
          { label: 'عدد الحصص', value: String(index.snapshot.lessons.length) },
        ]}
      />

      <table className="w-full border-collapse text-center">
        <thead>
          <tr>
            <th rowSpan={2} className="border border-black/70 bg-black/[.06] px-1 py-1 text-[8pt] font-bold">
              الشعبة
            </th>
            {grid.days.map((day) => (
              <th
                key={day.id}
                colSpan={day.periods.filter((p) => p.kind === 'lesson').length}
                className="border border-black/70 bg-black/[.06] px-1 py-0.5 text-[8pt] font-bold"
              >
                {day.nameAr}
              </th>
            ))}
          </tr>
          <tr>
            {grid.columns.map((column) => (
              <th
                key={`${column.day.id}-${column.index}`}
                className="border border-black/70 bg-black/[.03] px-0.5 py-0.5 text-[7pt] font-semibold"
              >
                {column.ordinal}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => (
            <tr key={section.id}>
              <th className="border border-black/70 bg-black/[.03] px-1 py-1 text-[8pt] font-bold">
                {section.label}
              </th>
              {grid.columns.map((column) => {
                const lesson = lookup.get(`${section.id}#${slotKey(column.day.id, column.index)}`);
                const subject = lesson ? index.subjectById.get(lesson.subjectId) : null;
                const teacher = lesson?.teacherId ? index.teacherById.get(lesson.teacherId) : null;
                return (
                  <td
                    key={`${column.day.id}-${column.index}`}
                    className="border border-black/70 px-0.5 py-0.5 align-middle"
                  >
                    {lesson ? (
                      <>
                        <span className="block text-[6.5pt] font-bold leading-tight">
                          {subject?.code ?? subject?.nameAr}
                        </span>
                        <span className="block text-[6pt] leading-tight text-black/65">
                          {teacher?.nameAr ?? '—'}
                        </span>
                      </>
                    ) : (
                      <span className="text-[6pt] text-black/30">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-2 text-[7pt] text-black/60">
        رموز المواد:{' '}
        {index.snapshot.subjects.map((s) => `${s.code} = ${s.nameAr}`).join(' · ')}
      </p>

      <PrintFooter
        versionLabel={chrome.versionLabel}
        issuedAt={chrome.issuedAt}
        hidden={chrome.hideFooter}
      />
    </section>
  );
}

/* ────────── تقرير الأنصبة ────────── */

export function WorkloadSheet({ index, chrome }: { index: SnapshotIndex; chrome: SheetChrome }) {
  const loads = computeAllWorkloads(index).sort((a, b) => a.remaining - b.remaining);

  return (
    <section className={page}>
      <PrintHeader
        titleAr="تقرير أنصبة المعلمات"
        yearLabel={chrome.yearLabel}
        metaAr={[
          { label: 'عدد المعلمات', value: String(loads.length) },
          { label: 'إجمالي الحصص', value: String(index.snapshot.lessons.length) },
        ]}
      />

      <table className="w-full border-collapse">
        <thead>
          <tr>
            {['م', 'المعلمة', 'المادة', 'المطلوب', 'المسند', 'المتبقي', 'الفراغات', 'الحالة'].map((h) => (
              <th key={h} className="border border-black/70 bg-black/[.06] px-1.5 py-1 text-[8.5pt] font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loads.map((load, i) => {
            const teacher = index.teacherById.get(load.teacherId);
            const subject = teacher?.primarySubjectId
              ? index.subjectById.get(teacher.primarySubjectId)?.nameAr
              : '—';
            return (
              <tr key={load.teacherId}>
                <td className="border border-black/70 px-1.5 py-1 text-center text-[8pt]">{i + 1}</td>
                <td className="border border-black/70 px-1.5 py-1 text-[8.5pt] font-semibold">
                  {teacher?.nameAr ?? '—'}
                </td>
                <td className="border border-black/70 px-1.5 py-1 text-[8pt]">{subject}</td>
                <td className="border border-black/70 px-1.5 py-1 text-center text-[8pt]">{load.required}</td>
                <td className="border border-black/70 px-1.5 py-1 text-center text-[8pt]">{load.assigned}</td>
                <td className="border border-black/70 px-1.5 py-1 text-center text-[8pt] font-semibold">
                  {load.remaining}
                </td>
                <td className="border border-black/70 px-1.5 py-1 text-center text-[8pt]">{load.gaps}</td>
                <td className="border border-black/70 px-1.5 py-1 text-center text-[8pt]">
                  {LOAD_LABEL[load.status]}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <PrintFooter
        versionLabel={chrome.versionLabel}
        issuedAt={chrome.issuedAt}
        hidden={chrome.hideFooter}
      />
    </section>
  );
}

/* ────────── تقرير التعارضات ────────── */

export function ConflictsSheet({
  index,
  health,
  chrome,
}: {
  index: SnapshotIndex;
  health: HealthReport;
  chrome: SheetChrome;
}) {
  const SEVERITY: Record<string, string> = {
    critical: 'حرج',
    high: 'مرتفع',
    medium: 'متوسط',
    low: 'منخفض',
  };

  return (
    <section className={page}>
      <PrintHeader
        titleAr="تقرير فحص الجدول"
        yearLabel={chrome.yearLabel}
        metaAr={[
          { label: 'درجة الجودة', value: health.valid ? `${health.score}%` : 'غير صالح' },
          { label: 'عدد الملاحظات', value: String(health.violations.length) },
        ]}
      />

      {health.violations.length === 0 ? (
        <p className="border border-black/70 px-3 py-6 text-center text-[10pt]">
          لا توجد ملاحظات — اجتاز الجدول جميع الفحوص.
        </p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['م', 'النوع', 'الخطورة', 'الوصف'].map((h) => (
                <th key={h} className="border border-black/70 bg-black/[.06] px-1.5 py-1 text-[8.5pt] font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {health.groups.flatMap((group) =>
              group.violations.map((violation, i) => (
                <tr key={`${group.constraintId}-${i}`}>
                  <td className="border border-black/70 px-1.5 py-1 text-center text-[8pt]">{i + 1}</td>
                  <td className="border border-black/70 px-1.5 py-1 text-[8pt]">{group.labelAr}</td>
                  <td className="border border-black/70 px-1.5 py-1 text-center text-[8pt]">
                    {SEVERITY[violation.severity]}
                  </td>
                  <td className="border border-black/70 px-1.5 py-1 text-[8pt] leading-relaxed">
                    {violation.messageAr}
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      )}

      <PrintFooter
        versionLabel={chrome.versionLabel}
        issuedAt={chrome.issuedAt}
        hidden={chrome.hideFooter}
      />
    </section>
  );
}
