import type { Lesson, SchoolDay } from '@/lib/domain/types';
import type { SnapshotIndex } from '@/lib/engine/snapshot';
import { slotKey } from '@/lib/engine/snapshot';
import { buildGrid, periodOf, type GridRow } from '@/lib/engine/grid';
import { BRAND } from '@/lib/brand';

/**
 * النظام البصري للوثائق المطبوعة.
 *
 * ثلاث طبقات في مستند واحد: الترويسة المؤسسية، فشريط بيانات المعلمة، فالشبكة.
 * والمبدأ الحاكم أن الشبكة هي المحتوى وما فوقها يُعرِّف بها ولا يزاحمها — لذلك
 * تُقاس الترويسة بالمِلّيمتر لا بالذوق، وتُحصر الأوزان في 400/500/600، ويُترك
 * الخمري لثلاثة مواضع دقيقة لا يدخل الشبكة منها شيء.
 *
 * كل ورقة نسخة من هذا القالب لا تصميم مستقل يشبهه: المقاسات والحدود والمسافات
 * معرَّفة هنا مرة واحدة ولا يُمرَّر إليه سوى البيانات. وارتفاعات الترويسة
 * والشريط والصفوف مثبَّتة بالبكسل مع قصّ النصوص عند الحد، فاسم معلمة أطول أو
 * مادة اسمها أطول لا يزحزحان الشبكة سطرًا واحدًا.
 */

/* ── الارتفاعات ──
   ورقة A4 عرضية بهامش 7mm رأسيًا: الارتفاع القابل للطباعة 196mm ≈ 741px.
   الترويسة 25mm والشريط 15mm، والشعار 13mm داخلها. صفوف الأيام بارتفاع ثابت
   لا ممتد: الصف الممتدّ يترك فراغًا داخليًا يجعل الخلية تبدو فارغة وإن كانت
   مشغولة. مجموع الطبقات محسوب ليبقى دون 196mm — وهو ما تحقّقه الطباعة الفعلية
   لا التقدير. */
const HEADER_H = 'h-[96px]';
const INFO_H = 'h-[57px]';
const LOGO_H = 'h-[50px]';
const GRID_GAP = 'pt-[16px]';

/**
 * ميزانية ارتفاع صفوف الأيام.
 *
 * ما يتبقّى من صندوق المحتوى (196mm ≈ 741px) بعد الطبقات الثابتة: الخيط
 * العلوي والترويسة والشريط والفجوة ورأس الجدول وخانات الاعتماد والتذييل
 * وهوامشها. اشتقاق ارتفاع الصف من هذه الميزانية — لا تثبيته على رقم — يمنع
 * الورقة أن تنسكب إلى صفحة ثانية لو زاد عدد أيام الدوام يومًا.
 */
const BODY_BUDGET_PX = 400;
const ROW_MAX_PX = 84;

/* الحدّ الداخلي شعري، والإطار الخارجي وفواصل الأيام أثقل بدرجة واحدة. */
const cellLine = 'border-[0.5px] border-[color:var(--doc-line)]';
const dayRule = 'border-t-[0.8px] border-t-[color:var(--doc-line)]';

/* ── سلّم الطباعة ──
   مصدر واحد لكل مقاس ووزن وارتفاع سطر ودرجة لونية في الوثيقة. العائلات
   والألوان في `globals.css`، والتراتب هنا. تغيير أي سطر أدناه يغيّر كل الأوراق
   معًا، ووجوده هنا يمنع تسرّب مقاسات مرتجلة إلى ورقة دون أخرى. */
