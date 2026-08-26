/**
 * مركز التنبيهات.
 *
 * التنبيه هنا ليس رسالة نظام، بل بند عمل: ما الخلل، وما حجمه، وأين يُعالَج.
 * تُشتق كلها من حالة الجدول الحقيقية — لا يوجد تنبيه مخزَّن يمكن أن يتقادم.
 */

import type { ScheduleSnapshot, TeacherWorkload } from '@/lib/domain/types';
import type { HealthReport } from '@/lib/engine/conflicts';

export type NotificationTone = 'danger' | 'warn' | 'ok' | 'info';

export interface Notification {
  id: string;
  tone: NotificationTone;
  titleAr: string;
  detailAr: string;
  href: string;
}

export const TONE_COLOR: Record<NotificationTone, string> = {
  danger: 'var(--danger)',
  warn: 'var(--warn)',
  ok: 'var(--ok)',
  info: 'var(--info)',
};

export function buildNotifications(
  snapshot: ScheduleSnapshot,
  health: HealthReport,
  workloads: TeacherWorkload[],
): Notification[] {
  const out: Notification[] = [];
  const nameOf = (id: string) => snapshot.teachers.find((t) => t.id === id)?.nameAr ?? '—';

  // ① معلمة غادرت وحصصها ما زالت على الجدول — أعلى أولوية دائمًا.
  for (const teacher of snapshot.teachers) {
    if (teacher.status !== 'transferred' && teacher.status !== 'on_leave') continue;
    const lessons = snapshot.lessons.filter((l) => l.teacherId === teacher.id).length;
    if (lessons === 0) continue;
    out.push({
      id: `transfer-${teacher.id}`,
      tone: 'danger',
      titleAr: `${teacher.nameAr} ${teacher.status === 'transferred' ? 'منقولة' : 'في إجازة'} وحصصها على الجدول`,
      detailAr: `${lessons} حصة تحتاج إعادة توزيع. اطلب من المساعد الذكي حلًا بأقل تغيير.`,
      href: '/agent',
    });
  }

  // ② التعارضات المانعة.
  for (const group of health.groups) {
    if (group.severity !== 'critical' && group.severity !== 'high') continue;
    if (group.constraintId === 'curriculum-completeness') continue;
    out.push({
      id: `group-${group.constraintId}`,
      tone: group.severity === 'critical' ? 'danger' : 'warn',
      titleAr: `${group.labelAr} — ${group.count}`,
      detailAr: group.violations[0].messageAr,
      href: '/conflicts',
    });
  }

  // ③ نقص أو زيادة في حصص المواد.
  const completeness = health.groups.find((g) => g.constraintId === 'curriculum-completeness');
  if (completeness) {
    out.push({
      id: 'completeness',
      tone: 'warn',
      titleAr: `${completeness.count} ملاحظة على اكتمال نصاب المواد`,
      detailAr: completeness.violations[0].messageAr,
      href: '/conflicts',
    });
  }

  // ④ تجاوز النصاب — لكل معلمة على حدة، لأن المعالجة فردية.
  for (const load of workloads.filter((w) => w.status === 'over')) {
    out.push({
      id: `over-${load.teacherId}`,
      tone: 'danger',
      titleAr: `${nameOf(load.teacherId)} أعلى من النصاب بـ${load.assigned - load.required}`,
      detailAr: `أُسند لها ${load.assigned} حصة والنصاب المطلوب ${load.required}.`,
      href: `/teachers/${load.teacherId}`,
    });
  }

  // ⑤ نقص النصاب — مجمّع، لأنه فرصة استيعاب لا مشكلة فردية.
  const under = workloads.filter((w) => w.status === 'under');
  if (under.length > 0) {
    out.push({
      id: 'under',
      tone: 'warn',
      titleAr: `${under.length} معلمة دون النصاب`,
      detailAr: `مجموع الحصص المتبقية لديهن ${under.reduce((a, w) => a + w.remaining, 0)} حصة يمكن الاستفادة منها عند أي تغيير.`,
      href: '/workload',
    });
  }

  // ⑥ خطة الصف لا تملأ الأسبوع — خلل في البيانات لا في الجدول.
  const totalSlots = snapshot.week.days
    .filter((d) => d.isTeaching)
    .reduce((a, d) => a + d.periods.filter((p) => p.kind === 'lesson').length, 0);
  for (const grade of snapshot.grades) {
    const planned = snapshot.curriculum
      .filter((c) => c.gradeId === grade.id)
      .reduce((a, c) => a + c.weeklyLessons, 0);
    if (planned === 0 || planned === totalSlots) continue;
    out.push({
      id: `plan-${grade.id}`,
      tone: 'info',
      titleAr: `خطة ${grade.nameAr} لا تطابق خانات الأسبوع`,
      detailAr: `الخطة ${planned} حصة والخانات المتاحة ${totalSlots}. ${planned > totalSlots ? 'الخطة تتجاوز الأسبوع.' : 'تبقى خانات بلا مادة مخطّطة.'}`,
      href: '/subjects',
    });
  }

  return out;
}

export const countByTone = (notifications: Notification[]) => ({
  danger: notifications.filter((n) => n.tone === 'danger').length,
  warn: notifications.filter((n) => n.tone === 'warn').length,
  info: notifications.filter((n) => n.tone === 'info').length,
});
