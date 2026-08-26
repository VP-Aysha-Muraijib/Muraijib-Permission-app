/**
 * بيانات تجريبية — للتقييم البصري فقط.
 *
 * لا تُعامَل هذه البيانات على أنها بيانات المدرسة. أسماء المعلمات رقمية صراحةً
 * ("معلمة ١") حتى لا تلتبس ببيانات حقيقية، وتعرض الواجهة شريطًا دائمًا يوضح ذلك
 * إلى أن تُستورد بيانات المدرسة الفعلية من مركز الاستيراد.
 *
 * الجدول التجريبي **يُبنى** بمولّد يحترم القيود الصارمة، لا بأرقام مكتوبة يدويًا،
 * حتى يكون جدولًا صالحًا فعلًا لا واجهة مزيّفة.
 */

import type {
  CurriculumEntry,
  Department,
  Grade,
  Lesson,
  Room,
  ScheduleSnapshot,
  SchoolDay,
  Section,
  Subject,
  Teacher,
} from '@/lib/domain/types';

export const DEMO_FLAG = 'demo';

const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
export const toArabicDigits = (n: number | string) =>
  String(n).replace(/\d/g, (d) => AR_DIGITS[Number(d)]);

/* ────────── أسبوع الدراسة ────────── */

const DAY_DEFS = [
  { id: 'sun', weekday: 0, nameAr: 'الأحد', teaching: 7 },
  { id: 'mon', weekday: 1, nameAr: 'الاثنين', teaching: 7 },
  { id: 'tue', weekday: 2, nameAr: 'الثلاثاء', teaching: 7 },
  { id: 'wed', weekday: 3, nameAr: 'الأربعاء', teaching: 7 },
  { id: 'thu', weekday: 4, nameAr: 'الخميس', teaching: 5 },
];

const time = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

function buildDay(def: (typeof DAY_DEFS)[number], sort: number): SchoolDay {
  const periods: SchoolDay['periods'] = [];
  let cursor = 7 * 60 + 15; // 07:15 الطابور
  let lessonNo = 0;
  let index = 1;

  periods.push({ index: index++, kind: 'assembly', labelAr: 'الطابور', startTime: time(cursor), endTime: time(cursor + 15) });
  cursor += 15;

  // فسحة بعد الحصة الثالثة، وصلاة بعد الخامسة في الأيام الطويلة.
  const breakAfter = 3;
  const prayerAfter = def.teaching >= 7 ? 5 : -1;

  while (lessonNo < def.teaching) {
    lessonNo += 1;
    periods.push({
      index: index++,
      kind: 'lesson',
      labelAr: `الحصة ${toArabicDigits(lessonNo)}`,
      startTime: time(cursor),
      endTime: time(cursor + 45),
    });
    cursor += 45;

    if (lessonNo === breakAfter && lessonNo < def.teaching) {
      periods.push({ index: index++, kind: 'break', labelAr: 'الفسحة', startTime: time(cursor), endTime: time(cursor + 30) });
      cursor += 30;
    }
    if (lessonNo === prayerAfter && lessonNo < def.teaching) {
      periods.push({ index: index++, kind: 'prayer', labelAr: 'الصلاة', startTime: time(cursor), endTime: time(cursor + 20) });
      cursor += 20;
    }
  }

  return { id: def.id, weekday: def.weekday, nameAr: def.nameAr, isTeaching: true, sort, periods };
}

/* ────────── الأقسام والمواد ────────── */

const departments: Department[] = [
  { id: 'dep-ar', nameAr: 'اللغة العربية والدراسات الإسلامية', color: '#8b5a3c' },
  { id: 'dep-en', nameAr: 'اللغة الإنجليزية', color: '#2f6f8f' },
  { id: 'dep-sci', nameAr: 'العلوم والرياضيات', color: '#2e6b52' },
  { id: 'dep-soc', nameAr: 'الدراسات الاجتماعية', color: '#8a6a2f' },
  { id: 'dep-skills', nameAr: 'المهارات والأنشطة', color: '#6b5b8f' },
];

