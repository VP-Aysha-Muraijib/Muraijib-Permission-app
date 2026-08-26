'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useSchedule } from '@/lib/state/schedule-provider';
import { matchesAr, cn } from '@/lib/utils';
import { Icon } from './icon';

interface Result {
  kind: 'teacher' | 'section' | 'subject' | 'grade';
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

/** بحث فوري في المعلمات والشعب والمواد — يعمل على البيانات المحمّلة، بلا انتظار شبكة. */
export function GlobalSearch() {
  const router = useRouter();
  const { snapshot, workloads } = useSchedule();
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  const results = React.useMemo<Result[]>(() => {
    if (!snapshot || query.trim().length < 1) return [];
    const out: Result[] = [];

    for (const teacher of snapshot.teachers) {
      if (!matchesAr(teacher.nameAr, query) && !matchesAr(teacher.nameEn ?? '', query)) continue;
      const load = workloads.find((w) => w.teacherId === teacher.id);
      const subject = snapshot.subjects.find((s) => s.id === teacher.primarySubjectId);
      out.push({
        kind: 'teacher',
        id: teacher.id,
        title: teacher.nameAr,
        subtitle: `${subject?.nameAr ?? 'معلمة'} · النصاب ${load?.assigned ?? 0}/${load?.required ?? 0}`,
        href: `/teachers/${teacher.id}`,
      });
    }

    for (const section of snapshot.sections) {
      const grade = snapshot.grades.find((g) => g.id === section.gradeId);
      if (!matchesAr(section.label, query) && !matchesAr(grade?.nameAr ?? '', query)) continue;
      out.push({
        kind: 'section',
        id: section.id,
        title: `الشعبة ${section.label}`,
        subtitle: grade?.nameAr ?? '',
        href: `/timetable?view=class&id=${section.id}`,
      });
    }

    for (const subject of snapshot.subjects) {
      if (!matchesAr(subject.nameAr, query) && !matchesAr(subject.code, query)) continue;
      out.push({
        kind: 'subject',
        id: subject.id,
        title: subject.nameAr,
        subtitle: `مادة · ${snapshot.lessons.filter((l) => l.subjectId === subject.id).length} حصة أسبوعيًا`,
        href: `/timetable?view=subject&id=${subject.id}`,
      });
    }

    return out.slice(0, 8);
  }, [snapshot, query, workloads]);

  const go = (result: Result) => {
    router.push(result.href);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const ICONS: Record<Result['kind'], string> = {
    teacher: 'User',
    section: 'School',
    subject: 'BookOpen',
    grade: 'Layers',
  };

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <Icon
        name="Search"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
      />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(results.length - 1, i + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(0, i - 1));
          } else if (e.key === 'Enter' && results[active]) {
            go(results[active]);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        placeholder="ابحث عن معلمة أو شعبة أو مادة…"
        className="input h-9 pr-9 text-[13px]"
        aria-label="بحث عام"
      />
      <kbd className="pointer-events-none absolute left-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1.5 py-0.5 text-2xs text-ink-faint sm:block">
        Ctrl K
      </kbd>

      {open && query.trim().length > 0 && (
        <div className="absolute inset-x-0 top-full z-40 mt-1.5 overflow-hidden rounded-lg border border-line bg-surface shadow-overlay">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-ink-muted">
              لا توجد نتائج مطابقة لـ «{query}».
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((result, i) => (
                <li key={`${result.kind}-${result.id}`}>
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(result)}
                    className={cn(
                      'flex w-full items-center gap-3 px-3.5 py-2 text-right transition-colors',
                      i === active ? 'bg-brand-tint' : 'hover:bg-surface-sunken',
                    )}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-surface-sunken text-ink-muted">
                      <Icon name={ICONS[result.kind]} className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">{result.title}</span>
                      <span className="block truncate text-2xs text-ink-faint">{result.subtitle}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
