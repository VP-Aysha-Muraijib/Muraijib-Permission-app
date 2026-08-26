import type { Lesson } from '@/lib/domain/types';
import type { SnapshotIndex } from '@/lib/engine/snapshot';
import { slotKey } from '@/lib/engine/snapshot';
import { buildGrid, periodOf, type GridRow } from '@/lib/engine/grid';
import { BRAND } from '@/lib/brand';

/**
 * النظام البصري للوثائق المطبوعة.
 *
 * المبدأ الحاكم: الجدول هو المحتوى، والترويسة تدعمه ولا تنافسه. لذلك تُقاس
 * الترويسة بالمِلّيمتر لا بالذوق، وتُحصر الأوزان في 400/500/600 — الوزن الثقيل
 * هو ما يجعل الصفحة تبدو لوحة تحكّم لا وثيقة — ويُترك اللون الخمري لخطّين
 * رفيعين لا أكثر.
 *
 * كل ورقة في المنظومة نسخة من هذا القالب لا تصميم مستقل يشبهه: المقاسات
 * والحدود والمسافات معرَّفة هنا مرة واحدة، ولا يُمرَّر إلى القالب سوى البيانات.
 * وارتفاعا الترويسة وشريط البيانات مثبَّتان بالبكسل مع قصّ النصوص عند الحد،
 * فاسم معلمة أطول أو مادتان بدل مادة لا يزحزحان الشبكة سطرًا واحدًا.
 */

/* ── الارتفاعات ──
   محسوبة على ورقة A4 عرضية بهامش 7mm رأسيًا: الارتفاع القابل للطباعة 196mm.
   1mm ≈ 3.78px. الترويسة 19mm وشريط البيانات 13.5mm — أي 17% للهوية مجتمعةً
   والباقي للجدول والاعتماد. */
const HEADER_H = 'h-[72px]';
const INFO_H = 'h-[51px]';
const LOGO_H = 'h-[32px]';
const GRID_GAP = 'pt-[17px]';

const line = 'border-[0.6px] border-[color:var(--doc-line)]';

/* ────────── ١ · الترويسة المؤسسية ────────── */

/**
 * ثلاث مناطق أفقية منخفضة الارتفاع: الهوية المؤسسية يمينًا، وهوية الوثيقة في
 * المنتصف، والعام الأكاديمي يسارًا.
 *
 * شعار واحد لا مجموعة: اللوكاب الرسمي الموحّد للوزارة كما هو. المدرسة جهة
 * تابعة لا علامة مستقلة، فاسمها نصّ تحت اسم الوزارة لا شعار ثانٍ.
 */
export function InstitutionalHeader({
  titleAr,
  titleEn,
  yearLabel,
}: {
  titleAr: string;
  titleEn?: string;
  yearLabel: string;
}) {
  return (
    <header
      className={`${HEADER_H} flex shrink-0 items-center justify-between gap-6 border-b-[0.6px] border-[color:var(--doc-line)]`}
    >
      {/* يمينًا: الوزارة فالمدرسة */}
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        {BRAND.ministryLogo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={BRAND.ministryLogo}
            alt={BRAND.ministryNameAr}
            className={`${LOGO_H} w-auto shrink-0 object-contain`}
          />
        )}
        <div className="min-w-0 text-right leading-[1.3]">
          <p className="truncate text-[12.5px] font-semibold">{BRAND.ministryNameAr}</p>
          <p className="latin truncate text-[9px] text-[color:var(--doc-muted)]">
            {BRAND.ministryNameEn}
          </p>
          <p className="truncate text-[11px] font-medium">{BRAND.schoolNameAr}</p>
          <p className="latin truncate text-[9px] text-[color:var(--doc-muted)]">
            {BRAND.schoolNameEn}
          </p>
        </div>
      </div>

      {/* المنتصف: هوية الوثيقة */}
      <div className="min-w-0 flex-1 text-center leading-[1.3]">
        <h1 className="truncate text-[17px] font-semibold">{titleAr}</h1>
        {/* الخمري هنا خطّ قصير لا أكثر — لمسة انتماء لا عنصر جذب. */}
        <span
          aria-hidden
          className="mx-auto mb-[3px] mt-[5px] block h-[1.5px] w-[26px] bg-[color:var(--doc-accent)]"
        />
        {titleEn && (
          <p className="latin truncate text-[10px] text-[color:var(--doc-muted)]">{titleEn}</p>
        )}
      </div>

      {/* يسارًا: العام الأكاديمي */}
      <div className="shrink-0 text-left leading-[1.3]">
        <p className="text-[9.5px] text-[color:var(--doc-muted)]">العام الأكاديمي</p>
        <p className="latin text-[8.5px] text-[color:var(--doc-muted)]">Academic Year</p>
        <p className="latin text-[15px] font-semibold">{yearLabel}</p>
      </div>
    </header>
  );
}

