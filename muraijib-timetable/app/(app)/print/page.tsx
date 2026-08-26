'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useSchedule } from '@/lib/state/schedule-provider';
import { Button, Card, CardHeader, Field, Select } from '@/components/ui';
import { PageHeader } from '@/components/layout/page-header';
import { Icon } from '@/components/layout/icon';
import {
  ClassSheet,
  ConflictsSheet,
  MasterSheet,
  TeacherSheet,
  WorkloadSheet,
  type SheetChrome,
} from '@/components/print/sheets';
import { exportSheetsToExcel, exportSheetsToCsv } from '@/lib/print/export';
import { cn, formatDateAr, matchesAr } from '@/lib/utils';
import { LANG_LABEL, useDisplayLang, type DisplayLang } from '@/lib/i18n';

type Kind =
  | 'teacher'
  | 'all-teachers'
  | 'class'
  | 'grade'
  | 'master'
  | 'workload'
  | 'conflicts';

type Paper = 'a4-portrait' | 'a4-landscape' | 'a3-landscape';

const KINDS: Array<{ id: Kind; label: string; icon: string; hint: string; paper: Paper }> = [
  { id: 'teacher', label: 'جدول معلمة', icon: 'User', hint: 'ورقة واحدة لمعلمة محدّدة', paper: 'a4-landscape' },
  { id: 'all-teachers', label: 'جداول جميع المعلمات', icon: 'Users', hint: 'ورقة لكل معلمة', paper: 'a4-landscape' },
  { id: 'class', label: 'جدول شعبة', icon: 'School', hint: 'ورقة واحدة لشعبة محدّدة', paper: 'a4-landscape' },
  { id: 'grade', label: 'جداول صف كامل', icon: 'Layers', hint: 'ورقة لكل شعبة في الصف', paper: 'a4-landscape' },
  { id: 'master', label: 'الجدول الرئيسي', icon: 'Table2', hint: 'كل الشعب في ورقة واحدة عريضة', paper: 'a3-landscape' },
  { id: 'workload', label: 'تقرير الأنصبة', icon: 'Gauge', hint: 'جدول أنصبة جميع المعلمات', paper: 'a4-portrait' },
  { id: 'conflicts', label: 'تقرير التعارضات', icon: 'TriangleAlert', hint: 'كل ملاحظات الفحص', paper: 'a4-portrait' },
];

const PAPERS: Array<{ id: Paper; label: string; css: string; widthMm: number }> = [
  { id: 'a4-portrait', label: 'A4 طولي', css: 'A4 portrait', widthMm: 210 },
  { id: 'a4-landscape', label: 'A4 عرضي', css: 'A4 landscape', widthMm: 297 },
  { id: 'a3-landscape', label: 'A3 عرضي', css: 'A3 landscape', widthMm: 420 },
];

