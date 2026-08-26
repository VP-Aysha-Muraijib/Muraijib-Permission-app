'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSchedule } from '@/lib/state/schedule-provider';
import { buildNotifications, countByTone, TONE_COLOR } from '@/lib/notifications';
import { Button } from '@/components/ui';
import { Icon } from './icon';
import { cn } from '@/lib/utils';

export function NotificationCenter() {
  const { snapshot, health, workloads } = useSchedule();
  const [open, setOpen] = React.useState(false);
  const boxRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const notifications = React.useMemo(
    () => (snapshot && health ? buildNotifications(snapshot, health, workloads) : []),
    [snapshot, health, workloads],
  );

  const counts = countByTone(notifications);
  const urgent = counts.danger + counts.warn;

  return (
    <div ref={boxRef} className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-label={`التنبيهات (${notifications.length})`}
        className="relative"
      >
        <Icon name="Bell" className="h-4 w-4" />
        {urgent > 0 && (
          <span
            className="tabular absolute -left-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
            style={{ background: counts.danger > 0 ? 'var(--danger)' : 'var(--warn)' }}
          >
            {urgent}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-1.5 w-[22rem] overflow-hidden rounded-lg border border-line bg-surface shadow-overlay">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <p className="text-xs font-bold text-ink">التنبيهات</p>
            <span className="text-2xs text-ink-faint">{notifications.length} بند</span>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-ok-soft text-ok">
                <Icon name="CheckCheck" className="h-4 w-4" />
              </span>
              <p className="text-xs font-semibold text-ink">لا شيء يحتاج انتباهك 🎉</p>
              <p className="mt-1 text-2xs leading-relaxed text-ink-muted">
                الجدول مكتمل، والأنصبة ضمن الحدود، ولا توجد تعارضات.
              </p>
            </div>
          ) : (
            <ul className="max-h-96 divide-y divide-line overflow-y-auto">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <Link
                    href={notification.href}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-2.5 px-4 py-2.5 transition-colors hover:bg-surface-sunken"
                  >
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: TONE_COLOR[notification.tone] }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium leading-snug text-ink">
                        {notification.titleAr}
                      </span>
                      <span className="mt-0.5 block text-2xs leading-relaxed text-ink-muted">
                        {notification.detailAr}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/conflicts"
            onClick={() => setOpen(false)}
            className={cn(
              'block border-t border-line px-4 py-2.5 text-center text-2xs font-medium text-brand-ink',
              'transition-colors hover:bg-surface-sunken',
            )}
          >
            فتح الفحص الكامل للجدول
          </Link>
        </div>
      )}
    </div>
  );
}
