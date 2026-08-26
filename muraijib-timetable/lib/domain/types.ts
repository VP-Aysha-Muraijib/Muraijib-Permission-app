/**
 * Muraijib Smart Timetable — Domain model.
 *
 * لا يعتمد هذا الملف على React ولا على قاعدة البيانات ولا على الشبكة.
 * كل ما في المنظومة من منطق جدولة يتحدث بهذه الأنواع.
 */

export type ID = string;

/* ────────────────────────── أسبوع الدراسة ────────────────────────── */

/** نوع الفترة: ليست كل الفترات حصصًا دراسية. */
export type PeriodKind = 'lesson' | 'break' | 'prayer' | 'assembly' | 'reserved';

export interface Period {
  index: number;          // ترتيب الفترة داخل اليوم، يبدأ من 1
  kind: PeriodKind;
  labelAr: string;        // "الحصة الأولى" / "الفسحة"
  labelEn?: string;
  startTime: string;      // "07:30"
  endTime: string;        // "08:15"
}

export interface SchoolDay {
  id: ID;
  weekday: number;        // 0 = الأحد … 6 = السبت
  nameAr: string;
  nameEn?: string;
  isTeaching: boolean;
  sort: number;
  /** لكل يوم فتراته الخاصة — لا يُفترض أن الأيام متطابقة. */
  periods: Period[];
}

export interface SchoolWeek {
  yearLabel: string;      // "2026–2027"
  schoolNameAr: string;
  schoolNameEn?: string;
  days: SchoolDay[];
}

/* ────────────────────────── الكيانات ────────────────────────── */

export interface Department {
  id: ID;
  nameAr: string;
  color: string;
}

export type RoomKind = 'classroom' | 'lab' | 'hall' | 'field' | 'other';

export interface Room {
  id: ID;
  nameAr: string;
  kind: RoomKind;
  capacity?: number;
}

/** كيف يُفضَّل توزيع حصص المادة على أيام الأسبوع. */
export type Distribution = 'spread' | 'paired' | 'any';

export interface Subject {
  id: ID;
  code: string;
  nameAr: string;
  nameEn?: string;
  departmentId: ID | null;
  color: string;
  needsLab: boolean;
  roomKind: RoomKind | null;
  /** الحد الأقصى لتكرار المادة للشعبة الواحدة في اليوم الواحد. */
  maxPerDay: number;
  allowsDouble: boolean;
  preferredDistribution: Distribution;
  /** مادة أساسية → تُفضَّل في الحصص المبكرة. */
  isCore: boolean;
  notes?: string;
}

export type TeacherStatus =
  | 'active'
  | 'new'
  | 'transferred'
  | 'on_leave'
  | 'unavailable';

/** خانة زمنية مجرّدة: يوم + رقم فترة. */
export interface Slot {
  dayId: ID;
  periodIndex: number;
}

export type PreferenceKind = 'preferred' | 'avoided';

export interface TeacherPreference extends Slot {
  kind: PreferenceKind;
  weight: number;         // 1..3
}

export interface Teacher {
  id: ID;
  nameAr: string;
  nameEn?: string;
  departmentId: ID | null;
  /** المادة الأساسية — للعرض والتصنيف. */
  primarySubjectId: ID | null;
  /** المواد المكلَّفة بها فعليًا — لا تُسند مادة خارج هذه القائمة (قيد صارم). */
  subjectIds: ID[];
  requiredLoad: number;   // النصاب الأسبوعي المطلوب
  maxLoad: number;        // الحد الأعلى المسموح
  status: TeacherStatus;
  /** أوقات عدم التوفر — قيد صارم. */
  unavailable: Slot[];
  /** رغبات — قيد مرن يدخل في الدرجة فقط. */
  preferences: TeacherPreference[];
  notes?: string;
}

export interface Grade {
  id: ID;
  level: number;          // 6, 7, 8 …
  nameAr: string;         // "الصف السادس"
  nameEn?: string;
  sort: number;
}

export interface Section {
  id: ID;
  gradeId: ID;
  name: string;           // "2"
  label: string;          // "6/2"
  studentCount?: number;
  classTeacherId: ID | null;
  isActive: boolean;
  homeRoomId?: ID | null;
  notes?: string;
}

/** نصاب المادة الأسبوعي لصف كامل، مع إمكانية تجاوزه لشعبة بعينها. */
export interface CurriculumEntry {
  gradeId: ID;
  subjectId: ID;
  weeklyLessons: number;
  /** إن وُجد، يتجاوز نصاب الصف لهذه الشعبة فقط. */
  sectionOverrides?: Record<ID, number>;
}

/* ────────────────────────── الحصة ────────────────────────── */

/**
 * تمييز داخل المادة الواحدة.
 *
 * بعض الحصص تنتمي لمادة واحدة في الخطة والنصاب، لكنها تختلف في محتواها:
 * حصة الجوجيتسو ضمن حصتَي التربية البدنية، وتخصص الفنون (بصرية/سمعية/دراما)
 * ضمن حصص الفنون. جعلها موادّ مستقلة يضخّم الخطة ويكسر حساب النصاب،
 * وإخفاؤها يفقد معلومة يحتاجها من يقرأ الجدول. لذلك هي سمة على الحصة.
 */
