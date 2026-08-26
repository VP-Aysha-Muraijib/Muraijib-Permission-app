/**
 * إعدادات الهوية البصرية والتوقيعات الرسمية.
 *
 * لم تُخترع ألوان وزارية ولم يُعَد رسم أي شعار: الشعار المستخدَم هو الشعار
 * المعتمد كما ورد في ترويسة الوثيقة الرسمية للمدرسة، منقولًا كما هو.
 *
 * أسماء الموقِّعات تُضبط هنا لا داخل المكوّنات، حتى يتغيّر التوقيع في كل
 * المطبوعات من موضع واحد عند تغيّر المسمّى أو الشاغلة.
 */

import { MINISTRY_LOGO_DATA_URI } from '@/lib/brand-logo';

export interface Signatory {
  /** المسمّى الوظيفي كما يُكتب في الوثائق الرسمية. */
  roleAr: string;
  roleEn?: string;
  nameAr: string;
}

export interface BrandAssets {
  /** شعار الوزارة المعتمد — data URI ليعمل في الويب والملف المستقل معًا. */
  ministryLogo: string | null;
  ministryNameAr: string;
  ministryNameEn: string;
  schoolLogo: string | null;
  schoolNameAr: string;
  schoolNameEn: string;
  /** يُطبع في تذييل كل ورقة. */
  systemNameAr: string;
  /** خانات الاعتماد أسفل كل ورقة مطبوعة، بترتيب العرض. */
  signatories: Signatory[];
}

export const BRAND: BrandAssets = {
  ministryLogo: MINISTRY_LOGO_DATA_URI,
  ministryNameAr: 'وزارة التربية والتعليم',
  ministryNameEn: 'Ministry of Education',
  schoolLogo: null,
  schoolNameAr: 'مدرسة مريجب للتعليم الأساسي ح2',
  schoolNameEn: 'Muraijib School C2',
  systemNameAr: 'Muraijib Smart Timetable',
  signatories: [
    { roleAr: 'نائب مدير أكاديمي', roleEn: 'Academic Vice Principal', nameAr: 'عائشة النعيمي' },
    { roleAr: 'مديرة المدرسة', roleEn: 'School Principal', nameAr: 'اليازية الظاهري' },
  ],
};

export const hasOfficialAssets = () => Boolean(BRAND.ministryLogo);
