'use client';

import * as React from 'react';
import type { Lesson, Op } from '@/lib/domain/types';
import type { SnapshotIndex } from '@/lib/engine/snapshot';
import { periodLabel } from '@/lib/engine/snapshot';
import { findAvailableSlots, findAvailableTeachers, findSwapCandidates } from '@/lib/engine/solver';
import { Badge, Button, Tabs } from '@/components/ui';
import { Icon } from '@/components/layout/icon';
import { cn } from '@/lib/utils';

type Tab = 'move' | 'teacher' | 'swap';

/**
 * لوحة الحصة.
 *
 * ليست عرضًا للبيانات فقط: هي المكان الذي يُجاب فيه على سؤال
 * «لماذا لا يمكن نقل هذه الحصة؟» — بأسباب مذكورة لا بعبارة «يوجد تعارض».
 */
export function LessonInspector({
  lesson,
  index,
  onClose,
  onPropose,
}: {
  lesson: Lesson;
  index: SnapshotIndex;
  onClose: () => void;
  onPropose: (ops: Op[], summaryAr: string) => void;
}) {
  const [tab, setTab] = React.useState<Tab>('move');

  const subject = index.subjectById.get(lesson.subjectId);
  const section = index.sectionById.get(lesson.sectionId);
  const teacher = lesson.teacherId ? index.teacherById.get(lesson.teacherId) : null;
  const room = lesson.roomId ? index.roomById.get(lesson.roomId) : null;
  const locked = index.lockedLessonIds.has(lesson.id);

  const slots = React.useMemo(() => findAvailableSlots(index, lesson, { limit: 12 }), [index, lesson]);
  const teacherSearch = React.useMemo(() => findAvailableTeachers(index, lesson), [index, lesson]);
  const swaps = React.useMemo(() => findSwapCandidates(index, lesson, { limit: 12 }), [index, lesson]);

  const label = `${subject?.nameAr ?? ''} — الشعبة ${section?.label ?? ''}`;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink">{label}</p>
          <p className="mt-0.5 text-2xs text-ink-muted">
            {periodLabel(index, { dayId: lesson.dayId, periodIndex: lesson.periodIndex })}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="إغلاق">
          ✕
        </Button>
      </div>

      <div className="space-y-2 border-b border-line px-4 py-3 text-xs">
        <Row label="المعلمة" value={teacher?.nameAr ?? 'بلا معلمة'} tone={teacher ? undefined : 'danger'} />
        <Row label="المادة" value={subject?.nameAr ?? '—'} />
        <Row label="الشعبة" value={section?.label ?? '—'} />
        <Row label="الغرفة" value={room?.nameAr ?? 'غرفة الصف'} />
        <Row
          label="الحالة"
          value={locked ? 'مقفلة — محمية من إعادة التوزيع' : 'قابلة للتعديل'}
          tone={locked ? 'brand' : undefined}
        />
      </div>

      <div className="flex gap-2 border-b border-line px-4 py-2.5">
        <Button
          size="sm"
          variant={locked ? 'secondary' : 'primary'}
          onClick={() =>
            onPropose(
              [{ t: locked ? 'unlock' : 'lock', lessonId: lesson.id }],
              locked ? `فتح قفل ${label}` : `إقفال ${label}`,
            )
          }
        >
          <Icon name={locked ? 'LockOpen' : 'Lock'} className="h-3.5 w-3.5" />
          {locked ? 'فتح القفل' : 'إقفال الحصة'}
        </Button>
        {teacher && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onPropose([{ t: 'assign', lessonId: lesson.id, teacherId: null }], `إلغاء إسناد ${label}`)}
          >
            <Icon name="UserMinus" className="h-3.5 w-3.5" />
            إلغاء الإسناد
          </Button>
        )}
      </div>

      <Tabs
        className="px-4"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'move', label: 'نقل', count: slots.length },
          { id: 'teacher', label: 'تغيير المعلمة', count: teacherSearch.candidates.length },
          { id: 'swap', label: 'تبديل', count: swaps.length },
        ]}
      />

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {locked && (
          <p className="mb-3 rounded border border-brand/25 bg-brand-tint px-3 py-2 text-2xs leading-relaxed text-brand-ink">
            هذه الحصة مقفلة. لن يغيّرها أي إعادة توزيع — لا يدويًا ولا عبر المساعد الذكي — حتى يُفتح قفلها.
          </p>
        )}

        {tab === 'move' && (
          <SuggestionList
            emptyTitle="لا توجد خانة يمكن نقل الحصة إليها"
            emptyDetail={explainNoSlots(index, lesson)}
            items={slots.map((candidate) => ({
              key: `${candidate.slot.dayId}-${candidate.slot.periodIndex}`,
              title: periodLabel(index, candidate.slot),
              reasons: candidate.reasonsAr,
              fit: candidate.fit,
              onApply: () =>
                onPropose(
                  [{ t: 'move', lessonId: lesson.id, to: candidate.slot }],
                  `نقل ${label} إلى ${periodLabel(index, candidate.slot)}`,
                ),
            }))}
          />
        )}

        {tab === 'teacher' && (
          <>
            <SuggestionList
              emptyTitle="لا توجد معلمة متاحة لهذه الحصة"
              emptyDetail="راجع أسباب الاستبعاد أدناه — غالبًا الحل بتغيير وقت الحصة لا بتغيير المعلمة."
              items={teacherSearch.candidates.map((candidate) => ({
                key: candidate.teacher.id,
                title: candidate.teacher.nameAr,
                reasons: candidate.reasonsAr,
                fit: candidate.fit,
                onApply: () =>
                  onPropose(
                    [{ t: 'assign', lessonId: lesson.id, teacherId: candidate.teacher.id }],
                    `إسناد ${label} إلى ${candidate.teacher.nameAr}`,
                  ),
              }))}
            />
            {teacherSearch.rejected.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-2xs font-medium text-ink-muted hover:text-ink">
                  لماذا استُبعدت بقية المعلمات؟ ({teacherSearch.rejected.length})
                </summary>
                <ul className="mt-2 space-y-1">
                  {teacherSearch.rejected.slice(0, 20).map((rejected) => (
                    <li key={rejected.teacher.id} className="flex gap-2 text-2xs leading-relaxed text-ink-muted">
                      <span className="shrink-0 font-medium text-ink">{rejected.teacher.nameAr}:</span>
                      <span>{rejected.reasonAr}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}

        {tab === 'swap' && (
          <SuggestionList
            emptyTitle="لا توجد حصة يمكن تبديلها مع هذه الحصة"
            emptyDetail="كل الحصص المرشّحة إمّا مقفلة أو تُحدث تعارضًا بعد التبديل."
            items={swaps.map((candidate) => ({
              key: candidate.other.id,
              title: `${index.subjectById.get(candidate.other.subjectId)?.nameAr ?? ''} — ${index.sectionById.get(candidate.other.sectionId)?.label ?? ''}`,
              subtitle: periodLabel(index, {
                dayId: candidate.other.dayId,
                periodIndex: candidate.other.periodIndex,
              }),
              reasons: [],
              onApply: () =>
                onPropose(
                  [{ t: 'swap', aId: lesson.id, bId: candidate.other.id }],
                  `تبديل ${label} مع ${index.subjectById.get(candidate.other.subjectId)?.nameAr ?? ''}`,
                ),
            }))}
          />
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'danger' | 'brand';
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-ink-muted">{label}</span>
      <span
        className={cn(
          'truncate font-medium',
          tone === 'danger' ? 'text-danger' : tone === 'brand' ? 'text-brand-ink' : 'text-ink',
        )}
      >
        {value}
      </span>
    </div>
  );
}

function SuggestionList({
  items,
  emptyTitle,
  emptyDetail,
}: {
  items: Array<{
    key: string;
    title: string;
    subtitle?: string;
    reasons: string[];
    fit?: number;
    onApply: () => void;
  }>;
  emptyTitle: string;
  emptyDetail: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded border border-line bg-surface-sunken px-3 py-4 text-center">
        <p className="text-xs font-semibold text-ink">{emptyTitle}</p>
        <p className="mt-1 text-2xs leading-relaxed text-ink-muted">{emptyDetail}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item.key}>
          <button
            onClick={item.onApply}
            className="w-full rounded border border-line px-3 py-2 text-right transition-colors hover:border-brand-soft hover:bg-brand-tint"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-semibold text-ink">{item.title}</span>
              {item.fit !== undefined && (
                <Badge tone={item.fit >= 0.75 ? 'ok' : item.fit >= 0.55 ? 'brand' : 'neutral'}>
                  ملاءمة {Math.round(item.fit * 100)}%
                </Badge>
              )}
            </div>
            {item.subtitle && <p className="mt-0.5 text-2xs text-ink-muted">{item.subtitle}</p>}
            {item.reasons.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {item.reasons.map((reason, i) => (
                  <li key={i} className="text-2xs leading-relaxed text-ink-muted">
                    · {reason}
                  </li>
                ))}
              </ul>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** شرح غياب البدائل بدل تركه مجهولًا. */
function explainNoSlots(index: SnapshotIndex, lesson: Lesson): string {
  const subject = index.subjectById.get(lesson.subjectId);
  const section = index.sectionById.get(lesson.sectionId);
  const sectionLessons = (index.bySection.get(lesson.sectionId) ?? []).length;
  const free = index.teachingSlots.length - sectionLessons;

  if (free <= 0) {
    return `جدول الشعبة ${section?.label ?? ''} ممتلئ بالكامل (${sectionLessons} حصة في ${index.teachingSlots.length} خانة)، فلا توجد خانة شاغرة. جرّب التبديل بدل النقل.`;
  }
  return `الخانات الشاغرة لدى الشعبة ${section?.label ?? ''} (${free}) إمّا مشغولة لدى المعلمة، أو تتجاوز الحد اليومي لمادة ${subject?.nameAr ?? ''} (${subject?.maxPerDay ?? 0} حصة يوميًا). جرّب تبويب «تبديل».`;
}
