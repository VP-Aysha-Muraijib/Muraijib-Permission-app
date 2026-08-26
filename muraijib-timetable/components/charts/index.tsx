'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * رسوم بيانية مكتوبة يدويًا بلا مكتبة خارجية.
 *
 * الغرض تنفيذي لا زخرفي: كل رسم هنا يجيب على سؤال يواجه نائب المدير عند
 * اتخاذ قرار. ما لا يجيب على سؤال لا يُرسم.
 */

export interface Datum {
  label: string;
  value: number;
  color?: string;
  hint?: string;
}

/** أعمدة أفقية — الأنسب للأسماء العربية الطويلة. */
export function BarList({
  data,
  maxItems = 12,
  formatValue = (n: number) => String(n),
  emptyAr = 'لا توجد بيانات.',
}: {
  data: Datum[];
  maxItems?: number;
  formatValue?: (n: number) => string;
  emptyAr?: string;
}) {
  if (data.length === 0) return <p className="px-1 py-4 text-xs text-ink-muted">{emptyAr}</p>;
  const max = Math.max(1, ...data.map((d) => d.value));
  const items = data.slice(0, maxItems);

  return (
    <ul className="space-y-1.5">
      {items.map((datum) => (
        <li key={datum.label} className="flex items-center gap-2.5">
          <span className="w-28 shrink-0 truncate text-2xs text-ink" title={datum.label}>
            {datum.label}
          </span>
          <span className="relative h-4 flex-1 overflow-hidden rounded-sm bg-surface-sunken">
            <span
              className="absolute inset-y-0 right-0 rounded-sm transition-[width] duration-500"
              style={{
                width: `${(datum.value / max) * 100}%`,
                background: datum.color ?? 'var(--brand-primary)',
              }}
            />
          </span>
          <span className="tabular w-10 shrink-0 text-left text-2xs font-semibold text-ink">
            {formatValue(datum.value)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** مدرّج تكراري — لتوزيع قيمة رقمية على المعلمات (الفراغات مثلًا). */
export function Histogram({
  buckets,
  unitAr,
}: {
  buckets: Array<{ label: string; count: number; tone?: 'ok' | 'warn' | 'danger' }>;
  unitAr: string;
}) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height: 120 }}>
        {buckets.map((bucket) => (
          <div key={bucket.label} className="flex flex-1 flex-col items-center justify-end gap-1">
            <span className="tabular text-2xs font-semibold text-ink">{bucket.count || ''}</span>
            <span
              className="w-full rounded-t-sm transition-[height] duration-500"
              style={{
                height: `${Math.max(2, (bucket.count / max) * 96)}px`,
                background:
                  bucket.tone === 'danger'
                    ? 'var(--danger)'
                    : bucket.tone === 'warn'
                      ? 'var(--warn)'
                      : bucket.tone === 'ok'
                        ? 'var(--ok)'
                        : 'var(--brand-primary)',
              }}
            />
            <span className="text-2xs text-ink-faint">{bucket.label}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-2xs text-ink-faint">{unitAr}</p>
    </div>
  );
}

/** شريط مجزّأ — لتوزيع نسبي (حالات النصاب مثلًا). */
export function SplitBar({ segments }: { segments: Array<{ label: string; value: number; color: string }> }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-surface-sunken">
        {segments.map((segment) =>
          segment.value === 0 ? null : (
            <span
              key={segment.label}
              className="h-full"
              style={{ width: `${(segment.value / total) * 100}%`, background: segment.color }}
              title={`${segment.label}: ${segment.value}`}
            />
          ),
        )}
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center gap-1.5 text-2xs text-ink-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: segment.color }} />
            {segment.label}
            <span className="tabular font-semibold text-ink">{segment.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** خط زمني بسيط لتغيّر قيمة عبر النسخ. */
export function Sparkline({
  points,
  labels,
  formatValue = (n: number) => String(n),
}: {
  points: number[];
  labels: string[];
  formatValue?: (n: number) => string;
}) {
  if (points.length < 2) {
    return <p className="px-1 py-4 text-xs text-ink-muted">تحتاج نسختين على الأقل لعرض التغيّر.</p>;
  }

  const max = Math.max(...points, 100);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const width = 100;
  const height = 40;

  // اتجاه الرسم من اليمين لليسار ليطابق قراءة الواجهة العربية.
  const coords = points.map((value, i) => {
    const x = width - (i / (points.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-full" preserveAspectRatio="none" role="img">
        <polyline
          points={coords.join(' ')}
          fill="none"
          stroke="var(--brand-primary)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        {coords.map((point, i) => {
          const [x, y] = point.split(',');
          return <circle key={i} cx={x} cy={y} r="1.6" fill="var(--brand-primary)" vectorEffect="non-scaling-stroke" />;
        })}
      </svg>
      <div className="mt-1 flex justify-between text-2xs text-ink-faint">
        <span>
          {labels[labels.length - 1]} · {formatValue(points[points.length - 1])}
        </span>
        <span>
          {labels[0]} · {formatValue(points[0])}
        </span>
      </div>
    </div>
  );
}

export function ChartCard({
  title,
  question,
  children,
  className,
}: {
  title: string;
  /** السؤال الذي يجيب عنه الرسم — يمنع إضافة رسوم بلا قيمة. */
  question: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('card p-4', className)}>
      <p className="text-xs font-bold text-ink">{title}</p>
      <p className="mt-0.5 text-2xs text-ink-muted">{question}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}
