/**
 * حدّ البيانات.
 *
 * الواجهة والمحرك لا يعرفان أين تُحفظ البيانات. هذا يسمح بتشغيل المنظومة
 * محليًا للتقييم الفوري، والانتقال إلى Supabase في الإنتاج بتغيير متغيّر بيئة واحد.
 */

import type {
  AuditEntry,
  ChangeSet,
  ID,
  Profile,
  Scenario,
  ScheduleSnapshot,
  ScheduleVersion,
} from '@/lib/domain/types';

export interface ApplyResult {
  ok: boolean;
  /** النسخة الجديدة الناتجة عن الاعتماد. */
  version?: ScheduleVersion;
  snapshot?: ScheduleSnapshot;
  /** رسالة عربية واضحة عند الرفض — لا رموز خطأ. */
  errorAr?: string;
  /** انتهاكات منعت الاعتماد. */
  blocking?: import('@/lib/domain/types').Violation[];
}

export interface DataStore {
  /** بيانات المدرسة الأساسية + الجدول لنسخة بعينها (الحالية افتراضيًا). */
  getSnapshot(versionId?: ID): Promise<ScheduleSnapshot>;
  /** حفظ الكيانات المرجعية (معلمات/مواد/صفوف/أسبوع الدراسة) — لا يمسّ الحصص. */
  saveReferenceData(patch: Partial<ScheduleSnapshot>): Promise<void>;

  listVersions(): Promise<ScheduleVersion[]>;
  getCurrentVersionId(): Promise<ID>;
  restoreVersion(versionId: ID, actor: string): Promise<ApplyResult>;

  /** التحقق ثم الكتابة الذرّية ثم إنشاء نسخة ثم التسجيل في سجل التدقيق. */
  applyChangeSet(changeSet: ChangeSet, actor: string): Promise<ApplyResult>;

  listAudit(limit?: number): Promise<AuditEntry[]>;
  appendAudit(entry: Omit<AuditEntry, 'id' | 'at'>): Promise<void>;

  listScenarios(): Promise<Scenario[]>;
  saveScenario(scenario: Scenario): Promise<void>;
  deleteScenario(id: ID): Promise<void>;

  getProfile(): Promise<Profile>;

  /** هل البيانات الحالية تجريبية؟ تُستخدم لعرض تنبيه دائم في الواجهة. */
  isDemo(): Promise<boolean>;
  /** استبدال كل البيانات — يُستدعى من معالج الاستيراد بعد اعتماد المستخدم. */
  replaceAll(snapshot: ScheduleSnapshot, reason: string, actor: string): Promise<ApplyResult>;
}
