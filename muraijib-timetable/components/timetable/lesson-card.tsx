'use client';

import * as React from 'react';
import type { Lesson } from '@/lib/domain/types';
import type { SnapshotIndex } from '@/lib/engine/snapshot';
import { cn, tintOf } from '@/lib/utils';
import { Icon } from '@/components/layout/icon';

export type CellContext = 'class' | 'teacher' | 'master' | 'subject';

/**
 * بطاقة الحصة داخل الشبكة.
 *
 * ما يُعرض يتغيّر بحسب السياق: في جدول الشعبة يهمّ اسم المعلمة،
 * وفي جدول المعلمة تهمّ الشعبة. عرض كل شيء دائمًا يجعل الخلية غير مقروءة.
 */
export function LessonCard({
  lesson,
  index,
  context,
  compact = false,
  conflicted = false,
  dimmed = false,
  selected = false,
  draggable = false,
  onDragStart,
  onClick,
}: {
  lesson: Lesson;
  index: SnapshotIndex;
  context: CellContext;
  compact?: boolean;
  conflicted?: boolean;
  dimmed?: boolean;
  selected?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onClick?: () => void;
}) {
  const subject = index.subjectById.get(lesson.subjectId);
  const teacher = lesson.teacherId ? index.teacherById.get(lesson.teacherId) : null;
  const section = index.sectionById.get(lesson.sectionId);
  const room = lesson.roomId ? index.roomById.get(lesson.roomId) : null;
  const locked = index.lockedLessonIds.has(lesson.id);
  const color = subject?.color ?? 'var(--subject-fallback)';

  const primary = context === 'teacher' ? section?.label ?? '—' : subject?.nameAr ?? '—';
  const secondary =
    context === 'teacher'
      ? subject?.nameAr ?? ''
      : context === 'master'
        ? teacher?.nameAr ?? 'بلا معلمة'
        : teacher?.nameAr ?? 'بلا معلمة';

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      draggable={draggable && !locked}
      onDragStart={onDragStart}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      title={`${subject?.nameAr ?? ''} · ${section?.label ?? ''} · ${teacher?.nameAr ?? 'بلا معلمة'}${room ? ` · ${room.nameAr}` : ''}`}
      className={cn(
        'group relative h-full w-full overflow-hidden rounded-sm border text-right transition-all',
        compact ? 'px-1 py-[3px]' : 'px-2 py-1.5',
        draggable && !locked && 'cursor-grab active:cursor-grabbing',
        onClick && 'hover:shadow-raised',
        dimmed && 'opacity-25',
        conflicted ? 'border-danger ring-1 ring-danger' : 'border-transparent',
        selected && 'ring-2 ring-brand',
      )}
      style={{
        background: tintOf(color, conflicted ? 0.2 : 0.14),
        borderRightColor: color,
        borderRightWidth: 3,
        borderRightStyle: 'solid',
      }}
    >
      <div className="flex items-start gap-1">
        <p
          className={cn(
            'min-w-0 flex-1 truncate font-semibold leading-tight text-ink',
            compact ? 'text-2xs' : 'text-xs',
          )}
        >
          {primary}
        </p>
        {locked && <Icon name="Lock" className="mt-0.5 h-2.5 w-2.5 shrink-0 text-ink-faint" />}
      </div>

      <p
        className={cn(
          'truncate leading-tight',
          compact ? 'text-[10px]' : 'mt-0.5 text-2xs',
          teacher ? 'text-ink-muted' : 'font-medium text-danger',
        )}
      >
        {secondary}
      </p>

      {!compact && room && (
        <p className="truncate text-2xs leading-tight text-ink-faint">{room.nameAr}</p>
      )}

      {conflicted && (
        <span className="absolute left-1 top-1 flex h-3 w-3 items-center justify-center rounded-full bg-danger text-[8px] font-bold text-white">
          !
        </span>
      )}
    </div>
  );
}
