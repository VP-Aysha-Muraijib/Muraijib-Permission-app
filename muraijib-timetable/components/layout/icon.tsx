'use client';

import * as Icons from 'lucide-react';

/** جسر بين أسماء الأيقونات في ملف التنقّل ومكتبة الأيقونات. */
export function Icon({ name, className }: { name: string; className?: string }) {
  const Component = (Icons as unknown as Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>>)[name];
  if (!Component) return null;
  return <Component className={className} strokeWidth={1.75} />;
}
