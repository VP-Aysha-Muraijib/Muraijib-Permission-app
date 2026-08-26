'use client';

/**
 * لغة عرض الجدول.
 *
 * المدرسة ثنائية اللغة: مواد تُدرَّس بالعربية وأخرى بالإنجليزية، ومعلمات
 * لا يقرأن العربية. لذلك يُعرض الجدول بالاسمين معًا افتراضيًا، مع إمكانية
 * الاقتصار على لغة واحدة عند الطباعة لتوفير المساحة.
 *
 * هذا **عرض** فقط: البيانات تُخزَّن دائمًا بالاسمين، ولغة الواجهة نفسها عربية.
 */

import * as React from 'react';

export type DisplayLang = 'ar' | 'en' | 'both';

export const LANG_LABEL: Record<DisplayLang, string> = {
  ar: 'العربية',
  en: 'English',
  both: 'اللغتان',
};

const KEY = 'muraijib.displayLang';

const Ctx = React.createContext<{
  lang: DisplayLang;
  setLang: (l: DisplayLang) => void;
}>({ lang: 'both', setLang: () => {} });

export function DisplayLangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<DisplayLang>('both');

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY) as DisplayLang | null;
      if (saved === 'ar' || saved === 'en' || saved === 'both') setLangState(saved);
    } catch {
      // تخزين المتصفح قد يكون معطّلًا — التفضيل ليس جوهريًا فيُتجاهل بصمت
    }
  }, []);

  const setLang = React.useCallback((next: DisplayLang) => {
    setLangState(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* لا شيء */
    }
  }, []);

  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}

export const useDisplayLang = () => React.useContext(Ctx);

/** الاسم الأساسي بحسب اللغة المختارة. */
export function primary(ar: string, en: string | undefined | null, lang: DisplayLang): string {
  if (lang === 'en') return en || ar;
  return ar;
}

/** الاسم الثانوي — يُعرض تحت الأساسي في وضع اللغتين فقط، ولا يتكرّر إن تطابقا. */
export function secondary(
  ar: string,
  en: string | undefined | null,
  lang: DisplayLang,
): string | null {
  if (lang !== 'both' || !en || en === ar) return null;
  return en;
}
