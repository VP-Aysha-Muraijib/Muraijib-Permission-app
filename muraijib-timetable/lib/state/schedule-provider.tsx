'use client';

/**
 * حالة الجدول في الواجهة.
 *
 * قاعدة صريحة: لا تُحدَّث الحالة تفاؤليًا عند تعديل الجدول.
 * التغيير يُعرض كمعاينة، ولا يدخل الحالة إلا بعد نجاح الاعتماد فعلًا.
 */

import * as React from 'react';
import type {
  AuditEntry,
  ChangeSet,
  ID,
  Op,
  Profile,
  ScheduleSnapshot,
  ScheduleVersion,
} from '@/lib/domain/types';
import { buildChangeSet, invertOps } from '@/lib/engine/changeset';
import { validateChangeSet, type ValidationResult } from '@/lib/engine/validator';
import { buildIndex, type SnapshotIndex } from '@/lib/engine/snapshot';
import { runHealthCheck, type HealthReport } from '@/lib/engine/conflicts';
import { computeAllWorkloads } from '@/lib/engine/workload';
import { explainScore, scoreIndex } from '@/lib/engine/score';
import type { ApplyResult } from '@/lib/data/store';
import { getStore } from '@/lib/data/client';

interface ScheduleContextValue {
  loading: boolean;
  isDemo: boolean;
  profile: Profile | null;
  snapshot: ScheduleSnapshot | null;
  index: SnapshotIndex | null;
  health: HealthReport | null;
  workloads: ReturnType<typeof computeAllWorkloads>;
  scoreDetail: ReturnType<typeof explainScore>;
  versions: ScheduleVersion[];
  audit: AuditEntry[];

  /** تحقق بلا كتابة — أساس كل معاينة في الواجهة. */
  preview(ops: Op[]): ValidationResult | null;
  makeChangeSet(input: { ops: Op[]; summaryAr: string; reason: string; source?: ChangeSet['source'] }): ChangeSet | null;
  apply(changeSet: ChangeSet): Promise<ApplyResult>;

  canUndo: boolean;
  canRedo: boolean;
  undo(): Promise<ApplyResult | null>;
  redo(): Promise<ApplyResult | null>;

  /** حفظ البيانات المرجعية (معلمات/مواد/صفوف/إعدادات الأسبوع) — لا يمسّ الحصص. */
  saveReference(patch: Partial<ScheduleSnapshot>, summaryAr: string): Promise<void>;
  refresh(): Promise<void>;
  restore(versionId: ID): Promise<ApplyResult>;
  replaceAll(snapshot: ScheduleSnapshot, reason: string): Promise<ApplyResult>;
}

const ScheduleContext = React.createContext<ScheduleContextValue | null>(null);

export function useSchedule(): ScheduleContextValue {
  const ctx = React.useContext(ScheduleContext);
  if (!ctx) throw new Error('useSchedule يجب أن يُستخدم داخل ScheduleProvider');
  return ctx;
}

