'use client';

import * as React from 'react';

/**
 * موجّه بسيط بالتجزئة يوفّر واجهة next/navigation نفسها،
 * حتى تعمل صفحات التطبيق بلا أي تعديل عليها.
 */

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', notify);
}

/** "#/teachers/t3?view=x" → { pathname: '/teachers/t3', search: 'view=x' } */
export function parseHash(hash: string) {
  const raw = hash.replace(/^#/, '') || '/';
  const [pathname, search = ''] = raw.split('?');
  return { pathname: pathname || '/', search };
}

function useHash() {
  return React.useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => (typeof window === 'undefined' ? '#/' : window.location.hash || '#/'),
    () => '#/',
  );
}

export function usePathname(): string {
  return parseHash(useHash()).pathname;
}

export function useSearchParams(): URLSearchParams {
  const search = parseHash(useHash()).search;
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

export function useRouter() {
  return React.useMemo(
    () => ({
      push: (href: string) => {
        window.location.hash = href;
      },
      replace: (href: string) => {
        // الاستبدال يتجنّب تضخيم سجل الرجوع عند تبديل طرق العرض.
        const url = `${window.location.pathname}${window.location.search}#${href}`;
        window.history.replaceState(null, '', url);
        notify();
      },
      back: () => window.history.back(),
      refresh: () => notify(),
      prefetch: () => {},
    }),
    [],
  );
}

/** المسار الديناميكي الوحيد في التطبيق: /teachers/[id] */
export function useParams<T extends Record<string, string>>(): T {
  const pathname = usePathname();
  const match = /^\/teachers\/([^/]+)$/.exec(pathname);
  return { id: match?.[1] ?? '' } as unknown as T;
}