export default function PrintCenterPage() {
  const params = useSearchParams();
  const { snapshot, index, health, versions } = useSchedule();
  const { lang, setLang } = useDisplayLang();

  const [kind, setKind] = React.useState<Kind>((params.get('kind') as Kind) ?? 'teacher');
  const [entityId, setEntityId] = React.useState<string>(params.get('id') ?? '');
  const [paper, setPaper] = React.useState<Paper>('a4-landscape');
  const [hideFooter, setHideFooter] = React.useState(false);
  const [query, setQuery] = React.useState('');

  // ورق كل نوع يختلف: الجدول الرئيسي لا يصلح على A4 طولي.
  React.useEffect(() => {
    setPaper(KINDS.find((k) => k.id === kind)?.paper ?? 'a4-landscape');
  }, [kind]);

  React.useEffect(() => {
    if (!snapshot) return;
    if (kind === 'teacher' && !snapshot.teachers.some((t) => t.id === entityId)) {
      setEntityId(snapshot.teachers[0]?.id ?? '');
    } else if (kind === 'class' && !snapshot.sections.some((s) => s.id === entityId)) {
      setEntityId(snapshot.sections[0]?.id ?? '');
    } else if (kind === 'grade' && !snapshot.grades.some((g) => g.id === entityId)) {
      setEntityId(snapshot.grades[0]?.id ?? '');
    }
  }, [kind, snapshot, entityId]);

  if (!snapshot || !index || !health) return null;

  const current = versions.find((v) => v.isCurrent);
  const chrome: SheetChrome = {
    yearLabel: snapshot.week.yearLabel,
    versionLabel: current?.label ?? 'v1.0',
    issuedAt: formatDateAr(new Date().toISOString()),
    hideFooter,
    lang,
  };

  const paperSpec = PAPERS.find((p) => p.id === paper)!;

  const sheets = (() => {
    switch (kind) {
      case 'teacher':
        return entityId ? [<TeacherSheet key={entityId} index={index} teacherId={entityId} chrome={chrome} />] : [];
      case 'all-teachers':
        return snapshot.teachers
          .filter((t) => t.status !== 'transferred')
          .map((t) => <TeacherSheet key={t.id} index={index} teacherId={t.id} chrome={chrome} />);
      case 'class':
        return entityId ? [<ClassSheet key={entityId} index={index} sectionId={entityId} chrome={chrome} />] : [];
      case 'grade':
        return snapshot.sections
          .filter((s) => s.gradeId === entityId && s.isActive)
          .map((s) => <ClassSheet key={s.id} index={index} sectionId={s.id} chrome={chrome} />);
      case 'master':
        return [<MasterSheet key="master" index={index} chrome={chrome} />];
      case 'workload':
        return [<WorkloadSheet key="workload" index={index} chrome={chrome} />];
      case 'conflicts':
        return [<ConflictsSheet key="conflicts" index={index} health={health} chrome={chrome} />];
    }
  })();

  const selector = (() => {
    if (kind === 'teacher') {
      const list = snapshot.teachers.filter((t) => !query || matchesAr(t.nameAr, query));
      return { label: 'المعلمة', options: list.map((t) => ({ id: t.id, label: t.nameAr })), searchable: true };
    }
    if (kind === 'class') {
      const list = snapshot.sections.filter((s) => !query || matchesAr(s.label, query));
      return { label: 'الشعبة', options: list.map((s) => ({ id: s.id, label: `الشعبة ${s.label}` })), searchable: true };
    }
    if (kind === 'grade') {
      return {
        label: 'الصف',
        options: snapshot.grades.map((g) => ({ id: g.id, label: g.nameAr })),
        searchable: false,
      };
    }
    return null;
  })();

  return (
    <div className="mx-auto max-w-[100rem]">
      {/* حجم الورق يُحقن كقاعدة @page حقيقية — لا محاكاة بصرية فقط. */}
      <style>{`@media print { @page { size: ${paperSpec.css}; margin: 10mm; } }`}</style>

      <div className="no-print">
        <PageHeader
          title="مركز الطباعة والمشاركة"
          description="المطبوعة وثيقة رسمية بتصميم مستقل عن شاشة التحرير: ترويسة المدرسة، وتذييل بتاريخ الإصدار ورقم النسخة، وحدود واضحة لا تنقسم بين الصفحات."
          actions={
            <>
              <Button size="sm" variant="secondary" onClick={() => exportSheetsToCsv(kind, index, health)}>
                <Icon name="FileText" className="h-3.5 w-3.5" />
                CSV
              </Button>
              <Button size="sm" variant="secondary" onClick={() => exportSheetsToExcel(kind, index, health)}>
                <Icon name="Sheet" className="h-3.5 w-3.5" />
                Excel
              </Button>
              <Button size="sm" variant="primary" onClick={() => window.print()}>
                <Icon name="Printer" className="h-3.5 w-3.5" />
                طباعة ({sheets.length} ورقة)
              </Button>
            </>
          }
        />

        <div className="mb-4 grid gap-4 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <div className="space-y-3">
            <Card>
              <CardHeader title="ما الذي تريد طباعته؟" />
              <ul className="p-2">
                {KINDS.map((option) => (
                  <li key={option.id}>
                    <button
                      onClick={() => setKind(option.id)}
                      className={cn(
                        'flex w-full items-start gap-2.5 rounded px-2.5 py-2 text-right transition-colors',
                        kind === option.id
                          ? 'bg-brand-tint text-brand-ink'
                          : 'text-ink-muted hover:bg-surface-sunken',
                      )}
                    >
                      <Icon name={option.icon} className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold">{option.label}</span>
                        <span className="block text-2xs opacity-80">{option.hint}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardHeader title="خيارات الورقة" />
              <div className="space-y-3 p-4">
                {selector && (
                  <>
                    {selector.searchable && (
                      <Field label="بحث">
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="اكتب للتصفية…"
                          className="input"
                        />
                      </Field>
                    )}
                    <Field label={selector.label}>
                      <Select value={entityId} onChange={(e) => setEntityId(e.target.value)}>
                        {selector.options.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </>
                )}

                <Field label="لغة الجدول" hint="الأسماء تُطبع بالعربية والإنجليزية معًا افتراضيًا">
                  <Select value={lang} onChange={(e) => setLang(e.target.value as DisplayLang)}>
                    {(['both', 'ar', 'en'] as DisplayLang[]).map((option) => (
                      <option key={option} value={option}>
                        {LANG_LABEL[option]}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="حجم الورق">
                  <Select value={paper} onChange={(e) => setPaper(e.target.value as Paper)}>
                    {PAPERS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>

                <label className="flex items-center gap-2 text-xs text-ink">
                  <input
                    type="checkbox"
                    checked={!hideFooter}
                    onChange={(e) => setHideFooter(!e.target.checked)}
                    className="h-3.5 w-3.5 accent-[var(--brand-primary)]"
                  />
                  إظهار التذييل (تاريخ الإصدار ورقم النسخة)
                </label>

                <p className="rounded border border-line bg-surface-sunken px-2.5 py-2 text-2xs leading-relaxed text-ink-muted">
                  شعار الوزارة يظهر في الترويسة تلقائيًا فور تزويد المشروع بالملف الرسمي — لم يُرسم شعار
                  تقريبي في هذه النسخة.
                </p>
              </div>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <CardHeader
              title="معاينة الطباعة"
              subtitle={`${paperSpec.label} · ${sheets.length} ورقة`}
            />
            <div className="max-h-[70vh] overflow-auto bg-surface-sunken p-5">
              {sheets.length === 0 ? (
                <p className="py-10 text-center text-xs text-ink-muted">
                  اختر عنصرًا لعرض معاينته.
                </p>
              ) : (
                <div className="mx-auto space-y-5" style={{ width: `${paperSpec.widthMm}mm`, maxWidth: '100%' }}>
                  {sheets.slice(0, 4).map((sheet, i) => (
                    <div
                      key={i}
                      className="bg-white p-[10mm] text-black shadow-raised"
                      style={{ minHeight: paper === 'a4-portrait' ? '297mm' : '210mm' }}
                    >
                      {sheet}
                    </div>
                  ))}
                  {sheets.length > 4 && (
                    <p className="py-3 text-center text-2xs text-ink-muted">
                      تُعرض أول 4 أوراق في المعاينة — الطباعة تشمل {sheets.length} ورقة كاملة.
                    </p>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* نسخة الطباعة الفعلية: مخفية على الشاشة، وهي ما يخرج على الورق. */}
      <div className="print-only bg-white text-black">{sheets}</div>
    </div>
  );
}
