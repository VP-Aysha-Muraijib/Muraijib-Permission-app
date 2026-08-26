/**
 * مطابقة أعمدة الملف بحقول النظام.
 *
 * تُقترح المطابقة تلقائيًا من عناوين الأعمدة، ويبقى القرار للمستخدم —
 * التخمين الصامت أخطر من السؤال.
 */

import { normalizeAr } from '@/lib/utils';

export type FieldId = 'day' | 'period' | 'grade' | 'section' | 'subject' | 'teacher' | 'room';

export interface FieldSpec {
  id: FieldId;
  labelAr: string;
  required: boolean;
  hintAr: string;
  /** مرادفات شائعة في جداول المدارس. */
  aliases: string[];
}

export const FIELDS: FieldSpec[] = [
  { id: 'day', labelAr: 'اليوم', required: true, hintAr: 'الأحد، الاثنين…', aliases: ['يوم', 'اليوم', 'day'] },
  { id: 'period', labelAr: 'الحصة', required: true, hintAr: 'رقم الحصة داخل اليوم', aliases: ['حصه', 'الحصه', 'رقم الحصه', 'period', 'الفتره'] },
  { id: 'grade', labelAr: 'الصف', required: false, hintAr: 'يُستخرج من الشعبة إن كانت بصيغة 6/2', aliases: ['صف', 'الصف', 'المرحله', 'grade'] },
  { id: 'section', labelAr: 'الشعبة', required: true, hintAr: 'رقم الشعبة أو 6/2', aliases: ['شعبه', 'الشعبه', 'الفصل', 'class', 'section'] },
  { id: 'subject', labelAr: 'المادة', required: true, hintAr: 'اسم المادة', aliases: ['ماده', 'الماده', 'subject'] },
  { id: 'teacher', labelAr: 'المعلمة', required: true, hintAr: 'اسم المعلمة', aliases: ['معلمه', 'المعلمه', 'المعلم', 'الاستاذه', 'teacher'] },
  { id: 'room', labelAr: 'الغرفة', required: false, hintAr: 'المختبر أو الغرفة الخاصة', aliases: ['غرفه', 'الغرفه', 'القاعه', 'المختبر', 'room'] },
];

export type ColumnMapping = Partial<Record<FieldId, number>>;

export function suggestMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const normalized = headers.map((h) => normalizeAr(h));

  for (const field of FIELDS) {
    const index = normalized.findIndex((header) => {
      if (!header) return false;
      return field.aliases.some((alias) => {
        const a = normalizeAr(alias);
        return header === a || header.includes(a);
      });
    });
    if (index >= 0 && !Object.values(mapping).includes(index)) mapping[field.id] = index;
  }

  return mapping;
}

export const missingRequired = (mapping: ColumnMapping): FieldSpec[] =>
  FIELDS.filter((f) => f.required && mapping[f.id] === undefined);
