import { BRAND } from '@/lib/brand';

/**
 * ترويسة الوثيقة المطبوعة.
 *
 * الورقة وثيقة رسمية تُوزَّع على المعلمات، فتصميمها مختلف عمدًا عن شاشة التحرير:
 * بلا ألوان واجهة، وبتسلسل معلومات ثابت يسهل التحقق منه.
 */
export function PrintHeader({
  titleAr,
  subtitleAr,
  metaAr,
  yearLabel,
}: {
  titleAr: string;
  subtitleAr?: string;
  metaAr?: Array<{ label: string; value: string }>;
  yearLabel: string;
}) {
  return (
    <header className="mb-3 border-b-2 border-black/80 pb-2.5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          {BRAND.ministryLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={BRAND.ministryLogo} alt="" className="h-12 w-12 object-contain" />
          ) : (
            <span
              className="flex h-12 w-12 items-center justify-center rounded border border-dashed border-black/30 text-center text-[7pt] leading-tight text-black/45"
              title="يُستبدل بالشعار الرسمي عند تزويده"
            >
              شعار
              <br />
              الوزارة
            </span>
          )}
          <div>
            <p className="text-[10pt] font-bold leading-tight">{BRAND.ministryNameAr}</p>
            <p className="text-[9pt] leading-tight">{BRAND.schoolNameAr}</p>
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-[13pt] font-bold leading-tight">{titleAr}</h1>
          {subtitleAr && <p className="mt-0.5 text-[10pt] leading-tight">{subtitleAr}</p>}
        </div>

        <div className="text-left">
          <p className="text-[8pt] leading-tight text-black/60">العام الأكاديمي</p>
          <p className="ltr-run text-[11pt] font-bold leading-tight">{yearLabel}</p>
        </div>
      </div>

      {metaAr && metaAr.length > 0 && (
        <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-0.5">
          {metaAr.map((item) => (
            <div key={item.label} className="flex gap-1.5 text-[9pt]">
              <dt className="text-black/60">{item.label}:</dt>
              <dd className="font-semibold">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </header>
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
    <footer className="mt-3 flex items-center justify-between border-t border-black/40 pt-1.5 text-[7.5pt] text-black/60">
      <span>تاريخ الإصدار: {issuedAt}</span>
      <span>رقم النسخة: {versionLabel}</span>
      <span>{BRAND.systemNameAr}</span>
    </footer>
  );
}