export const DOC_TYPE = {
  ministryAr: 'text-[12px] font-medium leading-[1.25]',
  ministryEn: 'latin-block text-[9px] font-normal leading-[1.2] text-[color:var(--doc-muted)]',
  schoolAr: 'text-[12px] font-medium leading-[1.25]',
  schoolEn: 'latin-block text-[8.75px] font-normal leading-[1.2] text-[color:var(--doc-muted)]',

  titleAr: 'text-[15.5px] font-semibold leading-[1.25]',
  titleEn: 'latin-block text-[9px] font-normal leading-[1.2] text-[color:var(--doc-muted)]',
  yearLabelAr: 'text-[8.75px] font-normal leading-[1.25] text-[color:var(--doc-muted)]',
  yearLabelEn: 'latin-block text-[8.25px] font-normal leading-[1.2] text-[color:var(--doc-faint)]',
  yearValue: 'latin text-[14px] font-semibold leading-[1.25]',

  infoLabelAr: 'text-[8.75px] font-normal leading-[1.25] text-[color:var(--doc-muted)]',
  infoLabelEn: 'latin text-[8.25px] font-normal',
  nameAr: 'text-[15px] font-semibold leading-[1.25]',
  nameEn: 'latin-block text-[9px] font-normal leading-[1.2] text-[color:var(--doc-muted)]',
  infoValue: 'text-[12.5px] font-semibold leading-[1.25]',

  dayHeadAr: 'text-[12.5px] font-semibold leading-[1.25]',
  dayHeadEn: 'latin text-[9px] font-normal leading-[1.2] text-[color:var(--doc-faint)]',
  periodAr: 'text-[12.5px] font-semibold leading-[1.25]',
  periodTime: 'latin text-[9.5px] font-normal leading-[1.2] text-[color:var(--doc-muted)]',
  breakAr: 'text-[9px] font-medium leading-[1.25] text-[color:var(--doc-muted)]',
  breakTime: 'latin text-[8.5px] font-normal leading-[1.2] text-[color:var(--doc-faint)]',
  dayAr: 'text-[13.5px] font-semibold leading-[1.25]',
  dayEn: 'latin-block text-[9.5px] font-normal leading-[1.2] text-[color:var(--doc-muted)]',
  dayNote: 'text-[8px] font-normal leading-[1.2] text-[color:var(--doc-faint)]',

  cellMain: 'text-[17px] font-semibold leading-[1.3]',
  cellMainSm: 'text-[13.5px] font-semibold leading-[1.3]',
  cellSub: 'text-[10.5px] font-normal leading-[1.3] text-[color:var(--doc-muted)]',
  cellNote: 'text-[9.5px] font-normal leading-[1.3] text-[color:var(--doc-faint)]',

  signRoleAr: 'text-[9px] font-normal leading-[1.25] text-[color:var(--doc-muted)]',
  signRoleEn: 'latin-block text-[8.25px] font-normal leading-[1.2] text-[color:var(--doc-faint)]',
  signName: 'text-[11.5px] font-semibold leading-[1.25]',
  signHint: 'text-[8.25px] font-normal text-[color:var(--doc-faint)]',
  footer: 'text-[8.25px] font-normal leading-[1.25] text-[color:var(--doc-muted)]',

  /* جداول التقارير والجدول الرئيسي — النظام نفسه لا نظام ثانٍ. */
  reportHead: 'text-[11px] font-semibold leading-[1.25]',
  reportBody: 'text-[10.5px] font-normal leading-[1.35]',
  reportBodyStrong: 'text-[10.5px] font-medium leading-[1.35]',
  masterOrdinal: 'latin text-[8.75px] font-semibold leading-[1.2] text-[color:var(--doc-muted)]',
  masterCode: 'text-[8.75px] font-semibold leading-[1.25]',
  masterTeacher: 'text-[8px] font-normal leading-[1.25] text-[color:var(--doc-muted)]',
} as const;

/* ────────── ١ · الترويسة المؤسسية ────────── */

