'use client';

import type { ID } from '@/lib/domain/types';
import type { SnapshotIndex } from '@/lib/engine/snapshot';
import { buildGrid } from '@/lib/engine/grid';
import { slotKey } from '@/lib/engine/snapshot';
import { computeTeacherWorkload, computeAllWorkloads } from '@/lib/engine/workload';
import type { HealthReport } from '@/lib/engine/conflicts';
import {
  TeacherTimetablePrintPage,
  TimetableGrid,
  type InfoItem,
} from './teacher-timetable';
import { LOAD_LABEL } from '@/components/workload-cell';
import type { DisplayLang } from '@/lib/i18n';

/**
 * أوراق المنظومة.
 *
 * لا تصميم هنا: كل ورقة استدعاء للنظام البصري الموحّد في `teacher-timetable`
 * مع بياناتها وحدها. أي مقاس أو لون أو مسافة تُكتب في هذا الملف تكون بذلك
 * فرقًا بصريًا بين ورقة وأخرى — وهو ما يجب ألّا يوجد.
 */

export interface SheetChrome {
  yearLabel: string;
  versionLabel: string;
  issuedAt: string;
  hideFooter: boolean;
  lang: DisplayLang;
}

/* حدود وخلفيات جداول التقارير — تُعرَّف مرة لتبقى هي نفسها في كل تقرير. */
const cell = 'border-[0.6px] border-[color:var(--doc-line)]';
const headCell = `${cell} bg-[color:var(--doc-head)] px-2 py-1.5 text-[12px] font-semibold`;
const bodyCell = `${cell} px-2 py-1 text-[11.5px]`;

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
  const subjectIds = [...new Set(lessons.map((l) => l.subjectId))];
  const subjects = subjectIds
    .map((id) => index.subjectById.get(id)?.nameAr)
    .filter(Boolean)
    .join('، ');

  return (
    <TeacherTimetablePrintPage
      titleAr="جدول المعلمة"
      titleEn="Teacher Timetable"
      chrome={chrome}
      nameAr={teacher.nameAr}
      nameEn={teacher.nameEn}
      info={[
        { label: 'المادة', labelEn: 'Subject', value: subjects || 'ــ' },
        { label: 'النصاب', labelEn: 'Load', value: `${load.assigned} / ${load.required}`, latin: true },
        {
          label: 'عدد الشعب',
          labelEn: 'Sections',
          value: String(new Set(lessons.map((l) => l.sectionId)).size),
          latin: true,
        },
      ]}
    >
      {/* مادة واحدة مذكورة في شريط البيانات لا تُكرَّر في ثمانٍ وثلاثين خلية. */}
      <TimetableGrid
        index={index}
        lessons={lessons}
        context="teacher"
        showSubjectInCells={subjectIds.length > 1}
      />
    </TeacherTimetablePrintPage>
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

  const info: InfoItem[] = [
    { label: 'عدد الحصص', labelEn: 'Lessons', value: String(lessons.length), latin: true },
  ];
  if (section.studentCount) {
    info.push({
      label: 'عدد الطالبات',
      labelEn: 'Students',
      value: String(section.studentCount),
      latin: true,
    });
  }
  if (classTeacher) {
    info.push({ label: 'رائدة الفصل', labelEn: 'Class Teacher', value: classTeacher });
  }

  return (
    <TeacherTimetablePrintPage
      titleAr="جدول الصف"
      titleEn="Class Timetable"
      chrome={chrome}
      nameAr={`${grade?.nameAr ?? ''} — الشعبة ${section.label}`.trim()}
      nameEn={grade?.nameEn ? `${grade.nameEn} — Section ${section.label}` : undefined}
      info={info}
    >
      <TimetableGrid index={index} lessons={lessons} context="class" />
    </TeacherTimetablePrintPage>
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
    <TeacherTimetablePrintPage
      titleAr="الجدول المدرسي العام"
      titleEn="Master Timetable"
      chrome={chrome}
      nameAr="جميع الشعب"
      nameEn="All Classes"
      info={[
        { label: 'عدد الشعب', labelEn: 'Sections', value: String(sections.length), latin: true },
        {
          label: 'عدد الحصص',
          labelEn: 'Lessons',
          value: String(index.snapshot.lessons.length),
          latin: true,
        },
      ]}
    >
      <table className="w-full table-fixed border-collapse text-center">
        <thead>
          <tr>
            <th
              rowSpan={2}
              className={`${cell} w-[6%] bg-[color:var(--doc-day)] px-1 py-1 text-[11px] font-semibold`}
            >
              الشعبة
            </th>
            {grid.days.map((day) => (
              <th
                key={day.id}
                colSpan={day.periods.filter((p) => p.kind === 'lesson').length}
                className={`${cell} bg-[color:var(--doc-day)] px-1 py-1 text-[11px] font-semibold`}
              >
                {day.nameAr}
              </th>
            ))}
          </tr>
          <tr>
            {grid.columns.map((column) => (
              <th
                key={`${column.day.id}-${column.index}`}
                className={`${cell} latin bg-[color:var(--doc-head)] px-0.5 py-0.5 text-[9px] font-semibold tabular-nums`}
              >
                {column.ordinal}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => (
            <tr key={section.id}>
              <th
                className={`${cell} latin bg-[color:var(--doc-head)] px-1 py-1 text-[10px] font-semibold`}
              >
                {section.label}
              </th>
              {grid.columns.map((column) => {
                const lesson = lookup.get(`${section.id}#${slotKey(column.day.id, column.index)}`);
                const subject = lesson ? index.subjectById.get(lesson.subjectId) : null;
                const teacher = lesson?.teacherId ? index.teacherById.get(lesson.teacherId) : null;
                return (
                  <td
                    key={`${column.day.id}-${column.index}`}
                    className={`${cell} px-0.5 py-0.5 align-middle leading-tight`}
                  >
                    {lesson ? (
                      <>
                        <span className="block text-[9px] font-semibold">
                          {subject?.code ?? subject?.nameAr}
                        </span>
                        <span className="block text-[8px] text-[color:var(--doc-muted)]">
                          {teacher?.nameAr ?? 'ــ'}
                        </span>
                      </>
                    ) : (
                      <span className="text-[9px] text-[color:var(--doc-muted)]">ــ</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-2 text-[9px] text-[color:var(--doc-muted)]">
        رموز المواد: {index.snapshot.subjects.map((s) => `${s.code} = ${s.nameAr}`).join(' · ')}
      </p>
    </TeacherTimetablePrintPage>
  );
}

/* ────────── تقرير الأنصبة ────────── */

export function WorkloadSheet({ index, chrome }: { index: SnapshotIndex; chrome: SheetChrome }) {
  const loads = computeAllWorkloads(index).sort((a, b) => a.remaining - b.remaining);

  return (
    <TeacherTimetablePrintPage
      titleAr="تقرير أنصبة المعلمات"
      titleEn="Teaching Load Report"
      chrome={chrome}
      nameAr="جميع المعلمات"
      nameEn="All Teachers"
      fill={false}
      info={[
        { label: 'عدد المعلمات', labelEn: 'Teachers', value: String(loads.length), latin: true },
        {
          label: 'إجمالي الحصص',
          labelEn: 'Total lessons',
          value: String(index.snapshot.lessons.length),
          latin: true,
        },
      ]}
    >
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {['م', 'المعلمة', 'المادة', 'المطلوب', 'المسند', 'المتبقي', 'الفراغات', 'الحالة'].map(
              (h) => (
                <th key={h} className={headCell}>
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {loads.map((load, i) => {
            const teacher = index.teacherById.get(load.teacherId);
            const subject = teacher?.primarySubjectId
              ? index.subjectById.get(teacher.primarySubjectId)?.nameAr
              : 'ــ';
            return (
              <tr key={load.teacherId}>
                <td className={`${bodyCell} latin text-center tabular-nums`}>{i + 1}</td>
                <td className={`${bodyCell} font-semibold`}>{teacher?.nameAr ?? 'ــ'}</td>
                <td className={bodyCell}>{subject}</td>
                <td className={`${bodyCell} latin text-center tabular-nums`}>{load.required}</td>
                <td className={`${bodyCell} latin text-center tabular-nums`}>{load.assigned}</td>
                <td className={`${bodyCell} latin text-center font-semibold tabular-nums`}>
                  {load.remaining}
                </td>
                <td className={`${bodyCell} latin text-center tabular-nums`}>{load.gaps}</td>
                <td className={`${bodyCell} text-center`}>{LOAD_LABEL[load.status]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TeacherTimetablePrintPage>
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
  void index;
  const SEVERITY: Record<string, string> = {
    critical: 'حرج',
    high: 'مرتفع',
    medium: 'متوسط',
    low: 'منخفض',
  };

  return (
    <TeacherTimetablePrintPage
      titleAr="تقرير فحص الجدول"
      titleEn="Timetable Health Report"
      chrome={chrome}
      nameAr="الجدول المدرسي"
      nameEn="School Timetable"
      fill={false}
      info={[
        {
          label: 'درجة الجودة',
          labelEn: 'Quality',
          value: health.valid ? `${health.score}%` : 'غير صالح',
          latin: health.valid,
        },
        {
          label: 'عدد الملاحظات',
          labelEn: 'Findings',
          value: String(health.violations.length),
          latin: true,
        },
      ]}
    >
      {health.violations.length === 0 ? (
        <p className={`${cell} px-3 py-6 text-center text-[13px]`}>
          لا توجد ملاحظات — اجتاز الجدول جميع الفحوص.
        </p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['م', 'النوع', 'الخطورة', 'الوصف'].map((h) => (
                <th key={h} className={headCell}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {health.groups.flatMap((group) =>
              group.violations.map((violation, i) => (
                <tr key={`${group.constraintId}-${i}`}>
                  <td className={`${bodyCell} latin text-center tabular-nums`}>{i + 1}</td>
                  <td className={bodyCell}>{group.labelAr}</td>
                  <td className={`${bodyCell} text-center`}>{SEVERITY[violation.severity]}</td>
                  <td className={`${bodyCell} leading-relaxed`}>{violation.messageAr}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      )}
    </TeacherTimetablePrintPage>
  );
}
