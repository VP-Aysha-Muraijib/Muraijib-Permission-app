'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ChangeSet, ID, Lesson, Op } from '@/lib/domain/types';
import type { ValidationResult } from '@/lib/engine/validator';
import { periodLabel } from '@/lib/engine/snapshot';
import { useSchedule } from '@/lib/state/schedule-provider';
import { Badge, Button, Card, EmptyState, Select } from '@/components/ui';
import { PageHeader } from '@/components/layout/page-header';
import { Icon } from '@/components/layout/icon';
import { TimetableGrid, type DropIntent } from '@/components/timetable/timetable-grid';
import { MasterGrid } from '@/components/timetable/master-grid';
import { LessonInspector } from '@/components/timetable/lesson-inspector';
import { ChangePreviewDialog } from '@/components/timetable/change-preview';
import { cn } from '@/lib/utils';
import { LANG_LABEL, useDisplayLang, type DisplayLang } from '@/lib/i18n';

type View = 'master' | 'master-teachers' | 'class' | 'teacher' | 'subject' | 'day' | 'conflicts';

const VIEWS: Array<{ id: View; label: string; icon: string }> = [
  { id: 'master', label: 'الجدول الرئيسي', icon: 'Table2' },
  { id: 'master-teachers', label: 'حسب المعلمات', icon: 'Users' },
  { id: 'class', label: 'جدول شعبة', icon: 'School' },
  { id: 'teacher', label: 'جدول معلمة', icon: 'User' },
  { id: 'subject', label: 'توزيع مادة', icon: 'BookOpen' },
  { id: 'day', label: 'حسب اليوم', icon: 'CalendarDays' },
  { id: 'conflicts', label: 'التعارضات فقط', icon: 'TriangleAlert' },
];