/**
 * الشعار في المحور لا على الطرف: الوثيقة الحكومية تُعرف من مركزها، والعلامة
 * الموضوعة في الوسط تصنع محور تناظر يستقيم عليه العنوان تحتها ويتوازن حوله
 * الطرفان. يمينًا المدرسة ويسارًا العام الأكاديمي، كتلتان بعرض واحد ثابت فيبقى
 * المحور في منتصف الورقة تمامًا مهما طال اسم المدرسة أو قصر — التناظر هنا بنية
 * لا مصادفة. واسم الوزارة لا يُكتب نصًّا: العلامة تحمله بلغتيه.
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
  const flank = 'w-[186px] shrink-0';

  return (
    <header
      className={`${HEADER_H} flex shrink-0 items-center justify-between gap-4 border-b-[0.6px] border-[color:var(--doc-line-head)]`}
    >
      <div className={`${flank} text-right`}>
        <p className={`truncate ${DOC_TYPE.schoolAr}`}>{BRAND.schoolNameAr}</p>
        <p className={`truncate ${DOC_TYPE.schoolEn}`}>{BRAND.schoolNameEn}</p>
        {!BRAND.ministryLogo && (
          <p className={`truncate ${DOC_TYPE.ministryAr}`}>{BRAND.ministryNameAr}</p>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-center justify-center">
        {BRAND.ministryLogo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={BRAND.ministryLogo}
            alt={BRAND.ministryNameAr}
            className={`${LOGO_H} mb-[6px] w-auto object-contain`}
          />
        )}
        <h1 className={`max-w-full truncate ${DOC_TYPE.titleAr}`}>{titleAr}</h1>
        {/* الخمري خيط تحت العنوان لا أكثر — لمسة انتماء لا عنصر جذب. */}
        <span
          aria-hidden
          className="my-[4px] block h-[1.2px] w-[44px] bg-[color:var(--doc-accent)]"
        />
        {titleEn && <p className={`max-w-full truncate ${DOC_TYPE.titleEn}`}>{titleEn}</p>}
      </div>

      <div className={`${flank} text-left`}>
        <p className={DOC_TYPE.yearLabelAr}>العام الأكاديمي</p>
        <p className={DOC_TYPE.yearLabelEn}>Academic Year</p>
        <p className={DOC_TYPE.yearValue}>{yearLabel}</p>
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

/**
 * شريط واحد لا كتلتان.
 *
 * كان الاسم في طرف والبيانات في الطرف المقابل، فينفتح بينهما فراغ يفصل المعلمة
 * عن بياناتها ويجعلهما عنصرين لا عنصرًا. صارت الأربعة خلايا شبكة واحدة بنسب
 * ثابتة — الاسم أوسعها لأنه مفتاح الورقة — تفصلها خطوط شعرية، فيُقرأ الشريط
 * سطرًا واحدًا متصلًا.
 */
export function TeacherInfoStrip({
  nameAr,
  nameEn,
  nameLabel = 'المعلمة',
  nameLabelEn = 'Teacher',
  items = [],
}: {
  nameAr?: string;
  nameEn?: string;
  nameLabel?: string;
  nameLabelEn?: string;
  items?: InfoItem[];
}) {
  /* الاسم 2.2fr، فأوسع الحقول 1.5fr، وما بعده 0.8fr — النسب تمنع الفراغ في
     المنتصف مهما اختلف عدد الحقول بين ورقة وأخرى. */
  const columns = ['2.2fr', ...items.map((_, i) => (i === 0 ? '1.5fr' : '0.8fr'))].join(' ');

  return (
    <section
      className={`${INFO_H} grid shrink-0 items-center border-b-[0.6px] border-[color:var(--doc-line-head)]`}
      style={{ gridTemplateColumns: columns }}
    >
      <div className="min-w-0 pe-4">
        <p className={`flex items-baseline gap-1 ${DOC_TYPE.infoLabelAr}`}>
          <span>{nameLabel}</span>
          <span className={DOC_TYPE.infoLabelEn}>{nameLabelEn}</span>
        </p>
        {nameAr && <p className={`mt-[3px] truncate ${DOC_TYPE.nameAr}`}>{nameAr}</p>}
        {nameEn && <p className={`truncate ${DOC_TYPE.nameEn}`}>{nameEn}</p>}
      </div>

      {items.map((item) => (
        <div
          key={item.label}
          className="min-w-0 border-s-[0.5px] border-[color:var(--doc-line)] px-4"
        >
          <p className={`flex items-baseline gap-1 ${DOC_TYPE.infoLabelAr}`}>
            <span>{item.label}</span>
            {item.labelEn && <span className={DOC_TYPE.infoLabelEn}>{item.labelEn}</span>}
          </p>
          {/* القيمة الرقمية مقطع سطري معزول داخل فقرة عربية: تبقى محاذاة
              الفقرة إلى يمين الخلية ولا ينقلب طرفا النسبة. */}
          <p className={`mt-[3px] truncate ${DOC_TYPE.infoValue}`} title={item.value}>
            {item.latin ? <span className="latin">{item.value}</span> : item.value}
          </p>
        </div>
      ))}
    </section>
  );
}

