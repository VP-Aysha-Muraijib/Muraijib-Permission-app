import { BRAND } from '@/lib/brand';

/**
 * ترويسة الوثيقة المطبوعة.
 *
 * ثلاث مناطق أفقية بعرض الورقة: الجهة المؤسسية يمينًا (الشعار المعتمد ثم
 * الوزارة فالمدرسة)، وهوية الوثيقة في المنتصف، والعام الأكاديمي يسارًا.
 * العربية هي اللغة الأساسية والإنجليزية مساندة أصغر وأهدأ لونًا في كل منطقة.
 *
 * الترويسة شريط لا كتلة: كل مِلّيمتر تأخذه يُقتطع من ارتفاع خلايا الجدول،
 * فحُصرت في ارتفاع الشعار نفسه ولم يُسمح لها بالتمدّد.
 */
export function PrintHeader({
  titleAr,
  titleEn,
  yearLabel,
}: {
  titleAr: string;
  titleEn?: string;
  yearLabel: string;
}) {
  return (
    <header className="flex items-center justify-between gap-6 border-b-2 border-[color:var(--doc-line-strong)] pb-2">
      {/* يمينًا: الجهة المؤسسية */}
      <div className="flex min-w-0 shrink-0 items-center gap-2.5">
        {BRAND.ministryLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={BRAND.ministryLogo}
            alt={BRAND.ministryNameAr}
            className="h-[46px] w-auto shrink-0 object-contain"
          />
        ) : (
          <span className="flex h-[46px] w-[70px] shrink-0 items-center justify-center rounded-sm border border-dashed border-[color:var(--doc-line)] text-[9px] text-[color:var(--doc-muted)]">
            شعار الوزارة
          </span>
        )}
        <div className="min-w-0 text-right leading-tight">
          <p className="truncate text-[13px] font-bold">{BRAND.ministryNameAr}</p>
          <p className="latin truncate text-[9.5px] text-[color:var(--doc-muted)]">
            {BRAND.ministryNameEn}
          </p>
          <p className="mt-[3px] truncate text-[12px] font-semibold">{BRAND.schoolNameAr}</p>
          <p className="latin truncate text-[9.5px] text-[color:var(--doc-muted)]">
            {BRAND.schoolNameEn}
          </p>
        </div>
      </div>

      {/* المنتصف: هوية الوثيقة */}
      <div className="min-w-0 flex-1 text-center leading-tight">
        <h1 className="truncate text-[24px] font-extrabold tracking-tight">{titleAr}</h1>
        {titleEn && (
          <p className="latin mt-0.5 truncate text-[12px] font-medium tracking-wide text-[color:var(--doc-muted)]">
            {titleEn}
          </p>
        )}
      </div>

      {/* يسارًا: العام الأكاديمي */}
      <div className="shrink-0 text-left leading-tight">
        <p className="text-[11px] text-[color:var(--doc-muted)]">العام الأكاديمي</p>
        <p className="latin text-[9.5px] text-[color:var(--doc-muted)]">Academic Year</p>
        <p className="latin mt-0.5 text-[19px] font-bold tabular-nums">{yearLabel}</p>
      </div>
    </header>
  );
}

export interface IdentityMeta {
  label: string;
  labelEn?: string;
  value: string;
  /** القيم الرقمية تُعزل اتجاهيًا حتى لا ينقلب ترتيبها داخل السطر العربي. */
  latin?: boolean;
}

/**
 * سطر هوية صاحب الوثيقة أسفل الترويسة مباشرة.
 *
 * الاسم على اليمين لأنه المفتاح الذي تُقرأ به الورقة، والبيانات الوصفية على
 * اليسار في صف واحد تفصله خطوط رفيعة — لا بطاقات ولا خلفيات، فالوثيقة
 * الرسمية تُقرأ بالتباين لا بالتلوين.
 */
export function PrintIdentity({
  nameAr,
  nameEn,
  meta,
}: {
  nameAr?: string;
  nameEn?: string;
  meta?: IdentityMeta[];
}) {
  if (!nameAr && (!meta || meta.length === 0)) return null;
  return (
    <section className="mb-2 mt-1.5 flex flex-wrap items-end justify-between gap-x-6 gap-y-1.5 border-b border-[color:var(--doc-line)] pb-1.5">
      {nameAr && (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[19px] font-bold">{nameAr}</p>
          {nameEn && (
            <p className="latin truncate text-[11.5px] text-[color:var(--doc-muted)]">{nameEn}</p>
          )}
        </div>
      )}

      {meta && meta.length > 0 && (
        <dl className="flex flex-wrap items-center">
          {meta.map((item, i) => (
            <div
              key={item.label}
              className={
                i > 0
                  ? 'ms-3 border-s border-[color:var(--doc-line)] ps-3 leading-tight'
                  : 'leading-tight'
              }
            >
              {/* الفجوة عبر flex لا عبر هامش: الوسم اللاتيني معزول اتجاهيًا،
                  فهامشه المنطقي ينقلب ويلتصق بالعربية. */}
              <dt className="flex items-baseline gap-1 text-[10px] text-[color:var(--doc-muted)]">
                <span>{item.label}</span>
                {item.labelEn && <span className="latin text-[9px]">{item.labelEn}</span>}
              </dt>
              <dd
                className={`text-[14px] font-semibold ${item.latin ? 'latin tabular-nums' : ''}`}
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

/**
 * خانات الاعتماد أسفل الورقة.
 *
 * الجدول وثيقة تُعتمد بتوقيع لا مجرّد مخرَج طباعة، فتُترك مساحة توقيع فعلية
 * تحت كل اسم. الأسماء والمسمّيات من إعدادات الهوية لا من داخل المكوّن.
 */
export function PrintSignatures() {
  if (BRAND.signatories.length === 0) return null;
  return (
    <section className="mt-5 break-inside-avoid">
      <div className="flex items-end justify-around gap-8">
        {BRAND.signatories.map((s) => (
          <div key={s.roleAr} className="min-w-0 flex-1 text-center leading-tight">
            <p className="truncate text-[11px] text-[color:var(--doc-muted)]">{s.roleAr}</p>
            {s.roleEn && (
              <p className="latin truncate text-[9px] text-[color:var(--doc-muted)]">{s.roleEn}</p>
            )}
            <p className="mt-1 truncate text-[13px] font-bold">{s.nameAr}</p>
            <p className="mx-auto mt-4 w-3/4 border-t border-dotted border-[color:var(--doc-line-strong)] pt-1 text-[9px] text-[color:var(--doc-muted)]">
              التوقيع
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PrintFooter({
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
    <footer className="mt-3 flex items-center justify-between border-t border-[color:var(--doc-line)] pt-1 text-[9px] text-[color:var(--doc-muted)]">
      <span>تاريخ الإصدار: {issuedAt}</span>
      <span>رقم النسخة: {versionLabel}</span>
      <span className="latin">{BRAND.systemNameAr}</span>
    </footer>
  );
}
