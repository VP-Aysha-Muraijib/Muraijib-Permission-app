/**
 * إعدادات الهوية البصرية.
 *
 * لم تُخترع ألوان وزارية ولم يُعَد رسم أي شعار. عند تزويد المشروع بالأصول
 * الرسمية المعتمدة تُوضع الملفات في public/brand/ وتُحدَّث المسارات هنا فقط،
 * فيظهر الشعار في كل المطبوعات تلقائيًا.
 */

export interface BrandAssets {
  /** شعار الوزارة — يُترك فارغًا حتى تُزوَّد النسخة الرسمية. */
  ministryLogo: string | null;
  ministryNameAr: string;
  schoolLogo: string | null;
  schoolNameAr: string;
  /** يُطبع في تذييل كل ورقة. */
  systemNameAr: string;
}

export const BRAND: BrandAssets = {
  ministryLogo: null,
  ministryNameAr: 'وزارة التربية والتعليم',
  schoolLogo: null,
  schoolNameAr: 'مدرسة مريجب',
  systemNameAr: 'Muraijib Smart Timetable',
};

export const hasOfficialAssets = () => Boolean(BRAND.ministryLogo);
