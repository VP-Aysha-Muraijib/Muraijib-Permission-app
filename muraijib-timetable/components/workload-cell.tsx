'use client';

import type { TeacherWorkload } from '@/lib/domain/types';
import { Badge, Progress, type Tone } from '@/components/ui';
import { cn } from '@/lib/utils';

export const LOAD_LABEL: Record<TeacherWorkload['status'], string> = {
  complete: 'مكتمل',
  under: 'أقل من النصاب',
  over: 'أعلى من النصاب',
  conflict: 'يوجد تعارض',
  empty: 'بلا حصص',
};

export const LOAD_TONE: Record<TeacherWorkload['status'], Tone> = {
  complete: 'ok',
  under: 'warn',
  over: 'danger',
  conflict: 'danger',
  empty: 'neutral',
};

/** شريط النصاب مع الرقم — الرقم وحده لا يُظهر البُعد عن الهدف. */
export function LoadBar({ load, className }: { load: TeacherWorkload; className?: string }) {
  const tone: Tone = LOAD_TONE[load.status];
  return (
    <div className={cn('min-w-[7rem]', className)}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="tabular text-xs font-semibold text-ink">
          {load.assigned} / {load.required}
        </span>
        <span
          className={cn(
            'text-2xs',
            load.remaining > 0 ? 'text-warn' : load.remaining < 0 ? 'text-danger' : 'text-ok',
          )}
        >
          {load.remaining > 0
            ? `متبقٍ ${load.remaining}`
            : load.remaining < 0
              ? `زائد ${-load.remaining}`
              : 'مكتمل'}
        </span>
      </div>
      <Progress value={load.assigned} max={Math.max(1, load.required)} tone={tone} />
    </div>
  );
}

export function LoadBadge({ load }: { load: TeacherWorkload }) {
  return <Badge tone={LOAD_TONE[load.status]}>{LOAD_LABEL[load.status]}</Badge>;
}
