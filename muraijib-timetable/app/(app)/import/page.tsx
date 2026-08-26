'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useSchedule } from '@/lib/state/schedule-provider';
import { downloadImportTemplate, parseFile, type ParsedSheet } from '@/lib/import/parse';
import { FIELDS, missingRequired, suggestMapping, type ColumnMapping } from '@/lib/import/map';
import { buildFromRows, type ImportReport } from '@/lib/import/build';
import type { ScheduleSnapshot } from '@/lib/domain/types';
import { runHealthCheck } from '@/lib/engine/conflicts';
import { Badge, Button, Card, CardHeader, Field, Input, Select } from '@/components/ui';
import { PageHeader } from '@/components/layout/page-header';
import { Icon } from '@/components/layout/icon';
import { cn } from '@/lib/utils';

type Step = 'upload' | 'map' | 'review' | 'done';

const STEPS: Array<{ id: Step; label: string }> = [
  { id: 'upload', label: 'رفع الملف' },
  { id: 'map', label: 'مطابقة الأعمدة' },
  { id: 'review', label: 'تقرير التدقيق' },
  { id: 'done', label: 'الاعتماد' },
];

export default function ImportPage() {
  const router = useRouter();
  const { replaceAll, snapshot } = useSchedule();

  const [step, setStep] = React.useState<Step>('upload');
  const [fileName, setFileName] = React.useState('');
  const [sheets, setSheets] = React.useState<ParsedSheet[]>([]);
  const [sheetIndex, setSheetIndex] = React.useState(0);
  const [mapping, setMapping] = React.useState<ColumnMapping>({});
  const [options, setOptions] = React.useState({
    yearLabel: '2026–2027',
    schoolNameAr: 'مدرسة مريجب',
    assemblyFirst: true,
    breakAfter: 3,
  });
  const [built, setBuilt] = React.useState<{ snapshot: ScheduleSnapshot | null; report: ImportReport } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const sheet = sheets[sheetIndex];

  const onFile = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      const parsed = await parseFile(file);
      const usable = parsed.sheets.filter((s) => s.headers.length > 0 && s.rows.length > 0);
      if (usable.length === 0) {
        setError('لم أجد أي بيانات قابلة للقراءة في هذا الملف. تأكد من وجود صف عناوين وصفوف بيانات تحته.');
        setBusy(false);
        return;
      }
      setFileName(parsed.fileName);
      setSheets(usable);
      setSheetIndex(0);
      setMapping(suggestMapping(usable[0].headers));
      setStep('map');
    } catch {
      setError('تعذّرت قراءة الملف. الصيغ المدعومة: XLSX و CSV.');
    }
    setBusy(false);
  };

  const runBuild = () => {
    if (!sheet) return;
    setBuilt(buildFromRows(sheet.rows, mapping, options));
    setStep('review');
  };

  const commit = async () => {
    if (!built?.snapshot) return;
    setBusy(true);
    setError(null);
    const result = await replaceAll(
      built.snapshot,
      `استيراد الجدول المرجعي من الملف «${fileName}»`,
    );
    setBusy(false);
    if (result.ok) setStep('done');
    else setError(result.errorAr ?? 'تعذّر اعتماد الاستيراد.');
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="استيراد بيانات المدرسة"
        description="يُقرأ الملف ويُدقَّق ويُعرض عليك بالكامل قبل أي كتابة. لا يُستورد صف خاطئ بصمت."
        actions={
          <Button size="sm" variant="secondary" onClick={() => void downloadImportTemplate()}>
            <Icon name="Download" className="h-3.5 w-3.5" />
            تنزيل قالب الاستيراد
          </Button>
        }
      />

      <ol className="mb-5 flex flex-wrap items-center gap-1.5">
        {STEPS.map((s, i) => {
          const currentIndex = STEPS.findIndex((x) => x.id === step);
          const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'todo';
          return (
            <li key={s.id} className="flex items-center gap-1.5">
              <span
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1 text-2xs font-medium',
                  state === 'current' && 'bg-brand text-ink-invert',
                  state === 'done' && 'bg-ok-soft text-ok',
                  state === 'todo' && 'bg-surface-sunken text-ink-faint',
                )}
              >
                {state === 'done' ? <Icon name="Check" className="h-3 w-3" /> : <span className="tabular">{i + 1}</span>}
                {s.label}
              </span>
              {i < STEPS.length - 1 && <Icon name="ChevronLeft" className="h-3 w-3 text-ink-faint" />}
            </li>
          );
        })}
      </ol>

      {error && (
        <p className="mb-4 rounded border border-danger/30 bg-danger-soft px-4 py-2.5 text-xs leading-relaxed text-danger">
          {error}
        </p>
      )}

      {step === 'upload' && <UploadStep busy={busy} onFile={onFile} />}

      {step === 'map' && sheet && (
        <Card>
          <CardHeader
            title={`مطابقة أعمدة «${fileName}»`}
            subtitle={`${sheet.rows.length} صف بيانات · ${sheet.headers.length} عمود`}
            action={
              sheets.length > 1 && (
                <Select
                  value={String(sheetIndex)}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setSheetIndex(next);
                    setMapping(suggestMapping(sheets[next].headers));
                  }}
                  className="w-auto"
                >
                  {sheets.map((s, i) => (
                    <option key={s.name} value={i}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              )
            }
          />

          <div className="space-y-4 p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {FIELDS.map((field) => (
                <Field key={field.id} label={`${field.labelAr}${field.required ? ' *' : ''}`} hint={field.hintAr}>
                  <Select
                    value={mapping[field.id] === undefined ? '' : String(mapping[field.id])}
                    onChange={(e) =>
                      setMapping({
                        ...mapping,
                        [field.id]: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                  >
                    <option value="">— بلا عمود —</option>
                    {sheet.headers.map((header, i) => (
                      <option key={i} value={i}>
                        {header || `عمود ${i + 1}`}
                      </option>
                    ))}
                  </Select>
                </Field>
              ))}
            </div>

            <div className="rounded border border-line">
              <p className="border-b border-line bg-surface-sunken px-3 py-1.5 text-2xs font-semibold text-ink">
                معاينة أول 5 صفوف بعد المطابقة
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-right">
                  <thead>
                    <tr className="border-b border-line">
                      {FIELDS.filter((f) => mapping[f.id] !== undefined).map((f) => (
                        <th key={f.id} className="table-head px-3 py-1.5">
                          {f.labelAr}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b border-line last:border-0">
                        {FIELDS.filter((f) => mapping[f.id] !== undefined).map((f) => (
                          <td key={f.id} className="px-3 py-1.5 text-xs text-ink">
                            {row[mapping[f.id]!] || <span className="text-ink-faint">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="العام الأكاديمي">
                <Input
                  value={options.yearLabel}
                  onChange={(e) => setOptions({ ...options, yearLabel: e.target.value })}
                />
              </Field>
              <Field label="اسم المدرسة">
                <Input
                  value={options.schoolNameAr}
                  onChange={(e) => setOptions({ ...options, schoolNameAr: e.target.value })}
                />
              </Field>
              <Field label="الفسحة بعد الحصة" hint="0 = بلا فسحة">
                <Input
                  type="number"
                  min={0}
                  max={8}
                  value={options.breakAfter}
                  onChange={(e) => setOptions({ ...options, breakAfter: Number(e.target.value) })}
                />
              </Field>
              <label className="flex items-end gap-2 pb-2 text-xs text-ink">
                <input
                  type="checkbox"
                  checked={options.assemblyFirst}
                  onChange={(e) => setOptions({ ...options, assemblyFirst: e.target.checked })}
                  className="h-3.5 w-3.5 accent-[var(--brand-primary)]"
                />
                يبدأ اليوم بالطابور
              </label>
            </div>

            {missingRequired(mapping).length > 0 && (
              <p className="rounded border border-warn/30 bg-warn-soft px-3 py-2 text-xs text-warn">
                حدّد الأعمدة المطلوبة قبل المتابعة:{' '}
                {missingRequired(mapping).map((f) => f.labelAr).join('، ')}.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
            <Button variant="ghost" onClick={() => setStep('upload')}>
              رجوع
            </Button>
            <Button variant="primary" onClick={runBuild} disabled={missingRequired(mapping).length > 0}>
              تدقيق البيانات
              <Icon name="ArrowLeft" className="h-3.5 w-3.5" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'review' && built && (
        <ReviewStep
          report={built.report}
          snapshot={built.snapshot}
          busy={busy}
          onBack={() => setStep('map')}
          onCommit={commit}
        />
      )}

      {step === 'done' && (
        <Card className="px-6 py-10 text-center">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ok-soft text-ok">
            <Icon name="CheckCheck" className="h-5 w-5" />
          </span>
          <p className="text-sm font-bold text-ink">اعتُمد الجدول المرجعي</p>
          <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-ink-muted">
            حُفظ الجدول المستورد كنسخة أساس (Baseline v1.0)، واستُبدلت البيانات التجريبية. كل تعديل من الآن
            سيُنشئ نسخة جديدة فوقها ويُسجَّل في سجل التغييرات.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="primary" onClick={() => router.push('/conflicts')}>
              تشغيل فحص الجدول
            </Button>
            <Button variant="secondary" onClick={() => router.push('/timetable')}>
              فتح مساحة العمل
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function UploadStep({ busy, onFile }: { busy: boolean; onFile: (file: File) => void }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Card>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) onFile(file);
          }}
          className={cn(
            'flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-16 text-center transition-colors',
            dragging ? 'border-brand bg-brand-tint' : 'border-line',
          )}
        >
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunken text-ink-muted">
            <Icon name="Upload" className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-ink">أفلت ملف الجدول هنا</p>
          <p className="mt-1 text-xs text-ink-muted">أو اختر ملفًا من جهازك — XLSX أو CSV</p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
            }}
          />
          <Button variant="primary" className="mt-4" onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? 'جارٍ القراءة…' : 'اختيار ملف'}
          </Button>
        </div>
      </Card>

      <Card className="h-fit">
        <CardHeader title="الصيغة المتوقعة" />
        <div className="space-y-3 p-4 text-xs leading-relaxed text-ink-muted">
          <p>
            صف واحد لكل حصة، بأعمدة: <span className="font-medium text-ink">اليوم · الحصة · الشعبة · المادة · المعلمة</span>.
            العناوين لا يلزم أن تكون بهذه الأسماء حرفيًا — يقترح النظام المطابقة ثم تراجعها.
          </p>
          <p>
            إن كان جدولك بصيغة شبكة (الأيام في الأعمدة والحصص في الصفوف)، حوّله إلى الصيغة الطولية باستخدام
            القالب أعلاه. هذه النسخة لا تقرأ الشبكات تلقائيًا.
          </p>
          <p className="rounded border border-line bg-surface-sunken px-2.5 py-2">
            تُستخرج المعلمات والمواد والصفوف والشعب وخطة المواد من الملف نفسه — لا حاجة لإدخالها يدويًا أولًا.
          </p>
        </div>
      </Card>
    </div>
  );
}

function ReviewStep({
  report,
  snapshot,
  busy,
  onBack,
  onCommit,
}: {
  report: ImportReport;
  snapshot: ScheduleSnapshot | null;
  busy: boolean;
  onBack: () => void;
  onCommit: () => void;
}) {
  const errors = report.issues.filter((i) => i.severity === 'error');
  const warnings = report.issues.filter((i) => i.severity === 'warning');
  const health = snapshot ? runHealthCheck(snapshot) : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="تقرير تدقيق البيانات"
          subtitle="ما تم التعرّف عليه، وما رُفض ولماذا — قبل أي كتابة"
          action={
            errors.length > 0 ? (
              <Badge tone="danger">{errors.length} مشكلة تمنع استيراد صفوف</Badge>
            ) : (
              <Badge tone="ok">لا أخطاء مانعة</Badge>
            )
          }
        />
        <div className="grid grid-cols-2 gap-px border-y border-line bg-line sm:grid-cols-4">
          <Cell label="صفوف الملف" value={report.totalRows} />
          <Cell label="صفوف مقبولة" value={report.acceptedRows} tone="ok" />
          <Cell label="صفوف مرفوضة" value={report.rejectedRows} tone={report.rejectedRows ? 'danger' : undefined} />
          <Cell label="تحذيرات" value={warnings.length} tone={warnings.length ? 'warn' : undefined} />
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Recognized label="المعلمات" items={report.recognized.teachers} />
          <Recognized label="المواد" items={report.recognized.subjects} />
          <Recognized label="الشعب" items={report.recognized.sections} />
          <Recognized label="الصفوف" items={report.recognized.grades} />
          <Recognized label="أيام الدراسة" items={report.recognized.days} />
          <Recognized label="الغرف الخاصة" items={report.recognized.rooms} />
        </div>

        <div className="border-t border-line px-5 py-3">
          <p className="text-2xs text-ink-muted">
            عدد الحصص لكل يوم:{' '}
            {Object.entries(report.recognized.periodsPerDay)
              .map(([day, count]) => `${day} (${count})`)
              .join(' · ')}
          </p>
        </div>
      </Card>

      {report.issues.length > 0 && (
        <Card>
          <CardHeader
            title={`${report.issues.length} ملاحظة على البيانات`}
            subtitle="الأخطاء تمنع استيراد صفوفها؛ التحذيرات تُستورد ويمكن معالجتها لاحقًا"
          />
          <ul className="max-h-80 divide-y divide-line overflow-y-auto">
            {report.issues.slice(0, 80).map((issue, i) => (
              <li key={i} className="flex items-start gap-3 px-5 py-2.5">
                <Badge tone={issue.severity === 'error' ? 'danger' : 'warn'} className="mt-0.5 shrink-0">
                  {issue.severity === 'error' ? 'خطأ' : 'تحذير'}
                </Badge>
                {issue.rowNumber > 0 && (
                  <span className="tabular shrink-0 text-2xs text-ink-faint">صف {issue.rowNumber}</span>
                )}
                <span className="min-w-0 flex-1 text-xs leading-relaxed text-ink">{issue.messageAr}</span>
              </li>
            ))}
            {report.issues.length > 80 && (
              <li className="px-5 py-2 text-2xs text-ink-faint">و{report.issues.length - 80} ملاحظة أخرى…</li>
            )}
          </ul>
        </Card>
      )}

      {health && (
        <Card>
          <CardHeader
            title="فحص الجدول المستورد"
            subtitle="نتيجة تشغيل محرك القيود على البيانات كما ستُحفظ"
          />
          <div className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4">
            <Cell label="درجة الجودة" value={health.valid ? `${health.score}%` : 'غير صالح'} tone={health.valid ? 'ok' : 'danger'} />
            <Cell label="تعارضات معلمات" value={health.totals.teacherConflicts} tone={health.totals.teacherConflicts ? 'danger' : undefined} />
            <Cell label="حصص بلا معلمة" value={health.totals.unassigned} tone={health.totals.unassigned ? 'warn' : undefined} />
            <Cell label="حصص ناقصة" value={health.totals.missingLessons} tone={health.totals.missingLessons ? 'warn' : undefined} />
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="ghost" onClick={onBack} disabled={busy}>
          رجوع للمطابقة
        </Button>
        <Button variant="primary" onClick={onCommit} disabled={busy || !snapshot}>
          {busy ? 'جارٍ الاعتماد…' : `اعتماد الاستيراد (${report.acceptedRows} حصة)`}
        </Button>
      </div>

      {!snapshot && (
        <p className="rounded border border-danger/30 bg-danger-soft px-4 py-2.5 text-xs text-danger">
          لم يُقبل أي صف من الملف، فلا يوجد ما يُستورد. راجع المطابقة والملاحظات أعلاه.
        </p>
      )}
    </div>
  );
}

function Cell({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'ok' | 'warn' | 'danger';
}) {
  return (
    <div className="bg-surface px-4 py-3">
      <p className="text-2xs text-ink-muted">{label}</p>
      <p
        className={cn(
          'tabular mt-0.5 text-xl font-bold leading-none',
          tone === 'ok' && 'text-ok',
          tone === 'warn' && 'text-warn',
          tone === 'danger' && 'text-danger',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Recognized({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-ink">
        {label}
        <Badge tone={items.length ? 'brand' : 'neutral'}>{items.length}</Badge>
      </p>
      {items.length === 0 ? (
        <p className="text-2xs text-ink-faint">لم يُتعرَّف على أي عنصر.</p>
      ) : (
        <p className="text-2xs leading-relaxed text-ink-muted">
          {items.slice(0, 12).join('، ')}
          {items.length > 12 && ` وغيرها (${items.length - 12})`}
        </p>
      )}
    </div>
  );
}