interface SubjectDef {
  id: string;
  code: string;
  nameAr: string;
  dep: string;
  color: string;
  weekly: number;
  maxPerDay: number;
  core: boolean;
  lab?: boolean;
}

const SUBJECT_DEFS: SubjectDef[] = [
  { id: 'arab', code: 'AR', nameAr: 'اللغة العربية', dep: 'dep-ar', color: '#8b5a3c', weekly: 6, maxPerDay: 2, core: true },
  { id: 'isl', code: 'IS', nameAr: 'التربية الإسلامية', dep: 'dep-ar', color: '#4b7a52', weekly: 4, maxPerDay: 1, core: true },
  { id: 'eng', code: 'EN', nameAr: 'اللغة الإنجليزية', dep: 'dep-en', color: '#2f6f8f', weekly: 6, maxPerDay: 2, core: true },
  { id: 'math', code: 'MA', nameAr: 'الرياضيات', dep: 'dep-sci', color: '#2c5f9e', weekly: 5, maxPerDay: 2, core: true },
  { id: 'sci', code: 'SC', nameAr: 'العلوم', dep: 'dep-sci', color: '#2e6b52', weekly: 4, maxPerDay: 1, core: true, lab: true },
  { id: 'soc', code: 'SO', nameAr: 'الدراسات الاجتماعية', dep: 'dep-soc', color: '#8a6a2f', weekly: 3, maxPerDay: 1, core: false },
  { id: 'ict', code: 'IT', nameAr: 'التصميم والتقنية', dep: 'dep-skills', color: '#6b5b8f', weekly: 2, maxPerDay: 1, core: false, lab: true },
  { id: 'art', code: 'AT', nameAr: 'الفنون البصرية', dep: 'dep-skills', color: '#a05a7a', weekly: 1, maxPerDay: 1, core: false },
  { id: 'pe', code: 'PE', nameAr: 'التربية الرياضية', dep: 'dep-skills', color: '#3f7f6f', weekly: 1, maxPerDay: 1, core: false },
  { id: 'moral', code: 'MO', nameAr: 'التربية الأخلاقية', dep: 'dep-soc', color: '#7a6a5a', weekly: 1, maxPerDay: 1, core: false },
];

const subjects: Subject[] = SUBJECT_DEFS.map((d) => ({
  id: d.id,
  code: d.code,
  nameAr: d.nameAr,
  departmentId: d.dep,
  color: d.color,
  needsLab: Boolean(d.lab),
  roomKind: d.lab ? 'lab' : null,
  maxPerDay: d.maxPerDay,
  allowsDouble: d.weekly >= 4,
  preferredDistribution: 'spread',
  isCore: d.core,
}));

/* ────────── الصفوف والشعب ────────── */

const GRADE_LEVELS = [6, 7, 8];
const SECTIONS_PER_GRADE = 3;

const grades: Grade[] = GRADE_LEVELS.map((level, i) => ({
  id: `g${level}`,
  level,
  nameAr: `الصف ${['السادس', 'السابع', 'الثامن'][i]}`,
  sort: level,
}));

const sections: Section[] = grades.flatMap((grade) =>
  Array.from({ length: SECTIONS_PER_GRADE }, (_, i) => ({
    id: `${grade.id}-${i + 1}`,
    gradeId: grade.id,
    name: String(i + 1),
    label: `${grade.level}/${i + 1}`,
    studentCount: 24 + i,
    classTeacherId: null,
    isActive: true,
  })),
);

const curriculum: CurriculumEntry[] = grades.flatMap((grade) =>
  SUBJECT_DEFS.map((s) => ({ gradeId: grade.id, subjectId: s.id, weeklyLessons: s.weekly })),
);