export interface LessonVariant {
  code: string;
  labelAr: string;
  labelEn?: string;
  /** رمز قصير يظهر على الخلية وفي الطباعة. */
  icon: string;
}

export interface Lesson {
  id: ID;
  sectionId: ID;
  subjectId: ID;
  variant?: LessonVariant | null;
  /** null = حصة مطلوبة لم تُسند لمعلمة بعد. */
  teacherId: ID | null;
  dayId: ID;
  periodIndex: number;
  roomId: ID | null;
  isLocked: boolean;
  /** يربط حصتين متتاليتين (Double Period) لتتحركا معًا. */
  groupKey?: string | null;
}

/* ────────────────────────── الأقفال ────────────────────────── */

export type LockScope = 'lesson' | 'teacher' | 'section' | 'day' | 'grade';

export interface Lock {
  id: ID;
  scope: LockScope;
  refId: ID;
  createdBy: string;
  createdAt: string;
  reason?: string;
}

/* ────────────────────────── النسخ ────────────────────────── */

export interface ScheduleVersion {
  id: ID;
  label: string;          // "v1.2"
  parentId: ID | null;
  reason: string;
  createdBy: string;
  createdAt: string;
  isBaseline: boolean;
  isCurrent: boolean;
  lessonsChanged: number;
  qualityScore: number | null;
}

/* ────────────────────────── اللقطة الكاملة ────────────────────────── */

/**
 * ScheduleSnapshot هو المُدخل الوحيد لكل دوال المحرك.
 * دالة صافية: نفس اللقطة → نفس النتيجة، دائمًا.
 */
export interface ScheduleSnapshot {
  versionId: ID;
  week: SchoolWeek;
  departments: Department[];
  subjects: Subject[];
  teachers: Teacher[];
  grades: Grade[];
  sections: Section[];
  curriculum: CurriculumEntry[];
  rooms: Room[];
  lessons: Lesson[];
  locks: Lock[];
}

/* ────────────────────────── التغيير ────────────────────────── */

export type Op =
  | { t: 'move'; lessonId: ID; to: Slot }
  | { t: 'swap'; aId: ID; bId: ID }
  | { t: 'assign'; lessonId: ID; teacherId: ID | null }
  | { t: 'create'; lesson: Omit<Lesson, 'id'> & { id?: ID } }
  | { t: 'delete'; lessonId: ID }
  | { t: 'lock'; lessonId: ID }
  | { t: 'unlock'; lessonId: ID }
  | { t: 'room'; lessonId: ID; roomId: ID | null };

export type ChangeSource = 'user' | 'agent' | 'import' | 'repair' | 'scenario';

export type ChangeSetStatus =
  | 'draft'
  | 'previewed'
  | 'approved'
  | 'applied'
  | 'rejected';

export interface ChangeImpact {
  lessonsChanged: number;
  teachersAffected: ID[];
  sectionsAffected: ID[];
  scoreBefore: number;
  scoreAfter: number;
}

export interface ChangeSet {
  id: ID;
  baseVersionId: ID;
  source: ChangeSource;
  status: ChangeSetStatus;
  /** عنوان بشري قصير يُعرض في المعاينة وسجل التدقيق. */
  summaryAr: string;
  reason: string;
  ops: Op[];
  createdBy: string;
  createdAt: string;
}

/* ────────────────────────── نتائج التحقق ────────────────────────── */

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface Violation {
  constraintId: string;
  kind: 'hard' | 'soft';
  severity: Severity;
  /** رسالة عربية مفهومة — لا رموز خطأ. */
  messageAr: string;
  /** الكيانات المتأثرة، لتمكين التمييز البصري في الواجهة. */
  lessonIds: ID[];
  teacherIds: ID[];
  sectionIds: ID[];
  slot?: Slot;
}

export interface ScoreLine {
  constraintId: string;
  labelAr: string;
  weight: number;
  /** 0..1 */
  normalized: number;
  detailAr: string;
}

export interface ScheduleScore {
  /** 0..100. يساوي صفرًا حتمًا عند وجود أي انتهاك صارم. */
  total: number;
  valid: boolean;
  hardViolations: Violation[];
  lines: ScoreLine[];
}

/* ────────────────────────── الأنصبة ────────────────────────── */

export type LoadStatus = 'complete' | 'under' | 'over' | 'conflict' | 'empty';

export interface TeacherWorkload {
  teacherId: ID;
  required: number;
  assigned: number;
  remaining: number;
  maxLoad: number;
  gaps: number;
  longestRun: number;
  firstPeriods: number;
  lastPeriods: number;
  daysUsed: number;
  status: LoadStatus;
  hasConflict: boolean;
}

/* ────────────────────────── التدقيق ────────────────────────── */

export interface AuditEntry {
  id: ID;
  at: string;
  actor: string;
  action: string;
  entity: string;
  summaryAr: string;
  reason?: string;
  changeSetId?: ID;
  before?: unknown;
  after?: unknown;
}

/* ────────────────────────── السيناريوهات ────────────────────────── */

export interface Scenario {
  id: ID;
  name: string;
  baseVersionId: ID;
  ops: Op[];
  createdBy: string;
  createdAt: string;
  note?: string;
}

/* ────────────────────────── المستخدمون ────────────────────────── */

export type Role = 'admin' | 'coordinator' | 'viewer';

export interface Profile {
  id: ID;
  name: string;
  role: Role;
}
