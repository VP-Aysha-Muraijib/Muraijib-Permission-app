'use client';

import * as React from 'react';
import type { ID, Lesson, Slot } from '@/lib/domain/types';
import type { SnapshotIndex } from '@/lib/engine/snapshot';
import { buildGrid, periodOf } from '@/lib/engine/grid';
import { slotKey } from '@/lib/engine/snapshot';
import { cn } from '@/lib/utils';
import { primary, secondary, useDisplayLang } from '@/lib/i18n';
import { Icon } from '@/components/layout/icon';
import { LessonCard, type CellContext } from './lesson-card';

export interface DropIntent {
  lesson: Lesson;
  target: Slot;
  /** الحصة الموجودة في الوجهة — إن وُجدت فالعملية تبديل لا نقل. */
  occupant: Lesson | null;
}

/**
 * شبكة الجدول لكيان واحد: معلمة أو شعبة.
 * الصفوف فترات، والأعمدة أيام — وهو الشكل الذي اعتادته المدارس على الورق.
 */
export function TimetableGrid({
  index,
  lessons,
  context,
  conflictedLessonIds,
  onDrop,
  onSelect,
  selectedId,
  readOnly = false,
  emptyHintAr = 'حصة شاغرة',
}: {
  index: SnapshotIndex;
  lessons: Lesson[];
  context: CellContext;
  conflictedLessonIds?: Set<ID>;
  onDrop?: (intent: DropIntent) => void;
  onSelect?: (lesson: Lesson) => void;
  selectedId?: ID | null;
  readOnly?: boolean;
  emptyHintAr?: string;
}) {
  const { lang } = useDisplayLang();
  const grid = React.useMemo(() => buildGrid(index.snapshot.week), [index]);
  const [dragging, setDragging] = React.useState<Lesson | null>(null);
  const [hover, setHover] = React.useState<string | null>(null);

  const bySlot = React.useMemo(() => {
    const map = new Map<string, Lesson>();
    for (const lesson of lessons) map.set(slotKey(lesson.dayId, lesson.periodIndex), lesson);
    return map;
  }, [lessons]);

  const handleDrop = (dayId: ID, periodIndex: number) => {
    if (!dragging || !onDrop) return;
    const key = slotKey(dayId, periodIndex);
    const occupant = bySlot.get(key) ?? null;
    setDragging(null);
    setHover(null);
    if (occupant?.id === dragging.id) return;
    onDrop({ lesson: dragging, target: { dayId, periodIndex }, occupant });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr>
            <th className="table-head sticky right-0 z-10 w-24 bg-surface px-2 py-2 text-right">
              الفترة
            </th>
            {grid.days.map((day) => (
              <th
                key={day.id}
                className="border-b border-line px-2 py-2 text-center text-xs font-bold text-ink"
              >
                <span className="block">{primary(day.nameAr, day.nameEn, lang)}</span>
                {secondary(day.nameAr, day.nameEn, lang) && (
                  <span className="block text-2xs font-normal text-ink-faint" dir="ltr">
                    {secondary(day.nameAr, day.nameEn, lang)}
                  </span>
                )}
                {grid.daysWithOwnTimes.has(day.id) && (
                  <span
                    className="mt-0.5 block rounded-sm bg-warn-soft px-1 py-px text-2xs font-medium text-warn"
                    title="أوقات هذا اليوم تختلف عن العمود الأيمن ولم تُزوَّد بعد"
                  >
                    توقيت مختلف
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map((row) => {
            if (row.kind !== 'lesson') {
              return (
                <tr key={row.index}>
                  <td
                    colSpan={grid.days.length + 1}
                    className="border-y border-line bg-surface-sunken px-3 py-1 text-center text-2xs font-medium tracking-wide text-ink-faint"
                  >
                    {row.labelAr}
                  </td>
                </tr>
              );
            }

            return (
              <tr key={row.index} className="group/row">
                <th className="sticky right-0 z-10 border-b border-line bg-surface px-2 py-1 text-right align-middle">
                  <span className="block text-2xs font-semibold text-ink">{row.labelAr}</span>
                  <span className="tabular block text-2xs text-ink-faint">{row.timeRange}</span>
                </th>

                {grid.days.map((day) => {
                  const period = periodOf(day, row.index);
                  const key = slotKey(day.id, row.index);
                  const lesson = bySlot.get(key);
                  const isTeaching = period?.kind === 'lesson';

                  if (!isTeaching) {
                    return (
                      <td
                        key={day.id}
                        className="h-14 border-b border-line bg-[repeating-linear-gradient(135deg,transparent,transparent_5px,var(--surface-sunken)_5px,var(--surface-sunken)_10px)]"
                        aria-label={period ? period.labelAr : 'لا توجد حصة'}
                      />
                    );
                  }

                  const isHover = hover === key;
                  const canDropHere = dragging && dragging.id !== lesson?.id;

                  return (
                    <td
                      key={day.id}
                      className={cn(
                        'h-14 border-b border-line p-0.5 align-top transition-colors',
                        isHover && canDropHere && 'bg-brand-tint',
                      )}
                      onDragOver={(e) => {
                        if (!canDropHere) return;
                        e.preventDefault();
                        setHover(key);
                      }}
                      onDragLeave={() => setHover((h) => (h === key ? null : h))}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDrop(day.id, row.index);
                      }}
                    >
                      {lesson ? (
                        <LessonCard
                          lesson={lesson}
                          index={index}
                          context={context}
                          conflicted={conflictedLessonIds?.has(lesson.id)}
                          selected={selectedId === lesson.id}
                          dimmed={Boolean(dragging) && dragging?.id !== lesson.id && !isHover}
                          draggable={!readOnly}
                          onDragStart={(e) => {
                            setDragging(lesson);
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', lesson.id);
                          }}
                          onClick={onSelect ? () => onSelect(lesson) : undefined}
                        />
                      ) : (
                        <div
                          className={cn(
                            'flex h-full w-full items-center justify-center rounded-sm border border-dashed text-2xs transition-colors',
                            isHover && canDropHere
                              ? 'border-brand bg-brand-tint text-brand-ink'
                              : 'border-line text-ink-faint/70',
                          )}
                        >
                          {isHover && canDropHere ? (
                            <span className="flex items-center gap-1 font-medium">
                              <Icon name="CornerDownLeft" className="h-3 w-3" />
                              إفلات هنا
                            </span>
                          ) : (
                            emptyHintAr
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
