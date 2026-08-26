'use client';

import * as React from 'react';
import { useSchedule } from '@/lib/state/schedule-provider';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { DemoBanner } from './demo-banner';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { loading } = useSchedule();

  return (
    <div className="flex min-h-screen">
      {/* السطح المكتبي: الشريط الجانبي ثابت — بناء الجدول يتم على شاشة كبيرة. */}
      <div className="hidden lg:block">
        <div className="sticky top-0 h-screen">
          <Sidebar />
        </div>
      </div>

      {/* الجوال: الشريط الجانبي يظهر عند الطلب فقط. */}
      {mobileOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-[rgba(16,26,24,.45)]"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 shadow-overlay">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <DemoBanner />
        <main className={cn('flex-1 px-4 py-5 sm:px-6 sm:py-6', loading && 'opacity-60')}>
          {loading ? <ShellSkeleton /> : children}
        </main>
      </div>
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse space-y-4">
      <div className="h-8 w-56 rounded bg-surface-sunken" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-24 rounded-lg bg-surface-sunken" />
        ))}
      </div>
      <div className="h-72 rounded-lg bg-surface-sunken" />
    </div>
  );
}
