import type { Lesson } from '@/lib/domain/types';
import type { SnapshotIndex } from '@/lib/engine/snapshot';
import { slotKey } from '@/lib/engine/snapshot';
import { buildGrid, periodOf } from '@/lib/engine/grid';
import { BRAND } from '@/lib/brand';

/**
 * القالب الرسمي الموحّد للوثائق المطبوعة.
 *
 * كل جدول في المنظومة نسخة من هذا القالب لا تصميم مستقل يشبهه: الترويسة
 * والمقاسات والحدود والمسافات كلها معرَّفة هنا مرة واحدة، ولا يمرَّر إلى
 * القالب سوى البيانات. الفرق بين ورقة وأخرى محصور في اسم المعلمة والمادة
 * والنصاب وعدد الشعب والحصص — وما عدا ذلك ثابت بحكم البناء لا بحكم الانضباط.
 *
 * لذلك أيضًا ارتفاع الترويسة وشريط البيانات مثبَّت بالبكسل والنصوص تُقصّ عند
 * الحد: اسم معلمة أطول أو مادتان بدل مادة لا يجوز أن يزحزحا الشبكة سطرًا
 * واحدًا، وإلا اختلفت الأوراق حين تُرصّ متجاورة.
 */

/* ── سلّم الأحجام ──
   مصدر واحد لكل مقاس نصّي في الوثيقة. تغييره هنا يغيّر كل الأوراق معًا،
   ووجوده هنا يمنع تسرّب مقاسات مرتجلة إلى ورقة دون أخرى. */
const T = {
  ministryAr: 'text-[16px] font-bold',
  ministryEn: 'latin text-[10.5px] text-[color:var(--doc-muted)]',
  schoolAr: 'text-[13.5px] font-semibold',
  schoolEn: 'latin text-[10px] text-[color:var(--doc-muted)]',
  titleAr: 'text-[18px] font-bold',
  titleEn: 'latin text-[11px] text-[color:var(--doc-muted)]',
  yearLabelAr: 'text-[11px] text-[color:var(--doc-muted)]',
  yearLabelEn: 'latin text-[9.5px] text-[color:var(--doc-muted)]',
  yearValue: 'latin text-[16px] font-bold tabular-nums',
  nameAr: 'text-[18px] font-semibold',
  nameEn: 'latin text-[11px] text-[color:var(--doc-muted)]',
  metaLabel: 'text-[11px] text-[color:var(--doc-muted)]',
  metaLabelEn: 'latin text-[9.5px]',
  metaValue: 'text-[15px] font-semibold',
} as const;

/* ── مقاسات ثابتة ──
   ارتفاعات صريحة لا محتوى يحدّدها، فتتطابق كل الأوراق مهما طالت البيانات. */
const HEADER_H = 'h-[62px]';
const INFO_H = 'h-[44px]';
const LOGO_H = 'h-[42px]';

const cellBorder = 'border border-[color:var(--doc-line)]';

/* ────────── ١ · الترويسة ────────── */

export function TeacherTimetableHeader({
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
      className={`${HEADER_H} flex shrink-0 items-center justify-between gap-6 border-b border-[color:var(--doc-line-strong)]`}
    >
      {/* يمينًا: الجهة المؤسسية */}
      <div className="flex min-w-0 shrink-0 items-center gap-2.5">
        {BRAND.ministryLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={BRAND.ministryLogo}
            alt={BRAND.ministryNameAr}
            className={`${LOGO_H} w-auto shrink-0 object-contain`}
          />
        ) : (
          <span
            className={`${LOGO_H} flex w-[64px] shrink-0 items-center justify-center rounded-sm border border-dashed border-[color:var(--doc-line)] text-[9px] text-[color:var(--doc-muted)]`}
          >
            شعار الوزارة
          </span>
        )}
        <div className="min-w-0 text-right leading-[1.2]">
          <p className={`truncate ${T.ministryAr}`}>{BRAND.ministryNameAr}</p>
          <p className={`truncate ${T.ministryEn}`}>{BRAND.ministryNameEn}</p>
          <p className={`truncate ${T.schoolAr}`}>{BRAND.schoolNameAr}</p>
          <p className={`truncate ${T.schoolEn}`}>{BRAND.schoolNameEn}</p>
        </div>
      </div>

      {/* المنتصف: هوية الوثيقة */}
      <div className="min-w-0 flex-1 text-center leading-[1.25]">
        <h1 className={`truncate ${T.titleAr}`}>{titleAr}</h1>
        {titleEn && <p className={`truncate ${T.titleEn}`}>{titleEn}</p>}
      </div>

      {/* يسارًا: العام الأكاديمي */}
      <div className="shrink-0 text-left leading-[1.25]">
        <p className={T.yearLabelAr}>العام الأكاديمي</p>
        <p className={T.yearLabelEn}>Academic Year</p>
        <p className={T.yearValue}>{yearLabel}</p>
      </div>
    </header>
  );
}

