'use client';

import * as React from 'react';
import type { ID, Lesson } from '@/lib/domain/types';
import type { SnapshotIndex } from '@/lib/engine/snapshot';
import { slotKey } from '@/lib/engine/snapshot';
import { buildGrid } from '@/lib/engine/grid';
import { LessonCard } from './lesson-card';
import { cn } from '@/lib/utils';
import { primary, secondary, useDisplayLang } from '@/lib/i18n';

export type MasterRowKind = 'section' | 'teacher';

/**
 * الجدول الرئيسي: كل الشعب (أو كل المعلمات) في شبكة واحدة.
 *
 * هذا العرض عريض بطبيعته — لا يُضغط في شاشة صغيرة، بل يُمرَّر أفقيًا
 * مع تثبيت عمود الأسماء ورأس الأيام حتى لا يضيع السياق.
 */
export function MasterGrid({
  index,
  rowKind,
  onSelect,
  conflictedLessonIds,
  filterSubjectId,
  highlightTeacherId,
}: {
  index: SnapshotIndex;
  rowKind: MasterRowKind;
  onSelect?: (lesson: Lesson) => void;
  conflictedLessonIds?: Set<ID>;
  filterSubjectId?: ID | null;
  highlightTeacherId?: ID | null;
}) {
  const { lang } = useDisplayLang();
  const grid = React.useMemo(() => buildGrid(index.snapshot.week), [index]);

  const rows = React.useMemo(() => {
    if (rowKind === 'teacher') {
      return index.snapshot.teachers
        .filter((t) => t.status !== 'transferred')
        .map((t) => {
          const subject = index.subjectById.get(t.primarySubjectId ?? '');
          return {
            id: t.id,
            label: primary(t.nameAr, t.nameEn, lang),
            sub: subject ? primary(subject.nameAr, subject.nameEn, lang) : '',
          };
        });
    }
    return [...index.snapshot.sections]
      .filter((s) => s.isActive)
      .sort((a, b) => a.label.localeCompare(b.label, 'ar', { numeric: true }))
      .map((s) => ({
        id: s.id,
        label: s.label,
        sub: (() => {
          const g = index.gradeById.get(s.gradeId);
          return g ? primary(g.nameAr, g.nameEn, lang) : '';
        })(),
      }));
  }, [index, rowKind, lang]);

  const lookup = React.useMemo(() => {
    const map = new Map<string, Lesson>();
    for (const lesson of index.snapshot.lessons) {
      const owner = rowKind === 'teacher' ? lesson.teacherId : lesson.sectionId;
      if (!owner) continue;
      map.set(`${owner}#${slotKey(lesson.dayId, lesson.periodIndex)}`, lesson);
    }
    return map;
  }, [index, rowKind, lang]);

  return (
    <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
      <table className="border-collapse text-right">
        <thead className="sticky top-0 z-20">
          <tr>
            <th
              className="table-head sticky right-0 z-30 min-w-[9rem] border-b border-l border-line bg-surface px-3 py-2 text-right"
              rowSpan={2}
            >
              {rowKind === 'teacher' ? 'المعلمة' : 'الشعبة'}
            </th>
            {grid.days.map((day) => {
              const span = day.periods.filter((p) => p.kind === 'lesson').length;
              return (
                <th
                  key={day.id}
                  colSpan={span}
                  className="border-b border-l border-line bg-surface px-2 py-1.5 text-center text-xs font-bold text-ink"
                >
                  {primary(day.nameAr, day.nameEn, lang)}
                  {secondary(day.nameAr, day.nameEn, lang) && (
                    <span className="mr-1 text-2xs font-normal text-ink-faint" dir="ltr">
                      {secondary(day.nameAr, day.nameEn, lang)}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
          <tr>
            {grid.columns.map((column, i) => {
              const isDayEnd =
                grid.columns[i + 1] && grid.columns[i + 1].day.id !== column.day.id;
              return (
                <th
                  key={`${column.day.id}-${column.index}`}
                  className={cn(
                    'tabular w-[5.25rem] min-w-[5.25rem] border-b border-line bg-surface px-1 py-1 text-center text-2xs font-medium text-ink-faint',
                    isDayEnd && 'border-l border-l-line-strong',
                  )}
                >
                  {column.ordinal}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="even:bg-surface-sunken/40">
              <th className="sticky right-0 z-10 border-b border-l border-line bg-surface px-3 py-1 text-right align-middle">
                <span className="block whitespace-nowrap text-xs font-semibold text-ink">
                  {row.label}
                </span>
                {row.sub && <span className="block text-2xs text-ink-faint">{row.sub}</span>}
              </th>

              {grid.columns.map((column, i) => {
                const lesson = lookup.get(`${row.id}#${slotKey(column.day.id, column.index)}`);
                const isDayEnd =
                  grid.columns[i + 1] && grid.columns[i + 1].day.id !== column.day.id;
                const dimmed =
                  (filterSubjectId && lesson?.subjectId !== filterSubjectId) ||
                  (highlightTeacherId && lesson?.teacherId !== highlightTeacherId);

                return (
                  <td
                    key={`${column.day.id}-${column.index}`}
                    className={cn(
                      'h-12 border-b border-line p-0.5 align-top',
                      isDayEnd && 'border-l border-l-line-strong',
                    )}
                  >
                    {lesson && (
                      <LessonCard
                        lesson={lesson}
                        index={index}
                        context={rowKind === 'teacher' ? 'teacher' : 'master'}
                        compact
                        dimmed={Boolean(dimmed)}
                        conflicted={conflictedLessonIds?.has(lesson.id)}
                        onClick={onSelect ? () => onSelect(lesson) : undefined}
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
