'use client';

import * as React from 'react';
import { useSchedule } from '@/lib/state/schedule-provider';
import { teachingPeriodsOf } from '@/lib/engine/snapshot';
import { BarList, ChartCard, Histogram, Sparkline, SplitBar, type Datum } from '@/components/charts';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader } from '@/components/ui';

export default function AnalyticsPage() {
  const { snapshot, index, workloads, versions, scoreDetail, health } = useSchedule();
  if (!snapshot || !index || !health) return null;

  const nameOf = (id: string) => snapshot.teachers.find((t) => t.id === id)?.nameAr ?? '—';

  /* توزيع النصاب */
  const loadData: Datum[] = [...workloads]
    .sort((a, b) => b.assigned - a.assigned)
    .map((w) => ({
      label: nameOf(w.teacherId),
      value: w.assigned,
      color:
        w.status === 'over' ? 'var(--danger)' : w.status === 'under' ? 'var(--warn)' : 'var(--brand-primary)',
    }));

  /* الحصص حسب المادة */
  const subjectData: Datum[] = snapshot.subjects
    .map((subject) => ({
      label: subject.nameAr,
      value: (index.bySubject.get(subject.id) ?? []).length,
      color: subject.color,
    }))
    .sort((a, b) => b.value - a.value);

  /* الحصص حسب الصف */
  const gradeData: Datum[] = snapshot.grades
    .map((grade) => {
      const sectionIds = new Set(snapshot.sections.filter((s) => s.gradeId === grade.id).map((s) => s.id));
      return {
        label: grade.nameAr,
        value: snapshot.lessons.filter((l) => sectionIds.has(l.sectionId)).length,
      };
    })
    .sort((a, b) => b.value - a.value);

  /* مدرّج الفراغات */
  const gapBuckets = [0, 1, 2, 3, 4].map((n) => ({
    label: n === 4 ? '4+' : String(n),
    count: workloads.filter((w) => (n === 4 ? w.gaps >= 4 : w.gaps === n)).length,
    tone: n === 0 ? ('ok' as const) : n >= 3 ? ('warn' as const) : undefined,
  }));

  /* الحصص الأولى والأخيرة */
  const firstLastData: Datum[] = [...workloads]
    .map((w) => ({
      label: nameOf(w.teacherId),
      value: w.firstPeriods + w.lastPeriods,
      hint: `${w.firstPeriods} أولى · ${w.lastPeriods} أخيرة`,
    }))
    .sort((a, b) => b.value - a.value);

  /* توزيع الحصص على فترات اليوم */
  const periodLoad = (() => {
    const maxPeriods = Math.max(...index.teachingDays.map((d) => teachingPeriodsOf(d).length));
    return Array.from({ length: maxPeriods }, (_, i) => {
      const ordinal = i + 1;
      let count = 0;
      for (const day of index.teachingDays) {
        const periods = teachingPeriodsOf(day);
        const periodIndex = periods[i];
        if (periodIndex === undefined) continue;
        count += snapshot.lessons.filter(
          (l) => l.dayId === day.id && l.periodIndex === periodIndex,
        ).length;
      }
      return { label: String(ordinal), count };
    });
  })();

  /* توزيع الحصص على الأيام */
  const dayData: Datum[] = index.teachingDays.map((day) => ({
    label: day.nameAr,
    value: snapshot.lessons.filter((l) => l.dayId === day.id).length,
  }));

  /* حالات النصاب */
  const statusSegments = [
    { label: 'مكتمل', value: workloads.filter((w) => w.status === 'complete').length, color: 'var(--ok)' },
    { label: 'دون النصاب', value: workloads.filter((w) => w.status === 'under').length, color: 'var(--warn)' },
    { label: 'فوق النصاب', value: workloads.filter((w) => w.status === 'over').length, color: 'var(--danger)' },
    { label: 'بلا حصص', value: workloads.filter((w) => w.status === 'empty').length, color: 'var(--text-faint)' },
  ];

  /* تغيّر الجودة عبر النسخ */
  const timeline = [...versions]
    .filter((v) => v.qualityScore !== null)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="التحليلات"
        description="مؤشرات تنفيذية تخدم قرارًا. كل رسم هنا يجيب على سؤال يواجهك عند تعديل الجدول."
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard
          title="توزيع أنصبة المعلمات"
          question="من تحمل أكثر من غيرها، ومن لديها متسع لاستيعاب تغيير مفاجئ؟"
        >
          <BarList data={loadData} maxItems={20} formatValue={(n) => `${n}`} />
        </ChartCard>

        <div className="space-y-3">
          <ChartCard title="حالة الأنصبة" question="هل التوزيع الحالي عادل بين المعلمات؟">
            <SplitBar segments={statusSegments} />
          </ChartCard>

          <ChartCard
            title="توزيع الفراغات"
            question="كم معلمة تعاني فراغات متفرقة في جدولها؟"
          >
            <Histogram buckets={gapBuckets} unitAr="عدد الفراغات الأسبوعية (المحور) · عدد المعلمات (الارتفاع)" />
          </ChartCard>
        </div>

        <ChartCard title="الحصص حسب المادة" question="أين يتركّز الحمل الدراسي؟">
          <BarList data={subjectData} maxItems={12} />
        </ChartCard>

        <ChartCard title="الحصص حسب الصف" question="هل الأعباء موزّعة بين الصفوف كما تقتضي الخطة؟">
          <BarList data={gradeData} />
        </ChartCard>

        <ChartCard
          title="توزيع الحصص على فترات اليوم"
          question="هل الحصص الأخيرة مكتظة أم فارغة مقارنةً بالأولى؟"
        >
          <Histogram buckets={periodLoad} unitAr="رقم الحصة داخل اليوم (المحور) · عدد الحصص (الارتفاع)" />
        </ChartCard>

        <ChartCard title="الحصص حسب اليوم" question="هل يوم بعينه أثقل من غيره؟">
          <BarList data={dayData} />
        </ChartCard>

        <ChartCard
          title="عدالة الحصص الأولى والأخيرة"
          question="هل تتحمّل معلمة بعينها أطراف اليوم أكثر من زميلاتها؟"
        >
          <BarList
            data={firstLastData}
            maxItems={15}
            formatValue={(n) => `${n}`}
            emptyAr="لا توجد حصص لتحليل عدالتها."
          />
        </ChartCard>

        <ChartCard
          title="تغيّر جودة الجدول عبر النسخ"
          question="هل تحسّن الجدول أم تراجع مع كل تعديل؟"
        >
          <Sparkline
            points={timeline.map((v) => v.qualityScore ?? 0)}
            labels={timeline.map((v) => v.label)}
            formatValue={(n) => `${n}%`}
          />
        </ChartCard>
      </div>

      <Card className="mt-3">
        <CardHeader
          title="من أين فُقدت درجة الجودة؟"
          subtitle="البنود الثمانية الموزونة التي تُحسب منها الدرجة"
        />
        <ul className="divide-y divide-line">
          {scoreDetail.map((line) => (
            <li key={line.labelAr} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
              <span className="w-40 shrink-0 text-xs font-medium text-ink">{line.labelAr}</span>
              {/* عرض ثابت: أشرطة بأعرضة مختلفة لا يمكن مقارنتها بصريًا. */}
              <span className="h-1.5 w-32 shrink-0 overflow-hidden rounded-full bg-surface-sunken">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${((line.of - line.lost) / Math.max(0.1, line.of)) * 100}%`,
                    background: line.lost > line.of / 2 ? 'var(--warn)' : 'var(--ok)',
                  }}
                />
              </span>
              <span className="tabular w-24 shrink-0 text-left text-2xs text-ink-muted">
                −{line.lost} من {line.of}
              </span>
              <span className="w-full flex-1 text-2xs leading-relaxed text-ink-faint sm:w-auto">
                {line.detailAr}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
