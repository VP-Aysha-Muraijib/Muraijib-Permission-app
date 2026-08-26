'use client';

/**
 * مخزن محلي (IndexedDB) — لتشغيل المنظومة فورًا بلا خادم.
 *
 * الغرض منه التقييم وبناء الجدول قبل ربط Supabase. القيود نفسها تُطبَّق،
 * والنسخ وسجل التدقيق يعملان بالكامل — الفارق الوحيد أن التخزين في المتصفح.
 * ملاحظة أمنية: لا تُستخدم هذه الحالة لبيانات إنتاجية حسّاسة مشتركة بين مستخدمين.
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
import { applyOps, localId } from '@/lib/engine/changeset';
import { validateChangeSet } from '@/lib/engine/validator';
import { scoreSnapshot } from '@/lib/engine/score';
import { getSeed } from './seed';
import type { ApplyResult, DataStore } from './store';

const DB_NAME = 'muraijib-timetable';
const DB_VERSION = 1;
const STORE = 'documents';

interface Documents {
  meta: { isDemo: boolean; currentVersionId: ID; profile: Profile };
  reference: Omit<ScheduleSnapshot, 'lessons' | 'locks' | 'versionId'>;
  versions: ScheduleVersion[];
  /** حصص كل نسخة على حدة — لا تُعدَّل نسخة سابقة أبدًا. */
  lessons: Record<ID, ScheduleSnapshot['lessons']>;
  locks: Record<ID, ScheduleSnapshot['locks']>;
  audit: AuditEntry[];
  scenarios: Scenario[];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readAll(): Promise<Documents | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get('root');
    request.onsuccess = () => resolve((request.result as Documents) ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function writeAll(docs: Documents): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(docs, 'root');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function seed(): Documents {
  const { snapshot: initial, isDemo, reasonAr } = getSeed();
  const { lessons, locks, versionId, ...reference } = initial;
  const version: ScheduleVersion = {
    id: versionId,
    label: 'v1.0',
    parentId: null,
    reason: reasonAr,
    createdBy: 'النظام',
    createdAt: new Date().toISOString(),
    isBaseline: true,
    isCurrent: true,
    lessonsChanged: lessons.length,
    qualityScore: scoreSnapshot(initial).total,
  };

  return {
    meta: {
      isDemo,
      currentVersionId: versionId,
      profile: { id: 'local', name: 'نائب المدير', role: 'admin' },
    },
    reference,
    versions: [version],
    lessons: { [versionId]: lessons },
    locks: { [versionId]: locks },
    audit: [
      {
        id: localId('a'),
        at: new Date().toISOString(),
        actor: 'النظام',
        action: 'seed',
        entity: 'schedule',
        summaryAr: isDemo
          ? 'تحميل بيانات تجريبية لعرض المنظومة قبل استيراد بيانات المدرسة.'
          : `اعتماد الجدول المرجعي: ${lessons.length} حصة · ${reference.teachers.length} معلمة · ${reference.sections.length} شعبة.`,
      },
    ],
    scenarios: [],
  };
}

async function ensure(): Promise<Documents> {
  const existing = await readAll();
  if (existing) return existing;
  const fresh = seed();
  await writeAll(fresh);
  return fresh;
}

const nextLabel = (versions: ScheduleVersion[]) => {
  const numbers = versions
    .map((v) => /^v(\d+)\.(\d+)$/.exec(v.label))
    .filter(Boolean)
    .map((m) => Number(m![2]));
  const minor = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return `v1.${minor}`;
};

export class LocalStore implements DataStore {
  private async snapshotFrom(docs: Documents, versionId: ID): Promise<ScheduleSnapshot> {
    return {
      ...docs.reference,
      versionId,
      lessons: docs.lessons[versionId] ?? [],
      locks: docs.locks[versionId] ?? [],
    };
  }

  async getSnapshot(versionId?: ID): Promise<ScheduleSnapshot> {
    const docs = await ensure();
    return this.snapshotFrom(docs, versionId ?? docs.meta.currentVersionId);
  }

  async saveReferenceData(patch: Partial<ScheduleSnapshot>): Promise<void> {
    const docs = await ensure();
    const { lessons, locks, versionId, ...rest } = patch;
    docs.reference = { ...docs.reference, ...rest };
    if (locks) docs.locks[docs.meta.currentVersionId] = locks;
    await writeAll(docs);
  }

  async listVersions(): Promise<ScheduleVersion[]> {
    const docs = await ensure();
    return [...docs.versions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getCurrentVersionId(): Promise<ID> {
    return (await ensure()).meta.currentVersionId;
  }

  async applyChangeSet(changeSet: ChangeSet, actor: string): Promise<ApplyResult> {
    const docs = await ensure();

    // حماية من التعارض: النسخة التي بُنيت عليها المعاينة قد تكون تغيّرت.
    if (changeSet.baseVersionId !== docs.meta.currentVersionId) {
      return {
        ok: false,
        errorAr:
          'تعذّر اعتماد التعديل لأن الجدول تغيّر في نسخة أحدث بعد إعداد هذه المعاينة. يرجى تحديث الصفحة ومراجعة التغيير قبل الاعتماد.',
      };
    }

    const current = await this.snapshotFrom(docs, docs.meta.currentVersionId);
    const validation = validateChangeSet(current, changeSet);
    if (!validation.ok) {
      return {
        ok: false,
        errorAr: 'يخالف هذا التعديل قيودًا صارمة ولا يمكن اعتماده.',
        blocking: validation.blocking,
      };
    }

    const nextSnapshot = applyOps(current, changeSet.ops);
    const newVersionId = localId('v');
    const version: ScheduleVersion = {
      id: newVersionId,
      label: nextLabel(docs.versions),
      parentId: docs.meta.currentVersionId,
      reason: changeSet.reason || changeSet.summaryAr,
      createdBy: actor,
      createdAt: new Date().toISOString(),
      isBaseline: false,
      isCurrent: true,
      lessonsChanged: validation.impact.lessonsChanged,
      qualityScore: validation.scoreAfter,
    };

    docs.versions = docs.versions.map((v) => ({ ...v, isCurrent: false }));
    docs.versions.push(version);
    docs.lessons[newVersionId] = nextSnapshot.lessons;
    docs.locks[newVersionId] = nextSnapshot.locks;
    docs.meta.currentVersionId = newVersionId;
    docs.audit.unshift({
      id: localId('a'),
      at: version.createdAt,
      actor,
      action: 'apply-changeset',
      entity: 'schedule',
      summaryAr: `${changeSet.summaryAr} — ${validation.impact.lessonsChanged} حصة تغيّرت (${version.label}).`,
      reason: changeSet.reason,
      changeSetId: changeSet.id,
      before: { versionId: changeSet.baseVersionId, score: validation.scoreBefore },
      after: { versionId: newVersionId, score: validation.scoreAfter },
    });

    await writeAll(docs);
    return { ok: true, version, snapshot: { ...nextSnapshot, versionId: newVersionId } };
  }

  async restoreVersion(versionId: ID, actor: string): Promise<ApplyResult> {
    const docs = await ensure();
    const source = docs.versions.find((v) => v.id === versionId);
    if (!source) return { ok: false, errorAr: 'النسخة المطلوبة غير موجودة.' };

    const newVersionId = localId('v');
    const version: ScheduleVersion = {
      id: newVersionId,
      label: nextLabel(docs.versions),
      parentId: docs.meta.currentVersionId,
      reason: `استرجاع النسخة ${source.label}`,
      createdBy: actor,
      createdAt: new Date().toISOString(),
      isBaseline: false,
      isCurrent: true,
      lessonsChanged: 0,
      qualityScore: source.qualityScore,
    };

    docs.versions = docs.versions.map((v) => ({ ...v, isCurrent: false }));
    docs.versions.push(version);
    docs.lessons[newVersionId] = [...(docs.lessons[versionId] ?? [])];
    docs.locks[newVersionId] = [...(docs.locks[versionId] ?? [])];
    docs.meta.currentVersionId = newVersionId;
    docs.audit.unshift({
      id: localId('a'),
      at: version.createdAt,
      actor,
      action: 'restore-version',
      entity: 'schedule',
      summaryAr: `استرجاع النسخة ${source.label} إلى نسخة جديدة ${version.label}.`,
    });

    await writeAll(docs);
    return { ok: true, version, snapshot: await this.snapshotFrom(docs, newVersionId) };
  }

  async listAudit(limit = 200): Promise<AuditEntry[]> {
    return (await ensure()).audit.slice(0, limit);
  }

  async appendAudit(entry: Omit<AuditEntry, 'id' | 'at'>): Promise<void> {
    const docs = await ensure();
    docs.audit.unshift({ ...entry, id: localId('a'), at: new Date().toISOString() });
    await writeAll(docs);
  }

  async listScenarios(): Promise<Scenario[]> {
    return (await ensure()).scenarios;
  }

  async saveScenario(scenario: Scenario): Promise<void> {
    const docs = await ensure();
    docs.scenarios = [scenario, ...docs.scenarios.filter((s) => s.id !== scenario.id)];
    await writeAll(docs);
  }

  async deleteScenario(id: ID): Promise<void> {
    const docs = await ensure();
    docs.scenarios = docs.scenarios.filter((s) => s.id !== id);
    await writeAll(docs);
  }

  async getProfile(): Promise<Profile> {
    return (await ensure()).meta.profile;
  }

  async isDemo(): Promise<boolean> {
    return (await ensure()).meta.isDemo;
  }

  async replaceAll(snapshot: ScheduleSnapshot, reason: string, actor: string): Promise<ApplyResult> {
    const docs = await ensure();
    const { lessons, locks, versionId, ...reference } = snapshot;
    const newVersionId = localId('v');

    const version: ScheduleVersion = {
      id: newVersionId,
      label: 'v1.0',
      parentId: null,
      reason,
      createdBy: actor,
      createdAt: new Date().toISOString(),
      isBaseline: true,
      isCurrent: true,
      lessonsChanged: lessons.length,
      qualityScore: scoreSnapshot({ ...snapshot, versionId: newVersionId }).total,
    };

    docs.reference = reference;
    docs.versions = [version];
    docs.lessons = { [newVersionId]: lessons };
    docs.locks = { [newVersionId]: locks };
    docs.meta.currentVersionId = newVersionId;
    docs.meta.isDemo = false;
    docs.scenarios = [];
    docs.audit.unshift({
      id: localId('a'),
      at: version.createdAt,
      actor,
      action: 'import-baseline',
      entity: 'schedule',
      summaryAr: `اعتماد الجدول المرجعي (Baseline v1.0): ${lessons.length} حصة · ${reference.teachers.length} معلمة · ${reference.sections.length} شعبة.`,
      reason,
    });

    await writeAll(docs);
    return { ok: true, version, snapshot: { ...snapshot, versionId: newVersionId } };
  }

  /** إعادة التهيئة إلى بيانات البداية — يمحو كل ما أُدخل في هذا المتصفح. */
  async resetToDemo(): Promise<void> {
    await writeAll(seed());
  }
}

export const localStore = new LocalStore();
