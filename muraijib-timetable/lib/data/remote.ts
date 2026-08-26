'use client';

/**
 * مخزن الإنتاج — لا يلمس قاعدة البيانات مباشرةً.
 *
 * كل قراءة وكتابة تمرّ عبر مسارات /api، حيث يُعاد تشغيل التحقق على الخادم.
 * التحقق في المتصفح للمعاينة السريعة فقط؛ الحارس الحقيقي هناك.
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
import type { ApplyResult, DataStore } from './store';

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      body?.errorAr ?? 'تعذّر إتمام العملية على الخادم. يرجى المحاولة مرة أخرى.',
    );
  }
  return body as T;
}

export const remoteStore: DataStore = {
  getSnapshot: (versionId?: ID) =>
    api<ScheduleSnapshot>(`/schedule${versionId ? `?version=${encodeURIComponent(versionId)}` : ''}`),

  saveReferenceData: (patch) =>
    api<void>('/reference', { method: 'PATCH', body: JSON.stringify(patch) }),

  listVersions: () => api<ScheduleVersion[]>('/versions'),
  getCurrentVersionId: () => api<{ id: ID }>('/versions/current').then((r) => r.id),
  restoreVersion: (versionId, actor) =>
    api<ApplyResult>('/versions/restore', { method: 'POST', body: JSON.stringify({ versionId, actor }) }),

  applyChangeSet: (changeSet: ChangeSet, actor: string) =>
    api<ApplyResult>('/changeset/apply', { method: 'POST', body: JSON.stringify({ changeSet, actor }) }),

  listAudit: (limit = 200) => api<AuditEntry[]>(`/audit?limit=${limit}`),
  appendAudit: (entry) => api<void>('/audit', { method: 'POST', body: JSON.stringify(entry) }),

  listScenarios: () => api<Scenario[]>('/scenarios'),
  saveScenario: (scenario) => api<void>('/scenarios', { method: 'POST', body: JSON.stringify(scenario) }),
  deleteScenario: (id) => api<void>(`/scenarios/${id}`, { method: 'DELETE' }),

  getProfile: () => api<Profile>('/profile'),
  isDemo: () => api<{ demo: boolean }>('/profile').then(() => false),

  replaceAll: (snapshot, reason, actor) =>
    api<ApplyResult>('/import/commit', {
      method: 'POST',
      body: JSON.stringify({ snapshot, reason, actor }),
    }),
};
