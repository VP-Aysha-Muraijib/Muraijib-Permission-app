/**
 * التعرّف على الكيانات داخل نص عربي حرّ.
 *
 * لا يمكن الاعتماد على مطابقة حرفية: المستخدم يكتب «المعلمة فاطمة» أو «فاطمة»،
 * و«الصف السابع» أو «٧» أو «7/3». هذه الطبقة توحّد ذلك قبل تشغيل أي أداة.
 */

import type { ScheduleSnapshot } from '@/lib/domain/types';
import { normalizeAr } from '@/lib/utils';

export interface EntityMatches {
  teacherIds: string[];
  sectionIds: string[];
  gradeIds: string[];
  subjectIds: string[];
  numbers: number[];
}

const AR_DIGIT_MAP: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

const GRADE_WORDS: Record<string, number> = {
  'الاول': 1, 'الثاني': 2, 'الثالث': 3, 'الرابع': 4, 'الخامس': 5,
  'السادس': 6, 'السابع': 7, 'الثامن': 8, 'التاسع': 9, 'العاشر': 10,
  'الحادي عشر': 11, 'الثاني عشر': 12,
};

export const toLatinDigits = (text: string) =>
  text.replace(/[٠-٩]/g, (d) => AR_DIGIT_MAP[d] ?? d);

/**
 * مطابقة الاسم على حدود الكلمات.
 *
 * المطابقة بالاحتواء وحدها تُخطئ: «معلمة ١» تُطابق داخل «معلمة ١٢»، و«علي» داخل «عليا».
 * لذلك يُقارَن الاسم كتتابع كلمات كامل داخل كلمات النص، لا كسلسلة حروف.
 */
const tokenize = (text: string) =>
  normalizeAr(toLatinDigits(text))
    .replace(/[.,،؟!:؛"'()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

function containsName(haystackTokens: string[], name: string): boolean {
  const nameTokens = tokenize(name);
  if (nameTokens.length === 0) return false;
  if (nameTokens.length === 1 && nameTokens[0].length < 2) return false;

  for (let i = 0; i + nameTokens.length <= haystackTokens.length; i++) {
    if (nameTokens.every((token, k) => haystackTokens[i + k] === token)) return true;
  }
  return false;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function extractEntities(text: string, snapshot: ScheduleSnapshot): EntityMatches {
  const latin = toLatinDigits(text);
  const normalized = normalizeAr(latin);
  const tokens = tokenize(text);

  const teacherIds = snapshot.teachers
    .filter((t) => containsName(tokens, t.nameAr) || (t.nameEn ? containsName(tokens, t.nameEn) : false))
    .map((t) => t.id);

  // الشعب تُكتب بصيغة 6/2 أو 6-2
  const sectionIds = snapshot.sections
    .filter((s) => {
      const label = s.label.replace('/', '');
      return (
        latin.includes(s.label) ||
        latin.includes(s.label.replace('/', '-')) ||
        latin.includes(s.label.replace('/', ' / ')) ||
        (label.length >= 2 && new RegExp(`\\b${escapeRegExp(s.label.replace('/', '\\s*[/-]\\s*'))}\\b`).test(latin))
      );
    })
    .map((s) => s.id);

  const gradeIds = snapshot.grades
    .filter((g) => {
      if (containsName(tokens, g.nameAr)) return true;
      for (const [word, level] of Object.entries(GRADE_WORDS)) {
        if (level === g.level && normalized.includes(`صف ${word}`)) return true;
      }
      // «الصف 8» أو «صف ٨»
      return new RegExp(`صف\\s*${g.level}\\b`).test(latin);
    })
    .map((g) => g.id);

  const subjectIds = snapshot.subjects
    .filter((s) => containsName(tokens, s.nameAr))
    .map((s) => s.id);

  const numbers = [...latin.matchAll(/\b(\d{1,2})\b/g)].map((m) => Number(m[1]));

  return { teacherIds, sectionIds, gradeIds, subjectIds, numbers };
}
