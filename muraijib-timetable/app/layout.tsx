import type { Metadata, Viewport } from 'next';
import { Tajawal } from 'next/font/google';
import './globals.css';
import { ScheduleProvider } from '@/lib/state/schedule-provider';

const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-arabic-loaded',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'منظومة مريجب الذكية — الجدول المدرسي 2026–2027',
  description:
    'منصة داخلية لإدارة وتنظيم وتحديث الجدول المدرسي لمدرسة مريجب، مع محرك قيود ومساعد ذكي للتعامل مع تغيّرات العام الدراسي.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#0B4A4F',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={tajawal.variable}>
      <body style={{ ['--font-arabic' as string]: `var(--font-arabic-loaded), system-ui, sans-serif` }}>
        <ScheduleProvider>{children}</ScheduleProvider>
      </body>
    </html>
  );
}
