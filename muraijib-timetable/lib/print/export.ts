'use client';

/**
 * تصدير البيانات.
 *
 * الملفات المصدَّرة تُفتح في أدوات أخرى (Excel غالبًا)، ولذلك تُكتب البيانات
 * في صورة جدولية مسطّحة لا شبكية — الشبكة للطباعة، والصفوف للتحليل.
 */

import type { SnapshotIndex } from '@/lib/engine/snapshot';
import type { HealthReport } from '@/lib/engine/conflicts';
import { computeAllWorkloads } from '@/lib/engine/workload';
import { LOAD_LABEL } from '@/components/workload-cell';

type Rows = Array<Array<string | number>>;

function lessonRows(index: SnapshotIndex): Rows {
  const rows: Rows = [['اليوم', 'الحصة', 'الوقت', 'الصف', 'الشعبة', 'المادة', 'المعلمة', 'الغرفة', 'مقفلة']];
  const ordered = [...index.snapshot.lessons].sort((a, b) => {
    const dayA = index.dayById.get(a.dayId)?.sort ?? 0;
    const dayB = index.dayById.get(b.dayId)?.sort ?? 0;
    return (
      dayA - dayB ||
      a.periodIndex - b.periodIndex ||
      (index.sectionById.get(a.sectionId)?.label ?? '').localeCompare(
        index.sectionById.get(b.sectionId)?.label ?? '',
        'ar',
        { numeric: true },
      )
    );
  });

  for (const lesson of ordered) {
    const day = index.dayById.get(lesson.dayId);
    const period = day?.periods.find((p) => p.index === lesson.periodIndex);
    const section = index.sectionById.get(lesson.sectionId);
    rows.push([
      day?.nameAr ?? '',
      period?.labelAr ?? String(lesson.periodIndex),
      period ? `${period.startTime}-${period.endTime}` : '',
      index.gradeById.get(section?.gradeId ?? '')?.nameAr ?? '',
      section?.label ?? '',
      index.subjectById.get(lesson.subjectId)?.nameAr ?? '',
      lesson.teacherId ? (index.teacherById.get(lesson.teacherId)?.nameAr ?? '') : 'بلا معلمة',
      lesson.roomId ? (index.roomById.get(lesson.roomId)?.nameAr ?? '') : '',
      index.lockedLessonIds.has(lesson.id) ? 'نعم' : 'لا',
    ]);
  }
  return rows;
}

function workloadRows(index: SnapshotIndex): Rows {
  const rows: Rows = [['المعلمة', 'المادة', 'النصاب المطلوب', 'المسند', 'المتبقي', 'الحد الأعلى', 'الفراغات', 'أطول تتابع', 'الحالة']];
  for (const load of computeAllWorkloads(index)) {
    const teacher = index.teacherById.get(load.teacherId);
    rows.push([
      teacher?.nameAr ?? '',
      teacher?.primarySubjectId ? (index.subjectById.get(teacher.primarySubjectId)?.nameAr ?? '') : '',
      load.required,
      load.assigned,
      load.remaining,
      load.maxLoad,
      load.gaps,
      load.longestRun,
      LOAD_LABEL[load.status],
    ]);
  }
  return rows;
}

function conflictRows(health: HealthReport): Rows {
  const severity: Record<string, string> = {
    critical: 'حرج',
    high: 'مرتفع',
    medium: 'متوسط',
    low: 'منخفض',
  };
  const rows: Rows = [['النوع', 'الخطورة', 'الوصف']];
  for (const group of health.groups) {
    for (const violation of group.violations) {
      rows.push([group.labelAr, severity[violation.severity], violation.messageAr]);
    }
  }
  return rows;
}

function rowsFor(kind: string, index: SnapshotIndex, health: HealthReport): { name: string; rows: Rows } {
  if (kind === 'workload') return { name: 'الأنصبة', rows: workloadRows(index) };
  if (kind === 'conflicts') return { name: 'التعارضات', rows: conflictRows(health) };
  return { name: 'الجدول', rows: lessonRows(index) };
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function exportSheetsToCsv(kind: string, index: SnapshotIndex, health: HealthReport) {
  const { name, rows } = rowsFor(kind, index, health);
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const text = String(cell ?? '');
          return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(','),
    )
    .join('\r\n');

  // BOM ضروري ليقرأ Excel العربية بترميز صحيح.
  download(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `${name}.csv`);
}

export async function exportSheetsToExcel(kind: string, index: SnapshotIndex, health: HealthReport) {
  const { name, rows } = rowsFor(kind, index, health);
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const book = XLSX.utils.book_new();
  book.Workbook = { Views: [{ RTL: true }] };
  XLSX.utils.book_append_sheet(book, sheet, name.slice(0, 30));
  const buffer = XLSX.write(book, { bookType: 'xlsx', type: 'array' });
  download(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${name}.xlsx`,
  );
}
