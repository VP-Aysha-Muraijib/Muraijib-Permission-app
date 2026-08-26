'use client';

import Link from 'next/link';
import { useSchedule } from '@/lib/state/schedule-provider';
import { Icon } from './icon';

/**
 * تنبيه دائم لا يمكن إخفاؤه ما دامت البيانات تجريبية.
 * الغرض منه ألّا تُتخذ قرارات على بيانات ليست بيانات المدرسة.
 */
export function DemoBanner() {
  const { isDemo } = useSchedule();
  if (!isDemo) return null;

  return (
    <div className="no-print flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-warn/25 bg-warn-soft px-4 py-2 text-xs text-warn">
      <Icon name="TriangleAlert" className="h-3.5 w-3.5 shrink-0" />
      <span className="font-semibold">بيانات تجريبية</span>
      <span className="text-warn/85">
        الأسماء والحصص المعروضة مولّدة للعرض فقط ولا تمثّل جدول المدرسة.
      </span>
      <Link href="/import" className="font-semibold underline underline-offset-2 hover:opacity-80">
        استيراد بيانات المدرسة
      </Link>
    </div>
  );
}