/* ────────── ٢ · شريط بيانات صاحب الوثيقة ────────── */

export interface InfoItem {
  label: string;
  labelEn?: string;
  value: string;
  /** القيم الرقمية تُعزل اتجاهيًا حتى لا ينقلب ترتيبها داخل السطر العربي. */
  latin?: boolean;
}

export function TeacherTimetableInfoBar({
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
      className={`${INFO_H} flex shrink-0 items-center justify-between gap-6 border-b border-[color:var(--doc-line)]`}
    >
      <div className="min-w-0 leading-[1.2]">
        {nameAr && <p className={`truncate ${T.nameAr}`}>{nameAr}</p>}
        {nameEn && <p className={`truncate ${T.nameEn}`}>{nameEn}</p>}
      </div>

      {items && items.length > 0 && (
        <dl className="flex shrink-0 items-center">
          {items.map((item, i) => (
            <div
              key={item.label}
              className={
                i > 0
                  ? 'ms-4 border-s border-[color:var(--doc-line)] ps-4 leading-[1.2]'
                  : 'leading-[1.2]'
              }
            >
              {/* الفجوة عبر flex لا عبر هامش: الوسم اللاتيني معزول اتجاهيًا،
                  فهامشه المنطقي ينقلب ويلتصق بالعربية. */}
              <dt className={`flex items-baseline gap-1 ${T.metaLabel}`}>
                <span>{item.label}</span>
                {item.labelEn && <span className={T.metaLabelEn}>{item.labelEn}</span>}
              </dt>
              <dd
                className={`truncate ${T.metaValue} ${item.latin ? 'latin tabular-nums' : ''}`}
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
 * أيام الأسبوع عمود رأسي في أقصى اليمين، والحصص أعمدة أفقية في الأعلى تحت
 * كلٍّ منها وقتها — الاتجاه المعتمد في جداول المدرسة الورقية.
 *
 * الأعمدة بنسب مئوية ثابتة و`table-fixed`، والصفوف توزّع ارتفاع الورقة
 * بالتساوي، فتخرج كل الأوراق بعرض عمود وارتفاع صف متطابقين تمامًا مهما
 * اختلف طول ما بداخلها.
 */
export function TeacherTimetableGrid({
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
  const dayPct = 10;
  const breakPct = 4.5;
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
            className={`${cellBorder} bg-[color:var(--doc-band)] px-1 py-1.5 leading-[1.25]`}
          >
            <span className="block text-[12.5px] font-bold">اليوم</span>
            <span className="latin block text-[9px] font-normal text-[color:var(--doc-muted)]">
              Day
            </span>
          </th>

          {grid.rows.map((row) =>
            row.kind === 'lesson' ? (
              <th
                key={row.index}
                scope="col"
                className={`${cellBorder} bg-[color:var(--doc-head)] px-1 py-1.5 leading-[1.25]`}
              >
                <span className="block text-[12.5px] font-semibold">{row.labelAr}</span>
                {row.timeRange && (
                  <span className="latin block text-[9.5px] font-normal tabular-nums text-[color:var(--doc-muted)]">
                    {row.timeRange}
                  </span>
                )}
              </th>
            ) : (
              <th
                key={row.index}
                scope="col"
                className={`${cellBorder} bg-[color:var(--doc-band)] px-0.5 py-1.5 leading-[1.25]`}
              >
                <span className="block text-[9.5px] font-medium text-[color:var(--doc-muted)]">
                  {row.labelAr}
                </span>
                {row.timeRange && (
                  <span className="latin block text-[8px] tabular-nums text-[color:var(--doc-muted)]">
                    {row.timeRange}
                  </span>
                )}
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
              className={`${cellBorder} bg-[color:var(--doc-head)] px-1 py-2 leading-[1.25]`}
            >
              <span className="block text-[15px] font-bold">{day.nameAr}</span>
              {day.nameEn && (
                <span className="latin block text-[9.5px] font-normal text-[color:var(--doc-muted)]">
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
                    className={`${cellBorder} bg-[color:var(--doc-band)]`}
                    aria-label={period?.labelAr ?? 'لا توجد حصة'}
                  />
                );
              }

              const lesson = bySlot.get(slotKey(day.id, row.index));
              if (!lesson) {
                return (
                  <td key={row.index} className={`${cellBorder} px-1`}>
                    <span className="text-[13px] text-[color:var(--doc-muted)]">ــ</span>
                  </td>
                );
              }

              const subject = index.subjectById.get(lesson.subjectId);
              const section = index.sectionById.get(lesson.sectionId);
              const teacher = lesson.teacherId ? index.teacherById.get(lesson.teacherId) : null;

              /* في جدول المعلمة يتصدّر رقم الشعبة، وفي جدول الشعبة يتصدّر اسم
                 المادة. السطر الثاني ثانوي دائمًا، وبلا إنجليزية داخل الخلية:
                 تكرارها في ثمانٍ وثلاثين خلية يزدحم ولا يضيف. */
              const headline =
                context === 'teacher' ? (section?.label ?? 'ــ') : (subject?.nameAr ?? 'ــ');
              const sub =
                context === 'teacher'
                  ? showSubjectInCells
                    ? (subject?.nameAr ?? '')
                    : ''
                  : (teacher?.nameAr ?? '');

              return (
                <td key={row.index} className={`${cellBorder} px-1 leading-[1.3]`}>
                  <span className="block text-[15px] font-bold">
                    {lesson.variant && <span className="ms-0.5">{lesson.variant.icon}</span>}
                    {context === 'teacher' ? <span className="latin">{headline}</span> : headline}
                  </span>
                  {sub && (
                    <span className="block text-[11px] text-[color:var(--doc-muted)]">{sub}</span>
                  )}
                  {lesson.variant && (
                    <span className="block text-[9.5px] text-[color:var(--doc-muted)]">
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

/* ────────── ٤ · خانات الاعتماد ────────── */

export function TeacherTimetableSignatures() {
  if (BRAND.signatories.length === 0) return null;
  return (
    <section className="mt-4 shrink-0 break-inside-avoid">
      <div className="flex items-end justify-around gap-8">
        {BRAND.signatories.map((s) => (
          <div key={s.roleAr} className="min-w-0 flex-1 text-center leading-[1.25]">
            <p className="truncate text-[10.5px] text-[color:var(--doc-muted)]">{s.roleAr}</p>
            {s.roleEn && (
              <p className="latin truncate text-[9px] text-[color:var(--doc-muted)]">{s.roleEn}</p>
            )}
            <p className="mt-1 truncate text-[12.5px] font-semibold">{s.nameAr}</p>
            <p className="mx-auto mt-4 w-3/4 border-t border-dotted border-[color:var(--doc-line-strong)] pt-1 text-[9px] text-[color:var(--doc-muted)]">
              التوقيع
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TeacherTimetableFooter({
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
    <footer className="mt-2 flex shrink-0 items-center justify-between border-t border-[color:var(--doc-line)] pt-1 text-[9px] text-[color:var(--doc-muted)]">
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
 * غلاف الورقة الرسمية: ترويسة، فشريط بيانات، فالمحتوى الذي يملأ ما تبقّى من
 * ارتفاع الصفحة، فخانات الاعتماد، فالتذييل. تُبنى منه كل أوراق المنظومة —
 * جداول المعلمات والشعب والتقارير — فلا تتفرّق هوية الطباعة بين نوع وآخر.
 *
 * `fill` تُطفأ للتقارير الطويلة: جدول بمئة صف يملأ ورقته بنفسه، وتمديده
 * قسرًا يفسد توزيع صفوفه.
 */
export function TeacherTimetablePrintLayout({
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
      <TeacherTimetableHeader titleAr={titleAr} titleEn={titleEn} yearLabel={chrome.yearLabel} />
      <TeacherTimetableInfoBar nameAr={nameAr} nameEn={nameEn} items={info} />
      {fill ? (
        <div className="sheet-fill pt-2">{children}</div>
      ) : (
        <div className="pt-2">{children}</div>
      )}
      <TeacherTimetableSignatures />
      <TeacherTimetableFooter
        versionLabel={chrome.versionLabel}
        issuedAt={chrome.issuedAt}
        hidden={chrome.hideFooter}
      />
    </section>
  );
}
