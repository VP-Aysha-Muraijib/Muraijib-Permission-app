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
    // يمرّ كل شيء عبر مسارات /api حتى يبقى التحقق النهائي على الخادم.
    return require('./remote').remoteStore as DataStore;
  }
  return localStore;
}

export const DATA_MODE = (process.env.NEXT_PUBLIC_DATA_MODE ?? 'local') as 'local' | 'supabase';