/* ────────── ٣ · الشبكة ────────── */

/**
 * «الحصة الأولى» في رأس عمود ضيّق تُقرأ مرتين: مرة للكلمة المكرّرة في كل عمود
 * ومرة للترتيب. تُختصر إلى «الأولى» فيقلّ الزحام ويبقى المعنى.
 */
function shortPeriodLabel(row: GridRow): string {
  return row.labelAr.replace(/^الحصة\s+/, '');
}

/**
 * أسماء الفواصل تُضغط لتسع عمودًا ضيقًا: «الصلاة والفسحة» ← «صلاة + فسحة».
 * قاعدة عامة على أداة التعريف وواو العطف، لا قائمة أسماء مكتوبة بأعيانها.
 */
function shortBreakLabel(labelAr: string): string[] {
  const parts = labelAr.split(' و').map((part) => part.replace(/^ال/, ''));
  return parts.map((part, i) => (i === 0 ? part : `+ ${part}`));
}

/** شرطة واحدة بلا فراغات في كل الوثيقة — «08:15–09:00». */
function formatTimeRange(timeRange: string): string {
  return timeRange.replace(/\s*[–-]\s*/, '–');
}

function splitTimeRange(timeRange: string): string[] {
  return timeRange.split(/\s*[–-]\s*/).filter(Boolean);
}

/**
 * رقم الشعبة نصّ لاتيني في الغالب («5/1») فيُعزل اتجاهيًا، لكن بعض الشعب تحمل
 * وصفًا عربيًا («6/متقدّم») والعزل يقلبها إلى «متقدّم/6». يُفحص المحتوى لا السياق.
 */
function isLatinRun(text: string): boolean {
  return !/[؀-ۿ]/.test(text);
}

/** رأس عمود حصة: الترتيب فوق ووقته تحته. */
export function PeriodHeader({ row }: { row: GridRow }) {
  return (
    <th scope="col" className={`${cellLine} bg-[color:var(--doc-head)] px-1 py-1.5`}>
      <span className={`block ${DOC_TYPE.periodAr}`}>{shortPeriodLabel(row)}</span>
      {row.timeRange && (
        <span className={`block ${DOC_TYPE.periodTime}`}>{formatTimeRange(row.timeRange)}</span>
      )}
    </th>
  );
}

/**
 * الفسحة والصلاة شريطان زمنيان ثانويان لا حصّتان: عمودهما أضيق وخلفيتهما أهدأ
 * درجةً وخطّهما أصغر، والطرفان الزمنيان سطران لأن العمود أضيق من أن يسعهما
 * سطرًا واحدًا بلا تسرّب فوق جاره.
 */
export function BreakBand({ row }: { row: GridRow }) {
  return (
    <th scope="col" className={`${cellLine} bg-[color:var(--doc-break)] px-0.5 py-1.5`}>
      {shortBreakLabel(row.labelAr).map((part) => (
        <span key={part} className={`block whitespace-nowrap ${DOC_TYPE.breakAr}`}>
          {part}
        </span>
      ))}
      {splitTimeRange(row.timeRange).map((t) => (
        <span key={t} className={`block whitespace-nowrap ${DOC_TYPE.breakTime}`}>
          {t}
        </span>
      ))}
    </th>
  );
}