export default function TimetablePage() {
  const router = useRouter();
  const params = useSearchParams();
  const { snapshot, index, health, workloads, preview, makeChangeSet, apply } = useSchedule();
  const { lang, setLang } = useDisplayLang();

  const [view, setView] = React.useState<View>((params.get('view') as View) ?? 'master');
  const [entityId, setEntityId] = React.useState<ID | null>(params.get('id'));
  const [selected, setSelected] = React.useState<Lesson | null>(null);

  const [pending, setPending] = React.useState<{
    changeSet: ChangeSet;
    validation: ValidationResult;
    titleAr: string;
    subtitleAr?: string;
  } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // اختيار افتراضي معقول عند تبديل العرض بدل شاشة فارغة.
  React.useEffect(() => {
    if (!snapshot) return;
    if (view === 'class' && !snapshot.sections.some((s) => s.id === entityId)) {
      setEntityId(snapshot.sections[0]?.id ?? null);
    } else if (view === 'teacher' && !snapshot.teachers.some((t) => t.id === entityId)) {
      setEntityId(snapshot.teachers[0]?.id ?? null);
    } else if (view === 'subject' && !snapshot.subjects.some((s) => s.id === entityId)) {
      setEntityId(snapshot.subjects[0]?.id ?? null);
    } else if (view === 'day' && !snapshot.week.days.some((d) => d.id === entityId)) {
      setEntityId(snapshot.week.days.find((d) => d.isTeaching)?.id ?? null);
    }
  }, [view, snapshot, entityId]);

  const conflictedLessonIds = React.useMemo(() => {
    const set = new Set<ID>();
    for (const violation of health?.violations ?? []) {
      if (violation.severity === 'critical' || violation.severity === 'high') {
        for (const id of violation.lessonIds) set.add(id);
      }
    }
    return set;
  }, [health]);

  if (!snapshot || !index) return null;

  const propose = (ops: Op[], titleAr: string, subtitleAr?: string) => {
    setError(null);
    const validation = preview(ops);
    const changeSet = makeChangeSet({ ops, summaryAr: titleAr, reason: 'تعديل يدوي من مساحة عمل الجدول' });
    if (!validation || !changeSet) return;
    setPending({ changeSet, validation, titleAr, subtitleAr });
  };

  const onDrop = (intent: DropIntent) => {
    const subject = index.subjectById.get(intent.lesson.subjectId)?.nameAr ?? '';
    const section = index.sectionById.get(intent.lesson.sectionId)?.label ?? '';
    const from = periodLabel(index, {
      dayId: intent.lesson.dayId,
      periodIndex: intent.lesson.periodIndex,
    });
    const to = periodLabel(index, intent.target);

    if (intent.occupant) {
      propose(
        [{ t: 'swap', aId: intent.lesson.id, bId: intent.occupant.id }],
        `تبديل حصتين`,
        `${subject} — الشعبة ${section} (${from}) ⇄ ${index.subjectById.get(intent.occupant.subjectId)?.nameAr ?? ''} (${to})`,
      );
    } else {
      propose(
        [{ t: 'move', lessonId: intent.lesson.id, to: intent.target }],
        `نقل حصة`,
        `${subject} — الشعبة ${section} · من ${from} إلى ${to}`,
      );
    }
  };

  const approve = async () => {
    if (!pending) return;
    setBusy(true);
    const result = await apply(pending.changeSet);
    setBusy(false);
    if (result.ok) {
      setPending(null);
      setSelected(null);
    } else {
      setError(result.errorAr ?? 'تعذّر اعتماد التغيير.');
    }
  };

  const selectorOptions = (() => {
    switch (view) {
      case 'class':
        return snapshot.sections.map((s) => ({ id: s.id, label: `الشعبة ${s.label}` }));
      case 'teacher':
        return snapshot.teachers.map((t) => ({ id: t.id, label: t.nameAr }));
      case 'subject':
        return snapshot.subjects.map((s) => ({ id: s.id, label: s.nameAr }));
      case 'day':
        return snapshot.week.days.filter((d) => d.isTeaching).map((d) => ({ id: d.id, label: d.nameAr }));
      default:
        return null;
    }
  })();

  return (
    <div className="mx-auto max-w-[110rem]">
      <PageHeader
        title="مساحة عمل الجدول"
        description="اسحب أي حصة لنقلها أو تبديلها. لا يُعتمد أي تغيير قبل عرض معاينة كاملة وموافقتك عليها."
        actions={
          <>
            <Link href={`/print?kind=${view === 'teacher' ? 'teacher' : 'class'}&id=${entityId ?? ''}`}>
              <Button size="sm" variant="secondary">
                <Icon name="Printer" className="h-3.5 w-3.5" />
                طباعة
              </Button>
            </Link>
            <Link href="/agent">
              <Button size="sm" variant="primary">
                <Icon name="Sparkles" className="h-3.5 w-3.5" />
                المساعد الذكي
              </Button>
            </Link>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-line bg-surface p-1">
          {VIEWS.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                setView(option.id);
                setSelected(null);
                router.replace(`/timetable?view=${option.id}`, { scroll: false });
              }}
              className={cn(
                'flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors',
                view === option.id
                  ? 'bg-brand text-ink-invert'
                  : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
              )}
            >
              <Icon name={option.icon} className="h-3.5 w-3.5" />
              {option.label}
            </button>
          ))}
        </div>

        {selectorOptions && (
          <Select
            value={entityId ?? ''}
            onChange={(e) => setEntityId(e.target.value)}
            className="h-9 w-auto min-w-[12rem]"
          >
            {selectorOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        )}

        <div className="mr-auto flex items-center gap-3 text-2xs text-ink-muted">
          <span className="flex items-center overflow-hidden rounded border border-line">
            {(['both', 'ar', 'en'] as DisplayLang[]).map((option) => (
              <button
                key={option}
                onClick={() => setLang(option)}
                className={cn(
                  'px-2 py-1 transition-colors',
                  lang === option ? 'bg-brand text-ink-invert' : 'hover:bg-surface-sunken',
                )}
                title="لغة عرض الجدول"
              >
                {LANG_LABEL[option]}
              </button>
            ))}
          </span>
          <LegendDot color="var(--danger)" label="تعارض" />
          <span className="flex items-center gap-1">
            <Icon name="Lock" className="h-3 w-3" /> مقفلة
          </span>
        </div>
      </div>

      <div className={cn('grid gap-3', selected ? 'lg:grid-cols-[minmax(0,1fr)_20rem]' : 'grid-cols-1')}>
        <Card className="overflow-hidden">
          <WorkspaceBody
            view={view}
            entityId={entityId}
            index={index}
            conflictedLessonIds={conflictedLessonIds}
            onDrop={onDrop}
            onSelect={setSelected}
            selectedId={selected?.id ?? null}
          />
        </Card>

        {selected && (
          <Card className="sticky top-[calc(var(--topbar-height)+1rem)] h-fit max-h-[calc(100vh-8rem)] overflow-hidden">
            <LessonInspector
              lesson={selected}
              index={index}
              onClose={() => setSelected(null)}
              onPropose={(ops, summaryAr) => propose(ops, summaryAr)}
            />
          </Card>
        )}
      </div>

      <ChangePreviewDialog
        open={Boolean(pending)}
        onClose={() => {
          setPending(null);
          setError(null);
        }}
        onApprove={approve}
        index={index}
        validation={pending?.validation ?? null}
        changeSet={pending?.changeSet ?? null}
        titleAr={pending?.titleAr ?? ''}
        subtitleAr={pending?.subtitleAr}
        busy={busy}
        errorAr={error}
      />
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

/* ────────── محتوى مساحة العمل حسب العرض ────────── */

function WorkspaceBody({
  view,
  entityId,
  index,
  conflictedLessonIds,
  onDrop,
  onSelect,
  selectedId,
}: {
  view: View;
  entityId: ID | null;
  index: ReturnType<typeof useSchedule>['index'];
  conflictedLessonIds: Set<ID>;
  onDrop: (intent: DropIntent) => void;
  onSelect: (lesson: Lesson) => void;
  selectedId: ID | null;
}) {
  if (!index) return null;
  const snapshot = index.snapshot;

  if (view === 'master' || view === 'master-teachers') {
    return (
      <MasterGrid
        index={index}
        rowKind={view === 'master' ? 'section' : 'teacher'}
        onSelect={onSelect}
        conflictedLessonIds={conflictedLessonIds}
      />
    );
  }

  if (view === 'class') {
    const lessons = snapshot.lessons.filter((l) => l.sectionId === entityId);
    return (
      <TimetableGrid
        index={index}
        lessons={lessons}
        context="class"
        conflictedLessonIds={conflictedLessonIds}
        onDrop={onDrop}
        onSelect={onSelect}
        selectedId={selectedId}
      />
    );
  }

  if (view === 'teacher') {
    const lessons = snapshot.lessons.filter((l) => l.teacherId === entityId);
    return (
      <TimetableGrid
        index={index}
        lessons={lessons}
        context="teacher"
        conflictedLessonIds={conflictedLessonIds}
        onDrop={onDrop}
        onSelect={onSelect}
        selectedId={selectedId}
        emptyHintAr="فراغ"
      />
    );
  }

  if (view === 'subject') {
    return (
      <MasterGrid
        index={index}
        rowKind="section"
        onSelect={onSelect}
        conflictedLessonIds={conflictedLessonIds}
        filterSubjectId={entityId}
      />
    );
  }

  if (view === 'day') {
    return <DayView index={index} dayId={entityId} onSelect={onSelect} conflicted={conflictedLessonIds} />;
  }

  return <ConflictsView index={index} onSelect={onSelect} />;
}

function DayView({
  index,
  dayId,
  onSelect,
  conflicted,
}: {
  index: NonNullable<ReturnType<typeof useSchedule>['index']>;
  dayId: ID | null;
  onSelect: (lesson: Lesson) => void;
  conflicted: Set<ID>;
}) {
  const day = index.snapshot.week.days.find((d) => d.id === dayId);
  if (!day) return null;
  const periods = day.periods.filter((p) => p.kind === 'lesson');

  return (
    <div className="overflow-x-auto p-3">
      <div className="flex gap-3" style={{ minWidth: `${periods.length * 11}rem` }}>
        {periods.map((period) => {
          const lessons = index.snapshot.lessons
            .filter((l) => l.dayId === day.id && l.periodIndex === period.index)
            .sort((a, b) =>
              (index.sectionById.get(a.sectionId)?.label ?? '').localeCompare(
                index.sectionById.get(b.sectionId)?.label ?? '',
                'ar',
                { numeric: true },
              ),
            );

          return (
            <div key={period.index} className="w-44 shrink-0">
              <div className="mb-2 rounded bg-surface-sunken px-2 py-1.5 text-center">
                <p className="text-2xs font-bold text-ink">{period.labelAr}</p>
                <p className="tabular text-2xs text-ink-faint">
                  {period.startTime} – {period.endTime}
                </p>
              </div>
              <div className="space-y-1">
                {lessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => onSelect(lesson)}
                    className={cn(
                      'w-full rounded border px-2 py-1.5 text-right transition-colors hover:bg-surface-sunken',
                      conflicted.has(lesson.id) ? 'border-danger' : 'border-line',
                    )}
                  >
                    <p className="truncate text-2xs font-semibold text-ink">
                      {index.sectionById.get(lesson.sectionId)?.label} ·{' '}
                      {index.subjectById.get(lesson.subjectId)?.nameAr}
                    </p>
                    <p className="truncate text-2xs text-ink-muted">
                      {lesson.teacherId ? index.teacherById.get(lesson.teacherId)?.nameAr : 'بلا معلمة'}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConflictsView({
  index,
  onSelect,
}: {
  index: NonNullable<ReturnType<typeof useSchedule>['index']>;
  onSelect: (lesson: Lesson) => void;
}) {
  const { health } = useSchedule();
  if (!health) return null;

  if (health.violations.length === 0) {
    return (
      <EmptyState
        tone="ok"
        icon={<Icon name="CheckCheck" className="h-5 w-5" />}
        title="لا توجد تعارضات 🎉"
        description="جميع الحصص الحالية اجتازت الفحص: لا حجز مزدوج، ولا خرق لأوقات عدم التوفر، ولا حصة خارج الفترات التدريسية."
      />
    );
  }

  return (
    <ul className="divide-y divide-line">
      {health.violations.slice(0, 60).map((violation, i) => {
        const lesson = violation.lessonIds[0] ? index.lessonById.get(violation.lessonIds[0]) : null;
        return (
          <li key={i} className="flex items-start gap-3 px-4 py-3">
            <Badge
              tone={violation.severity === 'critical' ? 'danger' : violation.severity === 'high' ? 'warn' : 'neutral'}
              className="mt-0.5 shrink-0"
            >
              {violation.severity === 'critical' ? 'حرج' : violation.severity === 'high' ? 'مرتفع' : 'متوسط'}
            </Badge>
            <p className="min-w-0 flex-1 text-xs leading-relaxed text-ink">{violation.messageAr}</p>
            {lesson && (
              <Button size="sm" variant="ghost" onClick={() => onSelect(lesson)}>
                معالجة
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
