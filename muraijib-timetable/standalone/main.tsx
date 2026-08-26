'use client';

/**
 * نقطة الدخول للنسخة أحادية الملف.
 *
 * الغرض منها إتاحة المنصة على رابط مباشر بلا خادم ولا تثبيت. تستخدم **نفس**
 * صفحات التطبيق ومحرك القيود بلا أي نسخة موازية — الفارق الوحيد أن التنقّل
 * بالتجزئة بدل موجّه Next.js.
 */

import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { ScheduleProvider } from '@/lib/state/schedule-provider';
import { AppShell } from '@/components/layout/app-shell';
import { DisplayLangProvider } from '@/lib/i18n';
import { usePathname } from './shims/navigation';

import Dashboard from '@/app/(app)/page';
import Timetable from '@/app/(app)/timetable/page';
import Teachers from '@/app/(app)/teachers/page';
import TeacherProfile from '@/app/(app)/teachers/[id]/page';
import Classes from '@/app/(app)/classes/page';
import Subjects from '@/app/(app)/subjects/page';
import Workload from '@/app/(app)/workload/page';
import Agent from '@/app/(app)/agent/page';
import Scenarios from '@/app/(app)/scenarios/page';
import Conflicts from '@/app/(app)/conflicts/page';
import Analytics from '@/app/(app)/analytics/page';
import PrintCenter from '@/app/(app)/print/page';
import Versions from '@/app/(app)/versions/page';
import Audit from '@/app/(app)/audit/page';
import ImportWizard from '@/app/(app)/import/page';
import Settings from '@/app/(app)/settings/page';

const ROUTES: Array<{ match: RegExp; Page: React.ComponentType }> = [
  { match: /^\/$/, Page: Dashboard },
  { match: /^\/timetable/, Page: Timetable },
  { match: /^\/teachers\/[^/]+$/, Page: TeacherProfile },
  { match: /^\/teachers/, Page: Teachers },
  { match: /^\/classes/, Page: Classes },
  { match: /^\/subjects/, Page: Subjects },
  { match: /^\/workload/, Page: Workload },
  { match: /^\/agent/, Page: Agent },
  { match: /^\/scenarios/, Page: Scenarios },
  { match: /^\/conflicts/, Page: Conflicts },
  { match: /^\/analytics/, Page: Analytics },
  { match: /^\/print/, Page: PrintCenter },
  { match: /^\/versions/, Page: Versions },
  { match: /^\/audit/, Page: Audit },
  { match: /^\/import/, Page: ImportWizard },
  { match: /^\/settings/, Page: Settings },
];

function NotFound() {
  return (
    <div className="mx-auto max-w-md px-6 py-20 text-center">
      <p className="text-sm font-semibold text-ink">الصفحة غير موجودة</p>
      <p className="mt-1 text-xs text-ink-muted">تحقق من الرابط أو عد إلى الرئيسية من القائمة.</p>
    </div>
  );
}

function Router() {
  const pathname = usePathname();
  const route = ROUTES.find((r) => r.match.test(pathname));
  const Page = route?.Page ?? NotFound;
  return <Page />;
}

function App() {
  React.useEffect(() => {
    if (!window.location.hash) window.location.hash = '#/';
  }, []);

  return (
    <DisplayLangProvider>
      <ScheduleProvider>
        <AppShell>
          <Router />
        </AppShell>
      </ScheduleProvider>
    </DisplayLangProvider>
  );
}

const container = document.getElementById('app');
if (container) createRoot(container).render(<App />);