const rooms: Room[] = [
  { id: 'lab-sci', nameAr: 'مختبر العلوم', kind: 'lab', capacity: 30 },
  { id: 'lab-ict', nameAr: 'معمل الحاسوب', kind: 'lab', capacity: 28 },
  { id: 'hall', nameAr: 'الصالة الرياضية', kind: 'hall', capacity: 60 },
];

/* ────────── المعلمات ────────── */

/** عدد الحصص الأسبوعية لكل مادة على مستوى المدرسة (٩ شعب). */
const totalFor = (subjectId: string) =>
  SUBJECT_DEFS.find((s) => s.id === subjectId)!.weekly * sections.length;

/** كم معلمة لكل مادة، بحيث يبقى النصاب في حدود معقولة. */
const STAFFING: Array<{ subjectIds: string[]; count: number }> = [
  { subjectIds: ['arab'], count: 3 },
  { subjectIds: ['isl'], count: 2 },
  { subjectIds: ['eng'], count: 3 },
  { subjectIds: ['math'], count: 3 },
  { subjectIds: ['sci'], count: 2 },
  { subjectIds: ['soc', 'moral'], count: 2 },
  { subjectIds: ['ict'], count: 1 },
  { subjectIds: ['art'], count: 1 },
  { subjectIds: ['pe'], count: 1 },
];

function buildTeachers(): Teacher[] {
  const out: Teacher[] = [];
  let n = 0;
  for (const group of STAFFING) {
    const totalLessons = group.subjectIds.reduce((a, s) => a + totalFor(s), 0);
    const base = Math.ceil(totalLessons / group.count);
    for (let i = 0; i < group.count; i++) {
      n += 1;
      const primary = group.subjectIds[0];
      out.push({
        id: `t${n}`,
        nameAr: `معلمة ${toArabicDigits(n)}`,
        departmentId: SUBJECT_DEFS.find((s) => s.id === primary)!.dep,
        primarySubjectId: primary,
        subjectIds: [...group.subjectIds],
        requiredLoad: base,
        maxLoad: base + 4,
        status: 'active',
        unavailable: [],
        preferences: [],
      });
    }
  }
  return out;
}

/* ────────── مولّد الجدول التجريبي ────────── */

const slotKey = (dayId: string, periodIndex: number) => `${dayId}#${periodIndex}`;

/**
 * مولّد حتمي (بلا عشوائية) يبني جدولًا صالحًا فعلًا.
 *
 * يعمل بترتيب الخانات لا بترتيب المواد: في كل خانة زمنية تُملأ كل الشعب،
 * وتُختار المادة الأكثر إلحاحًا (المتبقي منها مقسومًا على الأيام التي ما زال
 * مسموحًا وضعها فيها). هذا الترتيب يحلّ التعارضات بين الشعب على المعلمة الواحدة
 * لحظة حدوثها، ويعطي في الوقت نفسه توزيعًا جيدًا للمادة على أيام الأسبوع.
 */
