'use client';

import type { DataStore } from './store';
import { localStore } from './local';

/**
 * اختيار المخزن حسب البيئة.
 *
 * `local`     → IndexedDB في المتصفح، لتشغيل المنظومة فورًا بلا خادم.
 * `supabase`  → قاعدة بيانات مع تحقق على الخادم وصلاحيات — وضع الإنتاج.
 */
export function getStore(): DataStore {
  const mode = process.env.NEXT_PUBLIC_DATA_MODE ?? 'local';

  if (mode === 'supabase') {
    // مخطط قاعدة البيانات وسياسات الأمان جاهزان ومتحقَّق منهما (supabase/)،
    // لكن مسارات /api التي يتحدث إليها remoteStore لم تُنفَّذ بعد.
    // الفشل هنا صريح ومبكر: تشغيل وضع الإنتاج نصف مربوط أخطر من رفضه.
    throw new Error(
      'وضع Supabase غير مكتمل الربط بعد: مخطط قاعدة البيانات جاهز في مجلد supabase/ ' +
        'لكن مسارات /api لم تُنفَّذ. اضبط NEXT_PUBLIC_DATA_MODE=local للتشغيل الآن، ' +
        'وراجع README للخطوات المتبقية.',
    );
  }

  return localStore;
}

export const DATA_MODE = (process.env.NEXT_PUBLIC_DATA_MODE ?? 'local') as 'local' | 'supabase';
