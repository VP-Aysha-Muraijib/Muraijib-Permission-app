import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic, Inter, Tajawal } from 'next/font/google';
import './globals.css';
import { ScheduleProvider } from '@/lib/state/schedule-provider';
import { DisplayLangProvider } from '@/lib/i18n';

const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-arabic-loaded',
  display: 'swap',
});

/**
 * خط الوثائق المطبوعة.
 *
 * الواجهة تبقى على Tajawal لأنها أداة تحرير على شاشة. أما الورقة الرسمية
 * فتُطبع بـ IBM Plex Sans Arabic: خطّ مؤسسي هندسي البنية، أقرب في روحه إلى
 * DIN — وهو الخط الأول المطلوب لو كان مرخَّصًا — وأقرب إلى الكوفي الهندسي في
 * علامة الوزارة نفسها، بخلاف الخطوط النسخية المحايدة التي تُقرأ رقميةً على
 * الورق. مرخَّص بـ OFL.
 */
const docArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600'],
  variable: '--font-doc-arabic-loaded',
  display: 'swap',
});

/** اللاتينية في الوثيقة مقترنة بعربيّتها من العائلة نفسها لا خطًّا غريبًا عنها. */
const docLatin = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-doc-latin-loaded',
  display: 'swap',
});

/** الإنجليزية لغة مساندة في الوثائق الرسمية — خط مستقل حتى لا ترثه من العربية. */
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-latin-loaded',
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
    <html lang="ar" dir="rtl" className={`${tajawal.variable} ${docArabic.variable} ${docLatin.variable} ${inter.variable}`}>
      <body style={
          {
            ['--font-arabic' as string]: `var(--font-arabic-loaded), system-ui, sans-serif`,
            ['--font-latin' as string]: `var(--font-latin-loaded), system-ui, sans-serif`,
            ['--font-doc-arabic' as string]: `var(--font-doc-arabic-loaded)`,
            ['--font-doc-latin' as string]: `var(--font-doc-latin-loaded)`,
          } as React.CSSProperties
        }>
        <DisplayLangProvider>
          <ScheduleProvider>{children}</ScheduleProvider>
        </DisplayLangProvider>
      </body>
    </html>
  );
}