function generateLessons(
  days: SchoolDay[],
  teachers: Teacher[],
): { lessons: Lesson[]; teachers: Teacher[] } {
  const teachingSlots = days.flatMap((day) =>
    day.periods
      .filter((p) => p.kind === 'lesson')
      .map((p) => ({ dayId: day.id, periodIndex: p.index })),
  );
  const teachingDayIds = days.filter((d) => d.isTeaching).map((d) => d.id);

  const teacherBusy = new Map<string, Set<string>>();
  const teacherLoad = new Map<string, number>();
  const teacherBlocked = new Map<string, Set<string>>(
    teachers.map((t) => [t.id, new Set(t.unavailable.map((s) => slotKey(s.dayId, s.periodIndex)))]),
  );
  const roomBusy = new Map<string, Set<string>>();

  /** المتبقي من كل مادة لكل شعبة. */
  const remaining = new Map<string, Map<string, number>>();
  /** عدد حصص المادة الموضوعة لكل شعبة في كل يوم. */
  const dayCount = new Map<string, number>();

  for (const section of sections) {
    const perSubject = new Map<string, number>();
    for (const def of SUBJECT_DEFS) perSubject.set(def.id, def.weekly);
    remaining.set(section.id, perSubject);
  }

  // المعلمة المسندة لكل (شعبة، مادة) — بالتناوب حتى تتوزّع الشعب على معلمات المادة.
  const teacherFor = new Map<string, string>();
  for (const def of SUBJECT_DEFS) {
    const pool = teachers.filter((t) => t.subjectIds.includes(def.id));
    if (pool.length === 0) continue;
    sections.forEach((section, i) => {
      teacherFor.set(`${section.id}#${def.id}`, pool[i % pool.length].id);
    });
  }

  const busyOf = (map: Map<string, Set<string>>, id: string) => {
    let set = map.get(id);
    if (!set) {
      set = new Set();
      map.set(id, set);
    }
    return set;
  };

  const freeTeacherFor = (subjectId: string, sectionId: string, key: string): string | null => {
    const preferred = teacherFor.get(`${sectionId}#${subjectId}`);
    const canTake = (id: string) => {
      const teacher = teachers.find((t) => t.id === id);
      if (!teacher) return false;
      if (busyOf(teacherBusy, id).has(key)) return false;
      if (teacherBlocked.get(id)?.has(key)) return false;
      return (teacherLoad.get(id) ?? 0) < teacher.maxLoad;
    };
    if (preferred && canTake(preferred)) return preferred;
    // بديلة مؤهلة — أقلّهن نصابًا حتى يتوازن التوزيع.
    const alt = teachers
      .filter((t) => t.subjectIds.includes(subjectId) && canTake(t.id))
      .sort((a, b) => (teacherLoad.get(a.id) ?? 0) - (teacherLoad.get(b.id) ?? 0))[0];
    return alt?.id ?? null;
  };

  const lessons: Lesson[] = [];
  const lessonAtSection = new Map<string, Lesson>(); // "sectionId#slot" → الحصة
  const lessonAtTeacher = new Map<string, Lesson>(); // "teacherId#slot" → الحصة
  let lessonNo = 0;

  teachingSlots.forEach((slot, slotIndex) => {
    const key = slotKey(slot.dayId, slot.periodIndex);
    const daysLeftFrom = teachingDayIds.slice(teachingDayIds.indexOf(slot.dayId));

    // تدوير ترتيب الشعب بين الخانات حتى لا تحظى الشعبة الأولى دائمًا بالأولوية.
    const order = sections.map((_, i) => sections[(i + slotIndex) % sections.length]);

    for (const section of order) {
      const perSubject = remaining.get(section.id)!;

      let bestId: string | null = null;
      let bestUrgency = -1;

      for (const def of SUBJECT_DEFS) {
        const left = perSubject.get(def.id) ?? 0;
        if (left <= 0) continue;
        if ((dayCount.get(`${section.id}#${def.id}#${slot.dayId}`) ?? 0) >= def.maxPerDay) continue;
        if (!freeTeacherFor(def.id, section.id, key)) continue;

        // فرص الوضع المتبقية = عدد الأيام (من اليوم الحالي) التي ما زال فيها متسع للمادة.
        const opportunities = daysLeftFrom.reduce((acc, dayId) => {
          const used = dayCount.get(`${section.id}#${def.id}#${dayId}`) ?? 0;
          return acc + Math.max(0, def.maxPerDay - used);
        }, 0);

        const urgency = opportunities === 0 ? Number.POSITIVE_INFINITY : left / opportunities;
        if (urgency > bestUrgency) {
          bestUrgency = urgency;
          bestId = def.id;
        }
      }

      if (!bestId) continue;

      const def = SUBJECT_DEFS.find((s) => s.id === bestId)!;
      const teacherId = freeTeacherFor(def.id, section.id, key)!;

      // الغرف الخاصة: تُسند فقط إن كانت شاغرة، وإلا تُترك الحصة بلا غرفة بدل تعارض.
      let roomId: string | null = null;
      if (def.lab) {
        const candidate = def.id === 'sci' ? 'lab-sci' : 'lab-ict';
        if (!busyOf(roomBusy, candidate).has(key)) {
          roomId = candidate;
          busyOf(roomBusy, candidate).add(key);
        }
      }

      lessonNo += 1;
      const lesson: Lesson = {
        id: `dl${lessonNo}`,
        sectionId: section.id,
        subjectId: def.id,
        teacherId,
        dayId: slot.dayId,
        periodIndex: slot.periodIndex,
        roomId,
        isLocked: false,
      };
      lessons.push(lesson);
      lessonAtSection.set(`${section.id}#${key}`, lesson);
      lessonAtTeacher.set(`${teacherId}#${key}`, lesson);

      perSubject.set(def.id, (perSubject.get(def.id) ?? 0) - 1);
      dayCount.set(
        `${section.id}#${def.id}#${slot.dayId}`,
        (dayCount.get(`${section.id}#${def.id}#${slot.dayId}`) ?? 0) + 1,
      );
      busyOf(teacherBusy, teacherId).add(key);
      teacherLoad.set(teacherId, (teacherLoad.get(teacherId) ?? 0) + 1);
    }
  });

  /**
   * جولة إصلاح بإزاحة واحدة.
   *
   * تبقى عادةً حصص قليلة بلا موضع: الخانة الوحيدة الشاغرة لدى الشعبة تصادف
   * انشغال كل معلمات المادة فيها. الحل ليس ترك النقص، بل إزاحة حصة واحدة:
   * تُنقل حصة المعلمة من تلك الخانة إلى خانة شاغرة لدى شعبتها، فتتحرر لحصتنا.
   */
  const dayOf = (key: string) => key.split('#')[0];

  const freeSlotsOfSection = (sectionId: string) =>
    teachingSlots
      .map((s) => slotKey(s.dayId, s.periodIndex))
      .filter((key) => !lessonAtSection.has(`${sectionId}#${key}`));

  const canHost = (sectionId: string, subjectId: string, key: string, ignore?: Lesson) => {
    const def = SUBJECT_DEFS.find((s) => s.id === subjectId)!;
    const used = dayCount.get(`${sectionId}#${subjectId}#${dayOf(key)}`) ?? 0;
    const adjusted = ignore && ignore.dayId === dayOf(key) ? used - 1 : used;
    return adjusted < def.maxPerDay;
  };

  const place = (sectionId: string, def: SubjectDef, teacherId: string, key: string) => {
    const [dayId, periodIndex] = key.split('#');
    lessonNo += 1;
    const lesson: Lesson = {
      id: `dl${lessonNo}`,
      sectionId,
      subjectId: def.id,
      teacherId,
      dayId,
      periodIndex: Number(periodIndex),
      roomId: null,
      isLocked: false,
    };
    lessons.push(lesson);
    lessonAtSection.set(`${sectionId}#${key}`, lesson);
    lessonAtTeacher.set(`${teacherId}#${key}`, lesson);
    busyOf(teacherBusy, teacherId).add(key);
    teacherLoad.set(teacherId, (teacherLoad.get(teacherId) ?? 0) + 1);
    const dk = `${sectionId}#${def.id}#${dayId}`;
    dayCount.set(dk, (dayCount.get(dk) ?? 0) + 1);
    remaining.get(sectionId)!.set(def.id, (remaining.get(sectionId)!.get(def.id) ?? 0) - 1);
  };

  for (const section of sections) {
    const perSubject = remaining.get(section.id)!;
    for (const def of SUBJECT_DEFS) {
      let left = perSubject.get(def.id) ?? 0;
      while (left > 0) {
        let done = false;

        for (const key of freeSlotsOfSection(section.id)) {
          if (!canHost(section.id, def.id, key)) continue;

          // ① معلمة متاحة مباشرةً
          const direct = freeTeacherFor(def.id, section.id, key);
          if (direct) {
            place(section.id, def, direct, key);
            done = true;
            break;
          }

          // ② إزاحة واحدة: أفرغ المعلمة من هذه الخانة بنقل حصتها إلى خانة شاغرة لدى شعبتها.
          for (const teacher of teachers) {
            if (!teacher.subjectIds.includes(def.id)) continue;
            if (teacherBlocked.get(teacher.id)?.has(key)) continue;
            if ((teacherLoad.get(teacher.id) ?? 0) >= teacher.maxLoad) continue;

            const blockingLesson = lessonAtTeacher.get(`${teacher.id}#${key}`);
            if (!blockingLesson) continue;

            const target = freeSlotsOfSection(blockingLesson.sectionId).find(
              (candidate) =>
                candidate !== key &&
                !busyOf(teacherBusy, teacher.id).has(candidate) &&
                !teacherBlocked.get(teacher.id)?.has(candidate) &&
                canHost(blockingLesson.sectionId, blockingLesson.subjectId, candidate, blockingLesson),
            );
            if (!target) continue;

            // نقل الحصة المُزاحة
            lessonAtSection.delete(`${blockingLesson.sectionId}#${key}`);
            lessonAtTeacher.delete(`${teacher.id}#${key}`);
            busyOf(teacherBusy, teacher.id).delete(key);
            const oldDk = `${blockingLesson.sectionId}#${blockingLesson.subjectId}#${blockingLesson.dayId}`;
            dayCount.set(oldDk, (dayCount.get(oldDk) ?? 1) - 1);
            if (blockingLesson.roomId) busyOf(roomBusy, blockingLesson.roomId).delete(key);

            const [newDay, newPeriod] = target.split('#');
            blockingLesson.dayId = newDay;
            blockingLesson.periodIndex = Number(newPeriod);
            blockingLesson.roomId = null;
            lessonAtSection.set(`${blockingLesson.sectionId}#${target}`, blockingLesson);
            lessonAtTeacher.set(`${teacher.id}#${target}`, blockingLesson);
            busyOf(teacherBusy, teacher.id).add(target);
            const newDk = `${blockingLesson.sectionId}#${blockingLesson.subjectId}#${newDay}`;
            dayCount.set(newDk, (dayCount.get(newDk) ?? 0) + 1);

            place(section.id, def, teacher.id, key);
            done = true;
            break;
          }
          if (done) break;
        }

        // ③ إزاحة داخل الشعبة نفسها: إن كانت خانتها الشاغرة الوحيدة مغلقة على معلمات المادة،
        //    تُنقل إحدى حصص الشعبة إلى تلك الخانة لتتحرر خانتها لمعلمة المادة.
        if (!done) {
          const free = freeSlotsOfSection(section.id);
          for (const emptyKey of free) {
            for (const teacher of teachers) {
              if (!teacher.subjectIds.includes(def.id)) continue;
              if ((teacherLoad.get(teacher.id) ?? 0) >= teacher.maxLoad) continue;

              const openKey = teachingSlots
                .map((sl) => slotKey(sl.dayId, sl.periodIndex))
                .find((candidate) => {
                  if (candidate === emptyKey) return false;
                  if (busyOf(teacherBusy, teacher.id).has(candidate)) return false;
                  if (teacherBlocked.get(teacher.id)?.has(candidate)) return false;
                  if (!canHost(section.id, def.id, candidate)) return false;
                  const occupant = lessonAtSection.get(`${section.id}#${candidate}`);
                  if (!occupant || !occupant.teacherId) return false;
                  // معلمة الحصة المُزاحة يجب أن تكون متاحة في الخانة الشاغرة
                  if (busyOf(teacherBusy, occupant.teacherId).has(emptyKey)) return false;
                  if (teacherBlocked.get(occupant.teacherId)?.has(emptyKey)) return false;
                  return canHost(section.id, occupant.subjectId, emptyKey, occupant);
                });
              if (!openKey) continue;

              const occupant = lessonAtSection.get(`${section.id}#${openKey}`)!;
              const occupantTeacher = occupant.teacherId!;

              lessonAtSection.delete(`${section.id}#${openKey}`);
              lessonAtTeacher.delete(`${occupantTeacher}#${openKey}`);
              busyOf(teacherBusy, occupantTeacher).delete(openKey);
              const oldDk = `${section.id}#${occupant.subjectId}#${occupant.dayId}`;
              dayCount.set(oldDk, (dayCount.get(oldDk) ?? 1) - 1);
              if (occupant.roomId) busyOf(roomBusy, occupant.roomId).delete(openKey);

              const [movedDay, movedPeriod] = emptyKey.split('#');
              occupant.dayId = movedDay;
              occupant.periodIndex = Number(movedPeriod);
              occupant.roomId = null;
              lessonAtSection.set(`${section.id}#${emptyKey}`, occupant);
              lessonAtTeacher.set(`${occupantTeacher}#${emptyKey}`, occupant);
              busyOf(teacherBusy, occupantTeacher).add(emptyKey);
              const newDk = `${section.id}#${occupant.subjectId}#${movedDay}`;
              dayCount.set(newDk, (dayCount.get(newDk) ?? 0) + 1);

              place(section.id, def, teacher.id, openKey);
              done = true;
              break;
            }
            if (done) break;
          }
        }

        if (!done) break; // لا حل بإزاحة واحدة — يُترك النقص ظاهرًا في فحص الصحة
        left = perSubject.get(def.id) ?? 0;
      }
    }
  }

  /**
   * الأنصبة في المدارس نادرًا ما تكون مطابقة تمامًا لما أُسند: بعض المعلمات
   * دون نصابهن المقرّر وبعضهن عليه بالضبط. تُحاكى هذه الفجوة بنمط ثابت
   * (لا عشوائي) حتى تعكس لوحة الأنصبة واقعًا يُتخذ عليه قرار، لا صفوفًا كلها خضراء.
   */
  const SHORTFALL_PATTERN = [0, 0, 2, 0, 1, 0, 0, 3, 0, 1];
  const balanced = teachers.map((t, i) => {
    const assigned = teacherLoad.get(t.id) ?? 0;
    const requiredLoad = assigned + SHORTFALL_PATTERN[i % SHORTFALL_PATTERN.length];
    return { ...t, requiredLoad, maxLoad: requiredLoad + 3 };
  });

  return { lessons, teachers: balanced };
}