/** رأس صف اليوم في أقصى اليمين. */
export function DayCell({ day, ownTimes }: { day: SchoolDay; ownTimes: boolean }) {
  return (
    <th scope="row" className={`${cellLine} bg-[color:var(--doc-day)] px-1 py-1.5`}>
      <span className={`block ${DOC_TYPE.dayAr}`}>{day.nameAr}</span>
      {day.nameEn && <span className={`block ${DOC_TYPE.dayEn}`}>{day.nameEn}</span>}
      {ownTimes && <span className={`block ${DOC_TYPE.dayNote}`}>توقيت مختلف</span>}
    </th>
  );
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
  /* عمود اليوم ~27mm من 281mm قابلة للطباعة، والفاصل ~11mm، والباقي يُقسَّم
     بالتساوي على الحصص. */
  const dayPct = 9.6;
  const breakPct = 3.9;
  const lessonPct = (100 - dayPct - breakCols * breakPct) / Math.max(1, lessonCols);

  /* الصف لا يتجاوز حدَّه الأعلى مهما اتّسعت الميزانية: الصف المتضخّم يترك
     فراغًا داخليًا يجعل الخلية تبدو فارغة وإن كانت مشغولة. */
  const rowHeight = Math.min(ROW_MAX_PX, Math.floor(BODY_BUDGET_PX / Math.max(1, grid.days.length)));

  return (
    /* الإطار الخارجي أثقل من الحدّ الداخلي بدرجة — تراتب داخل الشبكة نفسها. */
    <div className="border-[0.8px] border-[color:var(--doc-line)]">
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
            {/* العمود تحته أيام لا حصص، فهذا رأسه. */}
            <th scope="col" className={`${cellLine} bg-[color:var(--doc-day)] px-1 py-1.5`}>
              <span className={`block ${DOC_TYPE.dayHeadAr}`}>اليوم</span>
              <span className={`block ${DOC_TYPE.dayHeadEn}`}>Day</span>
            </th>
            {grid.rows.map((row) =>
              row.kind === 'lesson' ? (
                <PeriodHeader key={row.index} row={row} />
              ) : (
                <BreakBand key={row.index} row={row} />
              ),
            )}
          </tr>
        </thead>

        <tbody>
          {grid.days.map((day, i) => (
            <tr key={day.id} className={i > 0 ? dayRule : ''} style={{ height: rowHeight }}>
              <DayCell day={day} ownTimes={grid.daysWithOwnTimes.has(day.id)} />

              {grid.rows.map((row) => {
                const period = periodOf(day, row.index);

                if (period?.kind !== 'lesson') {
                  return (
                    <td
                      key={row.index}
                      className={`${cellLine} bg-[color:var(--doc-break)]`}
                      aria-label={period?.labelAr ?? 'لا توجد حصة'}
                    />
                  );
                }

                const lesson = bySlot.get(slotKey(day.id, row.index));
                /* الخلية الشاغرة تُترك فارغة: الفراغ نفسه يقول «لا حصة»،
                   والشرطة في كل خلية شاغرة ضجيج يزاحم الأرقام المشغولة. */
                if (!lesson) return <td key={row.index} className={cellLine} />;

                const subject = index.subjectById.get(lesson.subjectId);
                const section = index.sectionById.get(lesson.sectionId);
                const teacher = lesson.teacherId ? index.teacherById.get(lesson.teacherId) : null;

                /* في جدول المعلمة يتصدّر رقم الشعبة وحده — المادة معروفة من
                   الشريط — وفي جدول الشعبة تتصدّر المادة ويليها اسم المعلمة.
                   ولا إنجليزية داخل الخلية: تكرارها في كل خلية يزدحم ولا يضيف. */
                const headline =
                  context === 'teacher' ? (section?.label ?? '') : (subject?.nameAr ?? '');
                const sub =
                  context === 'teacher'
                    ? showSubjectInCells
                      ? (subject?.nameAr ?? '')
                      : ''
                    : (teacher?.nameAr ?? '');

                return (
                  <td key={row.index} className={`${cellLine} px-1`}>
                    <span
                      className={`block ${
                        context === 'teacher' ? DOC_TYPE.cellMain : DOC_TYPE.cellMainSm
                      }`}
                    >
                      {lesson.variant && <span className="ms-0.5">{lesson.variant.icon}</span>}
                      {isLatinRun(headline) ? <span className="latin">{headline}</span> : headline}
                    </span>
                    {sub && <span className={`block ${DOC_TYPE.cellSub}`}>{sub}</span>}
                    {lesson.variant && (
                      <span className={`block ${DOC_TYPE.cellNote}`}>{lesson.variant.labelAr}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ────────── ٤ · الاعتماد والتذييل ────────── */

export function DocumentSignatures() {
  if (BRAND.signatories.length === 0) return null;
  return (
    <section className="mt-3 shrink-0 break-inside-avoid">
      <div className="flex items-end justify-around gap-8">
        {BRAND.signatories.map((s) => (
          <div key={s.roleAr} className="min-w-0 flex-1 text-center">
            <p className={`truncate ${DOC_TYPE.signRoleAr}`}>{s.roleAr}</p>
            {s.roleEn && <p className={`truncate ${DOC_TYPE.signRoleEn}`}>{s.roleEn}</p>}
            <p className={`mt-0.5 truncate ${DOC_TYPE.signName}`}>{s.nameAr}</p>
            <p
              className={`mx-auto mt-3.5 w-3/4 border-t-[0.5px] border-[color:var(--doc-line)] pt-1 ${DOC_TYPE.signHint}`}
            >
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
    <footer
      className={`mt-2 flex shrink-0 items-center justify-between border-t-[0.5px] border-[color:var(--doc-line)] pt-1 ${DOC_TYPE.footer}`}
    >
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
 * الورقة الرسمية: خيط خمري في الحافة العليا، فترويسة، فشريط بيانات، فالشبكة،
 * فالاعتماد فالتذييل. تُبنى منه كل أوراق المنظومة فلا تتفرّق هوية الطباعة بين
 * نوع وآخر.
 *
 * `fill` تُشغَّل للتقارير الطويلة وحدها: جدول بمئة صف يملأ ورقته بنفسه، أما
 * الجدول الأسبوعي فصفوفه ثابتة الارتفاع ولا تُمطّ لتملأ ما تحتها.
 */
export function TeacherTimetablePrintPage({
  titleAr,
  titleEn,
  chrome,
  nameAr,
  nameEn,
  nameLabel,
  nameLabelEn,
  info,
  fill = false,
  children,
}: {
  titleAr: string;
  titleEn?: string;
  chrome: DocumentChrome;
  nameAr?: string;
  nameEn?: string;
  nameLabel?: string;
  nameLabelEn?: string;
  info?: InfoItem[];
  fill?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="doc print-page print-block grow">
      <span aria-hidden className="block h-[1.2px] shrink-0 bg-[color:var(--doc-accent)]" />
      <InstitutionalHeader titleAr={titleAr} titleEn={titleEn} yearLabel={chrome.yearLabel} />
      <TeacherInfoStrip
        nameAr={nameAr}
        nameEn={nameEn}
        nameLabel={nameLabel}
        nameLabelEn={nameLabelEn}
        items={info}
      />
      <div className={fill ? `sheet-fill ${GRID_GAP}` : GRID_GAP}>{children}</div>
      <div className="flex-1" />
      <DocumentSignatures />
      <DocumentFooter
        versionLabel={chrome.versionLabel}
        issuedAt={chrome.issuedAt}
        hidden={chrome.hideFooter}
      />
    </section>
  );
}
