import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/** أرقام هندية للنصوص السردية. الجداول تبقى بأرقام لاتينية لسهولة المقارنة. */
export const ar = (n: number | string) => String(n).replace(/\d/g, (d) => AR_DIGITS[Number(d)]);

export function formatDateAr(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ar-AE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function greetingAr(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'صباح الخير';
  if (hour < 17) return 'مساء الخير';
  return 'مساء الخير';
}

/** بحث عربي متسامح: يتجاهل التشكيل وأشكال الألف والهاء/التاء المربوطة. */
export function normalizeAr(text: string): string {
  return text
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export const matchesAr = (haystack: string, needle: string) =>
  normalizeAr(haystack).includes(normalizeAr(needle));

/** لون نص مقروء فوق خلفية المادة. */
export function readableOn(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '#17211F';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#17211F' : '#FFFFFF';
}

/** خلفية فاتحة مشتقة من لون المادة — لخلايا الجدول. */
export function tintOf(hex: string, alpha = 0.12): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return 'transparent';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