/* ────────── اللقطة التجريبية ────────── */

export function buildDemoSnapshot(): ScheduleSnapshot {
  const days = DAY_DEFS.map((d, i) => buildDay(d, i));

  // القيود تُطبَّق **قبل** التوليد، لا بعده — وإلا وُلِّد جدول يخالفها.
  const baseTeachers = buildTeachers().map((t) => {
    if (t.id === 't1') {
      return {
        ...t,
        unavailable: [{ dayId: 'thu', periodIndex: 2 }],
        preferences: [{ dayId: 'sun', periodIndex: 2, kind: 'preferred' as const, weight: 2 }],
        notes: 'قيد تجريبي: غير متاحة يوم الخميس في الحصة الأولى.',
      };
    }
    if (t.id === 't5') {
      return {
        ...t,
        preferences: [{ dayId: 'thu', periodIndex: 8, kind: 'avoided' as const, weight: 2 }],
      };
    }
    return t;
  });

  const { lessons, teachers } = generateLessons(days, baseTeachers);

  return {
    versionId: 'demo-v1',
    week: { yearLabel: '2026–2027', schoolNameAr: 'مدرسة مريجب', days },
    departments,
    subjects,
    teachers,
    grades,
    sections,
    curriculum,
    rooms,
    lessons,
    locks: [],
  };
}