export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = React.useState(true);
  const [isDemo, setIsDemo] = React.useState(false);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [snapshot, setSnapshot] = React.useState<ScheduleSnapshot | null>(null);
  const [versions, setVersions] = React.useState<ScheduleVersion[]>([]);
  const [audit, setAudit] = React.useState<AuditEntry[]>([]);
  /** مكدّس التراجع: عمليات عكسية مع وصفها. */
  const [undoStack, setUndoStack] = React.useState<Array<{ ops: Op[]; label: string }>>([]);
  /** مكدّس الإعادة — يُفرَغ عند أي تغيير جديد، وإلا أُعيد تطبيق عمل لم يعد له معنى. */
  const [redoStack, setRedoStack] = React.useState<Array<{ ops: Op[]; label: string }>>([]);

  const refresh = React.useCallback(async () => {
    const store = getStore();
    const [next, allVersions, log, who, demo] = await Promise.all([
      store.getSnapshot(),
      store.listVersions(),
      store.listAudit(),
      store.getProfile(),
      store.isDemo(),
    ]);
    setSnapshot(next);
    setVersions(allVersions);
    setAudit(log);
    setProfile(who);
    setIsDemo(demo);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const index = React.useMemo(() => (snapshot ? buildIndex(snapshot) : null), [snapshot]);
  const health = React.useMemo(() => (index ? runHealthCheck(index) : null), [index]);
  const workloads = React.useMemo(() => (index ? computeAllWorkloads(index) : []), [index]);
  const scoreDetail = React.useMemo(() => (index ? explainScore(scoreIndex(index)) : []), [index]);

  const makeChangeSet = React.useCallback<ScheduleContextValue['makeChangeSet']>(
    ({ ops, summaryAr, reason, source = 'user' }) => {
      if (!snapshot) return null;
      return buildChangeSet({
        baseVersionId: snapshot.versionId,
        source,
        summaryAr,
        reason,
        ops,
        createdBy: profile?.name ?? 'مستخدم',
      });
    },
    [snapshot, profile],
  );

  const preview = React.useCallback<ScheduleContextValue['preview']>(
    (ops) => {
      if (!snapshot) return null;
      const changeSet = buildChangeSet({
        baseVersionId: snapshot.versionId,
        source: 'user',
        summaryAr: 'معاينة',
        reason: '',
        ops,
        createdBy: profile?.name ?? 'مستخدم',
      });
      return validateChangeSet(snapshot, changeSet);
    },
    [snapshot, profile],
  );

  const apply = React.useCallback<ScheduleContextValue['apply']>(
    async (changeSet) => {
      if (!snapshot) return { ok: false, errorAr: 'لم يُحمَّل الجدول بعد.' };
      const inverse = invertOps(snapshot, changeSet.ops);
      const result = await getStore().applyChangeSet(changeSet, profile?.name ?? 'مستخدم');
      if (result.ok) {
        setUndoStack((stack) => [{ ops: inverse, label: changeSet.summaryAr }, ...stack].slice(0, 20));
        setRedoStack([]);
        await refresh();
      }
      return result;
    },
    [snapshot, profile, refresh],
  );

  /**
   * التراجع والإعادة يمرّان بالمسار نفسه: مجموعة تغيير تُتحقَّق وتُعتمد وتُسجَّل.
   * لا يوجد «تراجع صامت» يعدّل الجدول خارج سجل النسخ.
   */
  const runStackAction = React.useCallback(
    async (
      entry: { ops: Op[]; label: string } | undefined,
      labelAr: string,
      onSuccess: (inverse: { ops: Op[]; label: string }) => void,
    ) => {
      if (!entry || !snapshot) return null;
      const inverse = invertOps(snapshot, entry.ops);
      const changeSet = buildChangeSet({
        baseVersionId: snapshot.versionId,
        source: 'user',
        summaryAr: `${labelAr}: ${entry.label}`,
        reason: labelAr,
        ops: entry.ops,
        createdBy: profile?.name ?? 'مستخدم',
      });
      const result = await getStore().applyChangeSet(changeSet, profile?.name ?? 'مستخدم');
      if (result.ok) {
        onSuccess({ ops: inverse, label: entry.label });
        await refresh();
      }
      return result;
    },
    [snapshot, profile, refresh],
  );

  const undo = React.useCallback(
    () =>
      runStackAction(undoStack[0], 'تراجع عن', (inverse) => {
        setUndoStack((stack) => stack.slice(1));
        setRedoStack((stack) => [inverse, ...stack].slice(0, 20));
      }),
    [undoStack, runStackAction],
  );

  const redo = React.useCallback(
    () =>
      runStackAction(redoStack[0], 'إعادة', (inverse) => {
        setRedoStack((stack) => stack.slice(1));
        setUndoStack((stack) => [inverse, ...stack].slice(0, 20));
      }),
    [redoStack, runStackAction],
  );

  const saveReference = React.useCallback(
    async (patch: Partial<ScheduleSnapshot>, summaryAr: string) => {
      const store = getStore();
      await store.saveReferenceData(patch);
      await store.appendAudit({
        actor: profile?.name ?? 'مستخدم',
        action: 'edit-reference',
        entity: 'reference',
        summaryAr,
      });
      await refresh();
    },
    [profile, refresh],
  );

  const restore = React.useCallback(
    async (versionId: ID) => {
      const result = await getStore().restoreVersion(versionId, profile?.name ?? 'مستخدم');
      if (result.ok) await refresh();
      return result;
    },
    [profile, refresh],
  );

  const replaceAll = React.useCallback(
    async (next: ScheduleSnapshot, reason: string) => {
      const result = await getStore().replaceAll(next, reason, profile?.name ?? 'مستخدم');
      if (result.ok) {
        setUndoStack([]);
        await refresh();
      }
      return result;
    },
    [profile, refresh],
  );

  const value: ScheduleContextValue = {
    loading,
    isDemo,
    profile,
    snapshot,
    index,
    health,
    workloads,
    scoreDetail,
    versions,
    audit,
    preview,
    makeChangeSet,
    apply,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undo,
    redo,
    saveReference,
    refresh,
    restore,
    replaceAll,
  };

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
}