/* ────────── ٢ · شريط بيانات المعلمة ────────── */

export interface InfoItem {
  label: string;
  labelEn?: string;
  value: string;
  /** القيم الرقمية تُعزل اتجاهيًا حتى لا ينقلب ترتيبها داخل السطر العربي. */
  latin?: boolean;
}

export function TeacherInfoStrip({
  nameAr,
  nameEn,
  items,
}: {
  nameAr?: string;
  nameEn?: string;
  items?: InfoItem[];
}) {
  return (
    <section
      className={`${INFO_H} flex shrink-0 items-center justify-between gap-6 border-b-[0.6px] border-[color:var(--doc-line)]`}
    >
      <div className="min-w-0 leading-[1.3]">
        {nameAr && <p className="truncate text-[16.5px] font-semibold">{nameAr}</p>}
        {nameEn && (
          <p className="latin truncate text-[9.5px] text-[color:var(--doc-muted)]">{nameEn}</p>
        )}
      </div>

      {items && items.length > 0 && (
        <dl className="flex shrink-0 items-center">
          {items.map((item, i) => (
            <div
              key={item.label}
              className={
                i > 0
                  ? 'ms-4 border-s-[0.6px] border-[color:var(--doc-line)] ps-4 leading-[1.3]'
                  : 'leading-[1.3]'
              }
            >
              {/* الفجوة عبر flex لا عبر هامش: الوسم اللاتيني معزول اتجاهيًا،
                  فهامشه المنطقي ينقلب ويلتصق بالعربية. */}
              <dt className="flex items-baseline gap-1 text-[9px] text-[color:var(--doc-muted)]">
                <span>{item.label}</span>
                {item.labelEn && <span className="latin">{item.labelEn}</span>}
              </dt>
              <dd
                className={`truncate text-[13.5px] font-semibold ${item.latin ? 'latin' : ''}`}
                title={item.value}
              >
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

/* ────────── ٣ · الشبكة ────────── */

/**
 * «الحصة الأولى» في رأس عمود ضيّق تُقرأ مرتين: مرة للكلمة المكرّرة في كل عمود
 * ومرة للترتيب. تُختصر إلى «الأولى» ويُكتب «الحصص» مرة واحدة في زاوية الشبكة.
 */
function shortPeriodLabel(row: GridRow): string {
  return row.labelAr.replace(/^الحصة\s+/, '');
}

/**
 * أسماء الفواصل الزمنية تُضغط لتسع عمودًا ضيقًا بلا التفاف:
 * «الصلاة والفسحة» ← «صلاة + فسحة». قاعدة عامة على أداة التعريف وواو العطف،
 * لا قائمة أسماء مكتوبة بأعيانها.
 */
function shortBreakLabel(labelAr: string): string[] {
  const parts = labelAr.split(' و').map((part) => part.replace(/^ال/, ''));
  return parts.map((part, i) => (i === 0 ? part : `+ ${part}`));
}

/**
 * عمود الفاصل أضيق من أن يسع «13:05 – 13:20» في سطر، فتتسرّب النهاية فوق
 * العمود المجاور. يُكتب الطرفان سطرين — أضيق وأوضح من شرطة تفصلهما.
 */
function splitTimeRange(timeRange: string): string[] {
  return timeRange.split(/\s*[–-]\s*/).filter(Boolean);
}

/**
 * رقم الشعبة نصّ لاتيني في الغالب («5/1») فيُعزل اتجاهيًا، لكن بعض الشعب
 * تحمل وصفًا عربيًا («6/متقدّم») والعزل يقلبها إلى «متقدّم/6». يُفحص المحتوى
 * لا السياق.
 */
function isLatinRun(text: string): boolean {
  return !/[\u0600-\u06FF]/.test(text);
}

export function TimetableGrid({
  index,
  lessons,
  context,
  /** تُخفى المادة داخل الخلايا حين تكون واحدة ومذكورة في شريط البيانات. */
  showSubjectInCells = true,
}: {
  index: SnapshotIndex;
  lessons: Lesson[];
  context: 'teacher' | 'class';
  showSubjectInCells?: boolean;
}) {
  const grid = buildGrid(index.snapshot.week);
  const bySlot = new Map(lessons.map((l) => [slotKey(l.dayId, l.periodIndex), l]));

  const lessonCols = grid.rows.filter((r) => r.kind === 'lesson').length;
  const breakCols = grid.rows.length - lessonCols;
  /* الفواصل أضيق كثيرًا من الحصص، وعمود اليوم ثابت، والباقي يُقسَّم بالتساوي. */
  const dayPct = 9.5;
  const breakPct = 4.4;
  const lessonPct = (100 - dayPct - breakCols * breakPct) / Math.max(1, lessonCols);

  return (
    <table className="w-full table-fixed border-collapse text-center">
      <colgroup>
        <col style={{ width: `${dayPct}%` }} />
        {grid.rows.map((row) => (
          <col
            key={row.index}
            style={{ width: `${row.kind === 'lesson' ? lessonPct : breakPct}%` }}
          />
        ))}
      </colgroup>

      <thead>
        <tr>
          <th
            scope="col"
            className={`${line} bg-[color:var(--doc-head)] px-1 py-1.5 leading-[1.3]`}
          >
            <span className="block text-[11.5px] font-semibold">الحصص</span>
            <span className="latin block text-[8.5px] font-normal text-[color:var(--doc-muted)]">
              Periods
            </span>
          </th>

          {grid.rows.map((row) =>
            row.kind === 'lesson' ? (
              <th
                key={row.index}
                scope="col"
                className={`${line} bg-[color:var(--doc-head)] px-1 py-1.5 leading-[1.3]`}
              >
                <span className="block text-[12px] font-semibold">{shortPeriodLabel(row)}</span>
                {row.timeRange && (
                  <span className="latin block text-[9px] font-normal text-[color:var(--doc-muted)]">
                    {row.timeRange}
                  </span>
                )}
              </th>
            ) : (
              <th
                key={row.index}
                scope="col"
                className={`${line} bg-[color:var(--doc-break)] px-0.5 py-1.5 leading-[1.3]`}
              >
                {shortBreakLabel(row.labelAr).map((part) => (
                  <span
                    key={part}
                    className="block whitespace-nowrap text-[8.5px] font-medium text-[color:var(--doc-muted)]"
                  >
                    {part}
                  </span>
                ))}
                {splitTimeRange(row.timeRange).map((t) => (
                  <span
                    key={t}
                    className="latin block whitespace-nowrap text-[7.5px] text-[color:var(--doc-muted)]"
                  >
                    {t}
                  </span>
                ))}
              </th>
            ),
          )}
        </tr>
      </thead>

      <tbody>
        {grid.days.map((day) => (
          <tr key={day.id}>
            <th
              scope="row"
              className={`${line} bg-[color:var(--doc-day)] px-1 py-1.5 leading-[1.3]`}
            >
              <span className="block text-[13.5px] font-semibold">{day.nameAr}</span>
              {day.nameEn && (
                <span className="latin block text-[9px] font-normal text-[color:var(--doc-muted)]">
                  {day.nameEn}
                </span>
              )}
              {grid.daysWithOwnTimes.has(day.id) && (
                <span className="block text-[8px] font-normal text-[color:var(--doc-muted)]">
                  توقيت مختلف
                </span>
              )}
            </th>

            {grid.rows.map((row) => {
              const period = periodOf(day, row.index);

              if (period?.kind !== 'lesson') {
                return (
                  <td
                    key={row.index}
                    className={`${line} bg-[color:var(--doc-break)]`}
                    aria-label={period?.labelAr ?? 'لا توجد حصة'}
                  />
                );
              }

              const lesson = bySlot.get(slotKey(day.id, row.index));
              if (!lesson) {
                return (
                  <td key={row.index} className={`${line} px-1`}>
                    <span className="text-[12px] text-[color:var(--doc-muted)]">ــ</span>
                  </td>
                );
              }

              const subject = index.subjectById.get(lesson.subjectId);
              const section = index.sectionById.get(lesson.sectionId);
              const teacher = lesson.teacherId ? index.teacherById.get(lesson.teacherId) : null;

              /* في جدول المعلمة يتصدّر رقم الشعبة وحده — المادة معروفة من شريط
                 البيانات — وفي جدول الشعبة تتصدّر المادة ويليها اسم المعلمة.
                 لا إنجليزية داخل الخلية: تكرارها في كل خلية يزدحم ولا يضيف. */
              const headline =
                context === 'teacher' ? (section?.label ?? 'ــ') : (subject?.nameAr ?? 'ــ');
              const sub =
                context === 'teacher'
                  ? showSubjectInCells
                    ? (subject?.nameAr ?? '')
                    : ''
                  : (teacher?.nameAr ?? '');

              return (
                <td key={row.index} className={`${line} px-1 leading-[1.3]`}>
                  <span
                    className={
                      context === 'teacher'
                        ? 'block text-[16px] font-semibold'
                        : 'block text-[12.5px] font-semibold'
                    }
                  >
                    {lesson.variant && <span className="ms-0.5">{lesson.variant.icon}</span>}
                    {isLatinRun(headline) ? <span className="latin">{headline}</span> : headline}
                  </span>
                  {sub && (
                    <span className="block text-[10px] text-[color:var(--doc-muted)]">{sub}</span>
                  )}
                  {lesson.variant && (
                    <span className="block text-[9px] text-[color:var(--doc-muted)]">
                      {lesson.variant.labelAr}
                    </span>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ────────── ٤ · الاعتماد والتذييل ────────── */

export function DocumentSignatures() {
  if (BRAND.signatories.length === 0) return null;
  return (
    <section className="mt-4 shrink-0 break-inside-avoid">
      <div className="flex items-end justify-around gap-8">
        {BRAND.signatories.map((s) => (
          <div key={s.roleAr} className="min-w-0 flex-1 text-center leading-[1.3]">
            <p className="truncate text-[9.5px] text-[color:var(--doc-muted)]">{s.roleAr}</p>
            {s.roleEn && (
              <p className="latin truncate text-[8.5px] text-[color:var(--doc-muted)]">{s.roleEn}</p>
            )}
            <p className="mt-0.5 truncate text-[12px] font-semibold">{s.nameAr}</p>
            <p className="mx-auto mt-3.5 w-3/4 border-t-[0.6px] border-[color:var(--doc-line)] pt-1 text-[8.5px] text-[color:var(--doc-muted)]">
              التوقيع
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function DocumentFooter({
  versionLabel,
  issuedAt,
  hidden,
}: {
  versionLabel: string;
  issuedAt: string;
  hidden?: boolean;
}) {
  if (hidden) return null;
  return (
    <footer className="mt-2 flex shrink-0 items-center justify-between border-t-[0.6px] border-[color:var(--doc-line)] pt-1 text-[8.5px] text-[color:var(--doc-muted)]">
      <span>تاريخ الإصدار: {issuedAt}</span>
      <span>رقم النسخة: {versionLabel}</span>
      <span className="latin">{BRAND.systemNameAr}</span>
    </footer>
  );
}

/* ────────── ٥ · الورقة كاملة ────────── */

export interface DocumentChrome {
  yearLabel: string;
  versionLabel: string;
  issuedAt: string;
  hideFooter: boolean;
}

/**
 * الورقة الرسمية: خط خمري رفيع في الحافة العليا، فترويسة، فشريط بيانات،
 * فالجدول الذي يملأ ما تبقّى من ارتفاع الصفحة، فالاعتماد فالتذييل.
 *
 * تُبنى منه كل أوراق المنظومة — جداول المعلمات والشعب والتقارير — فلا تتفرّق
 * هوية الطباعة بين نوع وآخر.
 *
 * `fill` تُطفأ للتقارير الطويلة: جدول بمئة صف يملأ ورقته بنفسه، وتمديده قسرًا
 * يفسد توزيع صفوفه.
 */
export function TeacherTimetablePrintPage({
  titleAr,
  titleEn,
  chrome,
  nameAr,
  nameEn,
  info,
  fill = true,
  children,
}: {
  titleAr: string;
  titleEn?: string;
  chrome: DocumentChrome;
  nameAr?: string;
  nameEn?: string;
  info?: InfoItem[];
  fill?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="doc print-page print-block grow">
      <span
        aria-hidden
        className="block h-[1.5px] shrink-0 bg-[color:var(--doc-accent)]"
      />
      <InstitutionalHeader titleAr={titleAr} titleEn={titleEn} yearLabel={chrome.yearLabel} />
      <TeacherInfoStrip nameAr={nameAr} nameEn={nameEn} items={info} />
      <div className={fill ? `sheet-fill ${GRID_GAP}` : GRID_GAP}>{children}</div>
      <DocumentSignatures />
      <DocumentFooter
        versionLabel={chrome.versionLabel}
        issuedAt={chrome.issuedAt}
        hidden={chrome.hideFooter}
      />
    </section>
  );
}
