import type { Lesson } from '@/lib/domain/types';
import type { SnapshotIndex } from '@/lib/engine/snapshot';
import { slotKey } from '@/lib/engine/snapshot';
import { buildGrid, periodOf } from '@/lib/engine/grid';

/**
 * شبكة الجدول المطبوعة.
 *
 * تختلف عن شبكة الشاشة: حدود صريحة قابلة للطباعة بالأبيض والأسود، وبلا خلفيات
 * ملوّنة تستهلك الحبر، وبلا أي عنصر تفاعلي.
 */
export function PrintGrid({
  index,
  lessons,
  context,
  showTimes = true,
}: {
  index: SnapshotIndex;
  lessons: Lesson[];
  context: 'teacher' | 'class';
  showTimes?: boolean;
}) {
  const grid = buildGrid(index.snapshot.week);
  const bySlot = new Map(lessons.map((l) => [slotKey(l.dayId, l.periodIndex), l]));

  return (
    <table className="w-full border-collapse text-center">
      <thead>
        <tr>
          <th className="w-[16%] border border-black/70 bg-black/[.06] px-1 py-1 text-[9pt] font-bold">
            الحصة
          </th>
          {grid.days.map((day) => (
            <th
              key={day.id}
              className="border border-black/70 bg-black/[.06] px-1 py-1 text-[9pt] font-bold"
            >
              {day.nameAr}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {grid.rows.map((row) => {
          if (row.kind !== 'lesson') {
            return (
              <tr key={row.index}>
                <td
                  colSpan={grid.days.length + 1}
                  className="border border-black/70 bg-black/[.04] px-1 py-0.5 text-[8pt] font-medium"
                >
                  {row.labelAr}
                  {showTimes && <span className="mr-2 text-black/55">{row.timeRange}</span>}
                </td>
              </tr>
            );
          }

          return (
            <tr key={row.index}>
              <th className="border border-black/70 bg-black/[.03] px-1 py-1 text-[8.5pt] font-semibold">
                <span className="block">{row.labelAr}</span>
                {showTimes && (
                  <span className="ltr-run block text-[7pt] font-normal text-black/55">
                    {row.timeRange}
                  </span>
                )}
              </th>

              {grid.days.map((day) => {
                const period = periodOf(day, row.index);
                if (period?.kind !== 'lesson') {
                  return (
                    <td key={day.id} className="border border-black/70 bg-black/[.05] px-1 py-2" />
                  );
                }

                const lesson = bySlot.get(slotKey(day.id, row.index));
                if (!lesson) {
                  return (
                    <td key={day.id} className="border border-black/70 px-1 py-2 align-middle">
                      <span className="text-[8pt] text-black/35">—</span>
                    </td>
                  );
                }

                const subject = index.subjectById.get(lesson.subjectId);
                const section = index.sectionById.get(lesson.sectionId);
                const teacher = lesson.teacherId ? index.teacherById.get(lesson.teacherId) : null;
                const room = lesson.roomId ? index.roomById.get(lesson.roomId) : null;

                return (
                  <td key={day.id} className="border border-black/70 px-1 py-1 align-middle">
                    <span className="block text-[9pt] font-bold leading-tight">
                      {context === 'teacher' ? section?.label : subject?.nameAr}
                    </span>
                    <span className="block text-[8pt] leading-tight">
                      {context === 'teacher' ? subject?.nameAr : (teacher?.nameAr ?? '—')}
                    </span>
                    {room && <span className="block text-[7pt] leading-tight text-black/55">{room.nameAr}</span>}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
