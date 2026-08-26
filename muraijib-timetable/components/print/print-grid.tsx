import type { Lesson } from '@/lib/domain/types';
import type { SnapshotIndex } from '@/lib/engine/snapshot';
import { slotKey } from '@/lib/engine/snapshot';
import { buildGrid, periodOf } from '@/lib/engine/grid';
import { type DisplayLang } from '@/lib/i18n';

/**
 * شبكة الجدول المطبوعة.
 *
 * الاتجاه هو المعتمد في جداول المدرسة الورقية: أيام الأسبوع عمود رأسي في أقصى
 * اليمين، والحصص أعمدة أفقية في الأعلى تحت كلٍّ منها وقتها. هذا يجعل عدد
 * الأعمدة محكومًا بعدد حصص اليوم لا بعدد الأيام، فتُستغَل ورقة A4 العرضية
 * كاملة ويُقرأ يوم المعلمة في سطر واحد.
 *
 * الفسحة والصلاة والطابور أعمدة مستقلة في موضعها الزمني الصحيح، بخلفية أهدأ
 * درجةً واحدة — تمييز يكفي للتمييز ولا يكفي لسرقة الانتباه من الحصص.
 *
 * لا خلفيات ملوّنة ولا ظلال ولا بطاقات: الورقة تُطبع بالأبيض والأسود على
 * طابعات مدرسية، فبُنيت على التباين والحدود وحدها.
 */
export function PrintGrid({
  index,
  lessons,
  context,
  showTimes = true,
  lang = 'both',
}: {
  index: SnapshotIndex;
  lessons: Lesson[];
  context: 'teacher' | 'class';
  showTimes?: boolean;
  /** محفوظ للتوافق — الوثيقة الرسمية ثنائية اللغة دائمًا. */
  lang?: DisplayLang;
}) {
  void lang;
  const grid = buildGrid(index.snapshot.week);
  const bySlot = new Map(lessons.map((l) => [slotKey(l.dayId, l.periodIndex), l]));

  const lessonCols = grid.rows.filter((r) => r.kind === 'lesson').length;
  const breakCols = grid.rows.length - lessonCols;
  /* عمود اليوم ثابت النسبة، والفواصل أضيق، والباقي يُقسَّم بالتساوي على الحصص. */
  const dayPct = 10;
  const breakPct = 4.5;
  const lessonPct = (100 - dayPct - breakCols * breakPct) / Math.max(1, lessonCols);

  const cell = 'border border-[color:var(--doc-line)] align-middle';

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
            className={`${cell} bg-[color:var(--doc-band)] px-1 py-1.5 leading-tight`}
            scope="col"
          >
            <span className="block text-[13px] font-bold">اليوم</span>
            <span className="latin block text-[9px] font-normal text-[color:var(--doc-muted)]">
              Day
            </span>
          </th>

          {grid.rows.map((row) =>
            row.kind === 'lesson' ? (
              <th
                key={row.index}
                scope="col"
                className={`${cell} bg-[color:var(--doc-head)] px-1 py-1.5 leading-tight`}
              >
                <span className="block text-[13px] font-semibold">{row.labelAr}</span>
                {showTimes && row.timeRange && (
                  <span className="latin mt-px block text-[10px] font-normal tabular-nums text-[color:var(--doc-muted)]">
                    {row.timeRange}
                  </span>
                )}
              </th>
            ) : (
              <th
                key={row.index}
                scope="col"
                className={`${cell} bg-[color:var(--doc-band)] px-0.5 py-1.5 leading-tight`}
              >
                <span className="block text-[10px] font-medium text-[color:var(--doc-muted)]">
                  {row.labelAr}
                </span>
                {showTimes && row.timeRange && (
                  <span className="latin mt-px block text-[8.5px] tabular-nums text-[color:var(--doc-muted)]">
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
              className={`${cell} bg-[color:var(--doc-head)] px-1 py-2 leading-tight`}
            >
              <span className="block text-[16px] font-bold">{day.nameAr}</span>
              {day.nameEn && (
                <span className="latin block text-[10px] font-normal text-[color:var(--doc-muted)]">
                  {day.nameEn}
                </span>
              )}
              {grid.daysWithOwnTimes.has(day.id) && (
                <span className="mt-0.5 block text-[8.5px] font-normal text-[color:var(--doc-muted)]">
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
                    className={`${cell} bg-[color:var(--doc-band)] px-1 py-3`}
                    aria-label={period?.labelAr ?? 'لا توجد حصة'}
                  />
                );
              }

              const lesson = bySlot.get(slotKey(day.id, row.index));
              if (!lesson) {
                return (
                  <td key={row.index} className={`${cell} px-1 py-3`}>
                    <span className="text-[13px] text-[color:var(--doc-muted)]">ــ</span>
                  </td>
                );
              }

              const subject = index.subjectById.get(lesson.subjectId);
              const section = index.sectionById.get(lesson.sectionId);
              const teacher = lesson.teacherId ? index.teacherById.get(lesson.teacherId) : null;
              const room = lesson.roomId ? index.roomById.get(lesson.roomId) : null;

              /* في جدول المعلمة يتصدّر رقم الشعبة، وفي جدول الشعبة يتصدّر اسم المعلمة. */
              const headline =
                context === 'teacher' ? (section?.label ?? 'ــ') : (subject?.nameAr ?? 'ــ');
              const bodyAr =
                context === 'teacher' ? (subject?.nameAr ?? '') : (teacher?.nameAr ?? 'ــ');
              const bodyEn =
                context === 'teacher' ? (subject?.nameEn ?? '') : (teacher?.nameEn ?? '');

              return (
                <td key={row.index} className={`${cell} px-1 py-1.5 leading-tight`}>
                  <span className="block text-[13px] font-bold">
                    {lesson.variant && <span className="ms-0.5">{lesson.variant.icon}</span>}
                    {context === 'teacher' ? <span className="latin">{headline}</span> : headline}
                  </span>
                  {bodyAr && <span className="block text-[12px]">{bodyAr}</span>}
                  {bodyEn && (
                    <span className="latin block text-[9.5px] text-[color:var(--doc-muted)]">
                      {bodyEn}
                    </span>
                  )}
                  {lesson.variant && (
                    <span className="block text-[9.5px] text-[color:var(--doc-muted)]">
                      {lesson.variant.labelAr}
                    </span>
                  )}
                  {room && (
                    <span className="block text-[9.5px] text-[color:var(--doc-muted)]">
                      {room.nameAr}
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
