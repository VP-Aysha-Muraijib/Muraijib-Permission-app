'use client';

import Link from 'next/link';
import { useSchedule } from '@/lib/state/schedule-provider';
import { Button } from '@/components/ui';
import { GlobalSearch } from './global-search';
import { NotificationCenter } from './notification-center';
import { Icon } from './icon';

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { profile, versions, canUndo, canRedo, undo, redo } = useSchedule();
  const current = versions.find((v) => v.isCurrent);

  return (
    <header
      data-app-topbar
      className="sticky top-0 z-30 flex h-[var(--topbar-height)] items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur"
    >
      <Button variant="ghost" size="sm" className="lg:hidden" onClick={onMenu} aria-label="القائمة">
        <Icon name="Menu" className="h-4 w-4" />
      </Button>

      <GlobalSearch />

      <div className="mr-auto flex items-center gap-2">
        {current && (
          <Link
            href="/versions"
            className="hidden items-center gap-1.5 rounded border border-line px-2.5 py-1 text-2xs text-ink-muted transition-colors hover:bg-surface-sunken sm:flex"
            title={`النسخة الحالية — ${current.reason}`}
          >
            <Icon name="GitBranch" className="h-3 w-3" />
            <span className="tabular font-semibold text-ink">{current.label}</span>
          </Link>
        )}

        <div className="flex items-center rounded border border-line">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void undo()}
            disabled={!canUndo}
            title="تراجع عن آخر تغيير معتمد"
            className="rounded-l-none"
          >
            <Icon name="Undo2" className="h-4 w-4" />
            <span className="hidden sm:inline">تراجع</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void redo()}
            disabled={!canRedo}
            title="إعادة التغيير الذي تراجعت عنه"
            className="rounded-r-none border-r border-line px-2"
          >
            <Icon name="Redo2" className="h-4 w-4" />
          </Button>
        </div>

        <NotificationCenter />

        <Link href="/agent">
          <Button variant="primary" size="sm">
            <Icon name="Sparkles" className="h-4 w-4" />
            <span className="hidden sm:inline">المساعد الذكي</span>
          </Button>
        </Link>

        <div className="hidden items-center gap-2 border-r border-line pr-3 md:flex">
          <div className="text-left">
            <p className="text-2xs font-semibold leading-tight text-ink">{profile?.name ?? '—'}</p>
            <p className="text-2xs leading-tight text-ink-faint">
              {profile?.role === 'admin' ? 'نائب المدير' : profile?.role === 'coordinator' ? 'منسّق الجدول' : 'اطّلاع فقط'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
