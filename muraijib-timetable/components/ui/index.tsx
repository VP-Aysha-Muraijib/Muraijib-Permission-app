'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/* ────────── Button ────────── */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }
>(({ className, variant = 'secondary', size = 'md', ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      variant === 'primary' && 'btn-primary',
      variant === 'secondary' && 'btn-secondary',
      variant === 'ghost' && 'btn-ghost',
      variant === 'danger' && 'btn-danger',
      size === 'sm' && 'btn-sm',
      size === 'md' && 'btn-md',
      size === 'lg' && 'btn-lg',
      className,
    )}
    {...props}
  />
));
Button.displayName = 'Button';

/* ────────── Card ────────── */

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card', className)} {...props} />;
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 border-b border-line px-5 py-4', className)}>
      <div className="min-w-0">
        <h2 className="truncate text-sm font-bold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ────────── Badge ────────── */

export type Tone = 'neutral' | 'ok' | 'warn' | 'danger' | 'info' | 'brand' | 'accent';

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-surface-sunken text-ink-muted',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  brand: 'bg-brand-tint text-brand-ink',
  accent: 'bg-accent-soft text-accent',
};

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn('badge', TONE_CLASS[tone], className)} {...props} />;
}

/* ────────── Progress ────────── */

export function Progress({
  value,
  max,
  tone = 'brand',
  className,
}: {
  value: number;
  max: number;
  tone?: Tone;
  className?: string;
}) {
  const ratio = max <= 0 ? 0 : Math.min(1.15, value / max);
  const barColor =
    tone === 'ok' ? 'var(--ok)'
    : tone === 'warn' ? 'var(--warn)'
    : tone === 'danger' ? 'var(--danger)'
    : 'var(--brand-primary)';

  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken', className)}>
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${Math.min(100, ratio * 100)}%`, background: barColor }}
      />
    </div>
  );
}

/* ────────── Empty state ────────── */

export function EmptyState({
  icon,
  title,
  description,
  action,
  tone = 'neutral',
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  tone?: 'neutral' | 'ok';
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && (
        <div
          className={cn(
            'mb-4 flex h-12 w-12 items-center justify-center rounded-full',
            tone === 'ok' ? 'bg-ok-soft text-ok' : 'bg-surface-sunken text-ink-faint',
          )}
        >
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs leading-relaxed text-ink-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ────────── Modal ────────── */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const width =
    size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : size === 'xl' ? 'max-w-5xl' : 'max-w-xl';

  return (
    <div className="no-print fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div
        className="fixed inset-0 bg-[rgba(16,26,24,.45)] backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 w-full rounded-xl border border-line bg-surface shadow-overlay',
          width,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-ink">{title}</h2>
            {subtitle && <p className="mt-1 text-xs leading-relaxed text-ink-muted">{subtitle}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="إغلاق">
            ✕
          </Button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-sunken px-6 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────── Tabs ────────── */

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: Array<{ id: T; label: string; count?: number }>;
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-1 border-b border-line', className)} role="tablist">
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative -mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors',
              active
                ? 'border-brand text-brand-ink'
                : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  'tabular rounded-sm px-1.5 py-px text-2xs',
                  active ? 'bg-brand-tint text-brand-ink' : 'bg-surface-sunken text-ink-faint',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ────────── Field ────────── */

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1 block text-xs font-medium text-ink-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-2xs text-ink-faint">{hint}</span>}
    </label>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn('input', className)} {...props} />,
);
Input.displayName = 'Input';

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn('input cursor-pointer', className)} {...props} />
));
Select.displayName = 'Select';

/* ────────── Stat ────────── */

export function Stat({
  label,
  value,
  hint,
  tone = 'neutral',
  icon,
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: Tone;
  icon?: React.ReactNode;
  href?: string;
}) {
  const body = (
    <div className="card h-full px-4 py-3.5 transition-shadow hover:shadow-raised">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-ink-muted">{label}</p>
        {icon && <span className="text-ink-faint">{icon}</span>}
      </div>
      <p className={cn('tabular mt-1.5 text-2xl font-bold leading-none', tone === 'danger' && 'text-danger', tone === 'warn' && 'text-warn', tone === 'ok' && 'text-ok')}>
        {value}
      </p>
      {hint && <p className="mt-1.5 text-2xs text-ink-faint">{hint}</p>}
    </div>
  );
  return href ? (
    <a href={href} className="block focus-visible:outline-none">
      {body}
    </a>
  ) : (
    body
  );
}

/* ────────── Severity dot ────────── */

export function SeverityDot({ severity }: { severity: 'critical' | 'high' | 'medium' | 'low' }) {
  const color =
    severity === 'critical' ? 'var(--danger)'
    : severity === 'high' ? '#C2703A'
    : severity === 'medium' ? 'var(--warn)'
    : 'var(--text-faint)';
  return <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />;
}

export const SEVERITY_LABEL: Record<'critical' | 'high' | 'medium' | 'low', string> = {
  critical: 'حرج',
  high: 'مرتفع',
  medium: 'متوسط',
  low: 'منخفض',
};
