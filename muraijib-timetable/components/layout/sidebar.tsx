'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV } from '@/lib/nav';
import { useSchedule } from '@/lib/state/schedule-provider';
import { cn } from '@/lib/utils';
import { Icon } from './icon';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { health, workloads, snapshot } = useSchedule();

  const counters = {
    conflicts: health ? health.totals.blocking + health.totals.unassigned : 0,
    underload: workloads.filter((w) => w.status === 'under' || w.status === 'over').length,
  };

  return (
    <aside
      data-app-sidebar
      className="flex h-full w-[var(--sidebar-width)] shrink-0 flex-col border-l border-line bg-surface"
    >
      <div className="flex h-[var(--topbar-height)] items-center gap-2.5 border-b border-line px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-brand text-ink-invert">
          <Icon name="CalendarRange" className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-bold leading-tight text-ink">منظومة مريجب</p>
          <p className="truncate text-2xs leading-tight text-ink-faint">
            الجدول المدرسي <span className="ltr-run">{snapshot?.week.yearLabel ?? '2026–2027'}</span>
          </p>
        </div>
      </div>

      <nav data-app-nav className="flex-1 overflow-y-auto px-2.5 py-3">
        {NAV.map((group, i) => (
          <div key={i} className={cn(i > 0 && 'mt-5')}>
            {group.section && (
              <p className="table-head mb-1.5 px-2.5">{group.section}</p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                const count = item.counter ? counters[item.counter] : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        'flex items-center gap-2.5 rounded px-2.5 py-2 text-[13px] transition-colors',
                        active
                          ? 'bg-brand-tint font-semibold text-brand-ink'
                          : 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
                      )}
                    >
                      <Icon name={item.icon} className="h-[17px] w-[17px] shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.counter && count > 0 && (
                        <span
                          className={cn(
                            'tabular rounded-sm px-1.5 py-px text-2xs font-semibold',
                            item.counter === 'conflicts'
                              ? 'bg-danger-soft text-danger'
                              : 'bg-warn-soft text-warn',
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <ScheduleHealthFooter />
    </aside>
  );
}

function ScheduleHealthFooter() {
  const { health } = useSchedule();
  if (!health) return null;

  const tone =
    !health.valid ? 'danger' : health.score >= 85 ? 'ok' : health.score >= 65 ? 'warn' : 'danger';
  const color =
    tone === 'ok' ? 'var(--ok)' : tone === 'warn' ? 'var(--warn)' : 'var(--danger)';

  return (
    <Link
      href="/conflicts"
      className="border-t border-line px-4 py-3 transition-colors hover:bg-surface-sunken"
    >
      <div className="flex items-center justify-between">
        <span className="text-2xs font-medium text-ink-muted">صحة الجدول</span>
        <span className="tabular text-sm font-bold" style={{ color }}>
          {health.valid ? `${health.score}%` : 'غير صالح'}
        </span>
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-sunken">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${health.valid ? health.score : 100}%`, background: color }}
        />
      </div>
    </Link>
  );
}
