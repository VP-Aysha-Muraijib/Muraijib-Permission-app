import type {
  CurriculumEntry,
  Lesson,
  ScheduleSnapshot,
  SchoolDay,
  Section,
  Subject,
  Teacher,
} from '@/lib/domain/types';

const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

export function makeDay(i: number, periodCount = 6): SchoolDay {
  return {
    id: `d${i}`,
    weekday: i,
    nameAr: DAY_NAMES[i] ?? `يوم ${i}`,
    isTeaching: true,
    sort: i,
    periods: Array.from({ length: periodCount }, (_, k) => ({
      index: k + 1,
      kind: 'lesson' as const,
      labelAr: `الحصة ${k + 1}`,
      startTime: `0${7 + k}:30`.slice(-5),
      endTime: `0${8 + k}:15`.slice(-5),
    })),
  };
}

export interface FixtureOptions {
  days?: number;
  periods?: number;
  teachers?: Teacher[];
  subjects?: Subject[];
  sections?: Section[];
  curriculum?: CurriculumEntry[];
  lessons?: Lesson[];
}

export function makeSnapshot(options: FixtureOptions = {}): ScheduleSnapshot {
  const days = Array.from({ length: options.days ?? 5 }, (_, i) => makeDay(i, options.periods ?? 6));

  const subjects: Subject[] = options.subjects ?? [
    {
      id: 'math',
      code: 'MATH',
      nameAr: 'الرياضيات',
      departmentId: null,
      color: '#2563eb',
      needsLab: false,
      roomKind: null,
      maxPerDay: 2,
      allowsDouble: true,
      preferredDistribution: 'spread',
      isCore: true,
    },
    {
      id: 'sci',
      code: 'SCI',
      nameAr: 'العلوم',
      departmentId: null,
      color: '#059669',
      needsLab: true,
      roomKind: 'lab',
      maxPerDay: 1,
      allowsDouble: false,
      preferredDistribution: 'spread',
      isCore: true,
    },
  ];

  const teachers: Teacher[] = options.teachers ?? [
    {
      id: 't1',
      nameAr: 'المعلمة أ',
      departmentId: null,
      primarySubjectId: 'math',
      subjectIds: ['math'],
      requiredLoad: 4,
      maxLoad: 6,
      status: 'active',
      unavailable: [],
      preferences: [],
    },
    {
      id: 't2',
      nameAr: 'المعلمة ب',
      departmentId: null,
      primarySubjectId: 'sci',
      subjectIds: ['sci'],
      requiredLoad: 4,
      maxLoad: 6,
      status: 'active',
      unavailable: [],
      preferences: [],
    },
  ];

  const sections: Section[] = options.sections ?? [
    { id: 's1', gradeId: 'g6', name: '1', label: '6/1', classTeacherId: null, isActive: true },
  ];

  const curriculum: CurriculumEntry[] = options.curriculum ?? [
    { gradeId: 'g6', subjectId: 'math', weeklyLessons: 2 },
    { gradeId: 'g6', subjectId: 'sci', weeklyLessons: 2 },
  ];

  const lessons: Lesson[] = options.lessons ?? [
    { id: 'l1', sectionId: 's1', subjectId: 'math', teacherId: 't1', dayId: 'd0', periodIndex: 1, roomId: null, isLocked: false },
    { id: 'l2', sectionId: 's1', subjectId: 'math', teacherId: 't1', dayId: 'd1', periodIndex: 1, roomId: null, isLocked: false },
    { id: 'l3', sectionId: 's1', subjectId: 'sci', teacherId: 't2', dayId: 'd2', periodIndex: 1, roomId: null, isLocked: false },
    { id: 'l4', sectionId: 's1', subjectId: 'sci', teacherId: 't2', dayId: 'd3', periodIndex: 1, roomId: null, isLocked: false },
  ];

  return {
    versionId: 'v1',
    week: { yearLabel: '2026–2027', schoolNameAr: 'مدرسة مريجب', days },
    departments: [],
    subjects,
    teachers,
    grades: [{ id: 'g6', level: 6, nameAr: 'الصف السادس', sort: 6 }],
    sections,
    curriculum,
    rooms: [{ id: 'lab1', nameAr: 'مختبر العلوم', kind: 'lab' }],
    lessons,
    locks: [],
  };
}
