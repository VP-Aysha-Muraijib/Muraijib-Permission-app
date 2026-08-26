/**
 * بيانات التهيئة الأولى.
 *
 * افتراضيًا تُهيَّأ المنظومة ببيانات تجريبية واضحة التعليم. أمّا نسخة المدرسة
 * فتُبنى ببياناتها الحقيقية مُضمَّنة، فتفتح على جدولها مباشرةً بلا خطوة استيراد.
 *
 * البيانات تُحقن وقت البناء عبر `__MURAIJIB_SEED__` ولا تُخزَّن في المستودع:
 * أسماء الكادر وجداولهم لا تُرفع إلى مستودع عام.
 */

import type { ScheduleSnapshot } from '@/lib/domain/types';
import { buildDemoSnapshot } from './demo';

declare const __MURAIJIB_SEED__: ScheduleSnapshot | undefined;

export interface Seed {
  snapshot: ScheduleSnapshot;
  /** يحدّد ظهور شريط «بيانات تجريبية» وسلوك صفحة الإعدادات. */
  isDemo: boolean;
  reasonAr: string;
}

export function getSeed(): Seed {
  const injected = typeof __MURAIJIB_SEED__ !== 'undefined' ? __MURAIJIB_SEED__ : undefined;

  if (injected && Array.isArray(injected.lessons) && injected.lessons.length > 0) {
    return {
      snapshot: { ...injected, versionId: 'baseline' },
      isDemo: false,
      reasonAr: 'الجدول المرجعي للمدرسة كما ورد في وثائقها الرسمية',
    };
  }

  return {
    snapshot: buildDemoSnapshot(),
    isDemo: true,
    reasonAr: 'بيانات تجريبية أولية لعرض المنظومة قبل استيراد بيانات المدرسة',
  };
}
