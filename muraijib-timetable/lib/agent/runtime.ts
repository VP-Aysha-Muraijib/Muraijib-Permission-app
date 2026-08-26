/**
 * محرّك المساعد الذكي.
 *
 * يفهم الأوامر العربية الشائعة **حتميًا** — بلا نموذج لغوي — ثم يشغّل الأدوات
 * ويعرض تحليلًا مشروحًا ومقترحات مرتّبة. لا يكتب شيئًا: كل مخرج قابل للتنفيذ
 * يمرّ عبر معاينة وموافقة صريحة.
 *
 * سبب اختيار مفسّر حتمي بدل الاعتماد على نموذج لغوي في القرار: قرارات الجدولة
 * يجب أن تكون قابلة للتكرار والتفسير والمساءلة. النموذج اللغوي يفيد في الصياغة،
 * لا في تحديد من تأخذ الحصة.
 */

import type { ID, Lesson, Op, ScheduleSnapshot } from '@/lib/domain/types';
import { normalizeAr } from '@/lib/utils';
import { createTools, findOrphanLessons, type RepairProposal } from './tools';
import { extractEntities, toLatinDigits } from './entities';
import type { RepairOptions } from '@/lib/engine/repair';

export type IntentId =
  | 'teacher-transfer'
  | 'teacher-load-change'
  | 'find-conflicts'
  | 'lowest-load'
  | 'spare-capacity'
  | 'redistribute-subject'
  | 'fix-section'
  | 'lock-teacher'
  | 'minimal-redistribute'
  | 'teacher-schedule'
  | 'class-schedule'
  | 'schedule-quality'
  | 'help';

export interface AgentFact {
  labelAr: string;
  value: string | number;
  tone?: 'ok' | 'warn' | 'danger' | 'neutral';
}

export interface AgentTableRow {
  cells: Array<string | number>;
  tone?: 'ok' | 'warn' | 'danger';
}

export interface AgentResult {
  intent: IntentId;
  titleAr: string;
  /** خطوات التحليل كما جرت فعلًا — لتكون النتيجة قابلة للتفسير. */
  stepsAr: string[];
  summaryAr: string;
  facts: AgentFact[];
  table?: { headers: string[]; rows: AgentTableRow[] };
  proposals?: RepairProposal[];
  /** عملية جاهزة للمعاينة مباشرةً (قفل، تعديل نصاب…). */
  directOps?: { ops: Op[]; summaryAr: string };
  /** قيود فهمها المساعد من الأمر، تُعرض للمستخدم ليتأكد أنها فُهمت صحيحًا. */
  constraintsAr: string[];
  followUpsAr: string[];
  needsClarificationAr?: string;
}

/* ────────── تحليل القيود من نص الأمر ────────── */

interface ParsedConstraints {
  options: RepairOptions;
  labelsAr: string[];
}

function parseConstraints(text: string, snapshot: ScheduleSnapshot): ParsedConstraints {
  const normalized = normalizeAr(toLatinDigits(text));
  const options: RepairOptions = {};
  const labelsAr: string[] = [];

  // «دون تغيير جدول الصف الثامن» / «لا تغير الصف 8»
  const negation = /(دون|بدون|لا)\s+(تغيير|تغير|المساس|مساس|تعديل)/;
  if (negation.test(normalized)) {
    const entities = extractEntities(text, snapshot);
    if (entities.gradeIds.length > 0) {
      options.frozenGradeIds = new Set(entities.gradeIds);
      labelsAr.push(
        `عدم المساس بجداول: ${entities.gradeIds
          .map((id) => snapshot.grades.find((g) => g.id === id)?.nameAr)
          .filter(Boolean)
          .join('، ')}`,
      );
    }
    if (entities.sectionIds.length > 0) {
      options.frozenSectionIds = new Set(entities.sectionIds);
      labelsAr.push(
        `عدم المساس بالشعب: ${entities.sectionIds
          .map((id) => snapshot.sections.find((s) => s.id === id)?.label)
          .filter(Boolean)
          .join('، ')}`,
      );
    }
  }

  if (/(دون|بدون)\s+(زياده|زيادة|تجاوز)/.test(normalized) || normalized.includes('الحد المسموح')) {
    options.allowAboveRequired = false;
    labelsAr.push('عدم تجاوز النصاب المطلوب لأي معلمة');
  }

  if (/(اقل|أقل)\s+(تغيير|عدد)/.test(normalized) || normalized.includes('باقل تغيير')) {
    options.allowMoves = false;
    labelsAr.push('أقل عدد ممكن من التغييرات — بلا تحريك حصص');
  }

  if (normalized.includes('الحصص المقفله') || normalized.includes('المقفل')) {
    labelsAr.push('احترام الحصص المقفلة');
  }

  return { options, labelsAr };
}

/* ────────── التعرّف على النية ────────── */

const PATTERNS: Array<{ id: IntentId; test: RegExp }> = [
  { id: 'teacher-transfer', test: /(انتقلت|نقلت|منقوله|استقالت|تركت المدرسه|غادرت|ستغادر|ستنتقل|انتقال)/ },
  { id: 'teacher-load-change', test: /(غير|غيري|عدل|اجعل).*(نصاب)|نصاب.*(الى|إلى)\s*\d+/ },
  { id: 'lock-teacher', test: /(ثبت|ثبتي|اقفل|اقفلي|تثبيت|قفل).*(حصص|جدول)/ },
  { id: 'redistribute-subject', test: /(اعد|أعد|اعيدي|اعاده|إعادة).*(توزيع).*(ماده|مادة|حصص)/ },
  { id: 'fix-section', test: /(اصلح|أصلح|رتب|عالج).*(جدول|شعبه|صف)/ },
  { id: 'minimal-redistribute', test: /(اعد|أعد).*(توزيع).*(اقل|أقل)|باقل عدد|بأقل عدد/ },
  { id: 'find-conflicts', test: /(تعارض|تعارضات|مشاكل|فحص|افحص|صحه الجدول|صحة الجدول)/ },
  { id: 'lowest-load', test: /(اقل|أقل|ادنى).*(نصاب)|من.*(ناقص|ينقصها)/ },
  { id: 'spare-capacity', test: /(من يمكنها|من تستطيع|من عندها|متسع|حصص اضافيه|حصص إضافية|تاخذ حصه|تأخذ حصة)/ },
  { id: 'schedule-quality', test: /(جوده|جودة|درجه الجدول|درجة الجدول|تقييم الجدول|كم درجه)/ },
  { id: 'teacher-schedule', test: /(جدول)\s*(المعلمه|المعلمة|ا?ستاذه)?/ },
  { id: 'class-schedule', test: /(جدول)\s*(الشعبه|الشعبة|الصف)/ },
];

export function detectIntent(text: string): IntentId {
  const normalized = normalizeAr(toLatinDigits(text));
  for (const pattern of PATTERNS) {
    if (pattern.test.test(normalized)) return pattern.id;
  }
  return 'help';
}

/* ────────── التشغيل ────────── */

export function runAgent(text: string, snapshot: ScheduleSnapshot): AgentResult {
  const tools = createTools(snapshot);
  const entities = extractEntities(text, snapshot);
  const { options, labelsAr } = parseConstraints(text, snapshot);
  const intent = detectIntent(text);

  const base = { intent, constraintsAr: labelsAr };

  switch (intent) {
    case 'teacher-transfer':
      return { ...base, ...handleTransfer(tools, entities, options, snapshot) };
    case 'teacher-load-change':
      return { ...base, ...handleLoadChange(tools, entities, snapshot, text) };
    case 'lock-teacher':
      return { ...base, ...handleLock(tools, entities, snapshot) };
    case 'redistribute-subject':
      return { ...base, ...handleRedistributeSubject(tools, entities, options, snapshot) };
    case 'fix-section':
      return { ...base, ...handleFixSection(tools, entities, options, snapshot) };
    case 'minimal-redistribute':
      return { ...base, ...handleMinimalRedistribute(tools, options, snapshot) };
    case 'find-conflicts':
      return { ...base, ...handleConflicts(tools) };
    case 'lowest-load':
      return { ...base, ...handleLowestLoad(tools, snapshot) };
    case 'spare-capacity':
      return { ...base, ...handleSpareCapacity(tools, entities, snapshot) };
    case 'schedule-quality':
      return { ...base, ...handleQuality(tools) };
    case 'teacher-schedule':
    case 'class-schedule':
      return { ...base, ...handleShowSchedule(tools, entities, snapshot, intent) };
    default:
      return { ...base, ...handleHelp() };
  }
}

/* ────────── معالِجات النوايا ────────── */

type Partial_ = Omit<AgentResult, 'intent' | 'constraintsAr'>;

function handleTransfer(
  tools: ReturnType<typeof createTools>,
  entities: ReturnType<typeof extractEntities>,
  options: RepairOptions,
  snapshot: ScheduleSnapshot,
): Partial_ {
  const teacherId = entities.teacherIds[0];
  if (!teacherId) {
    return {
      titleAr: 'انتقال معلمة',
      stepsAr: [],
      summaryAr: '',
      facts: [],
      followUpsAr: [],
      needsClarificationAr:
        'لم أتعرّف على اسم المعلمة في طلبك. اكتب اسمها كما هو مسجّل في صفحة المعلمات، مثال: «انتقلت معلمة ٣ من المدرسة، ما الحل؟».',
    };
  }

  const teacher = snapshot.teachers.find((t) => t.id === teacherId)!;
  const impact = tools.simulateTeacherRemoval(teacherId, options);
  const locked = tools.getTeacherSchedule(teacherId).filter((l) => tools.index.lockedLessonIds.has(l.id));

  const stepsAr = [
    `قرأت جدول ${teacher.nameAr}: ${impact.lessonsToRedistribute + locked.length} حصة أسبوعيًا.`,
    `حدّدت المواد المتأثرة: ${impact.subjectsAffected.join('، ') || '—'}.`,
    `حدّدت الشعب المتأثرة: ${impact.sectionsAffected.join('، ') || '—'}.`,
    `فحصت أنصبة ${snapshot.teachers.length} معلمة، فوجدت ${impact.candidateTeachers.length} معلمة مؤهلة لديها متسع.`,
    locked.length > 0 ? `استثنيت ${locked.length} حصة مقفلة من إعادة التوزيع.` : 'لا توجد حصص مقفلة ضمن جدولها.',
    `ولّدت ${impact.proposals.length} حلًا بديلًا ورتّبتها حسب عدد الحصص المُعالَجة ثم جودة الجدول.`,
  ];

  const best = impact.proposals[0];
  const shortfall = best ? impact.lessonsToRedistribute - best.resolvedCount : 0;

  // إن عجزت الطاقة المتاحة عن استيعاب الحصص، فالحل تنظيمي لا حسابي:
  // قول ذلك صراحةً أنفع من عرض حل جزئي وكأنه كافٍ.
  if (shortfall > 0) {
    stepsAr.push(
      `الطاقة المتاحة لدى الزميلات لا تكفي ${shortfall} حصة — لا يوجد ترتيب للجدول يحلّها دون معلمة بديلة.`,
    );
  }

  const summaryAr = best
    ? shortfall === 0
      ? `يمكن تغطية جميع حصص ${teacher.nameAr} (${impact.lessonsToRedistribute} حصة) بأقل حل يتطلب ${best.lessonsChanged} تغييرًا على الجدول.`
      : `أفضل حل يغطي ${best.resolvedCount} من ${impact.lessonsToRedistribute} حصة. الباقي (${shortfall} حصة) يحتاج معلمة بديلة بنصاب لا يقل عن ${shortfall} حصة${impact.subjectsAffected.length ? ` في ${impact.subjectsAffected.join('، ')}` : ''} — لا يمكن تغطيته بإعادة ترتيب الجدول وحدها ضمن الحدود العليا للأنصبة.`
    : 'لا توجد حصص تحتاج إعادة توزيع.';

  return {
    titleAr: `أثر انتقال ${teacher.nameAr}`,
    stepsAr,
    summaryAr,
    facts: [
      { labelAr: 'الحصص المطلوب إعادة توزيعها', value: impact.lessonsToRedistribute, tone: 'warn' },
      { labelAr: 'الشعب المتأثرة', value: impact.sectionsAffected.length },
      { labelAr: 'المواد المتأثرة', value: impact.subjectsAffected.length },
      { labelAr: 'معلمات لديهن متسع', value: impact.candidateTeachers.length, tone: impact.candidateTeachers.length ? 'ok' : 'danger' },
      {
        labelAr: 'تحتاج معلمة بديلة',
        value: shortfall,
        tone: shortfall > 0 ? 'danger' : 'ok',
      },
    ],
    table:
      impact.candidateTeachers.length > 0
        ? {
            headers: ['المعلمة', 'تستطيع استيعاب'],
            rows: impact.candidateTeachers.slice(0, 8).map((c) => ({
              cells: [c.nameAr, `${c.canTakeUpTo} حصة`],
            })),
          }
        : undefined,
    proposals: impact.proposals,
    followUpsAr: [
      ...(shortfall > 0 ? [`من يمكنها أخذ ${Math.min(shortfall, 4)} حصص إضافية؟`] : []),
      `أعد توزيع حصص ${teacher.nameAr} بأقل تغيير ممكن`,
      `أعد توزيع حصص ${teacher.nameAr} دون تغيير جداول ${snapshot.grades[snapshot.grades.length - 1]?.nameAr ?? 'الصف الثامن'}`,
      'ابحث عن تعارضات',
    ],
  };
}

function handleLoadChange(
  tools: ReturnType<typeof createTools>,
  entities: ReturnType<typeof extractEntities>,
  snapshot: ScheduleSnapshot,
  text: string,
): Partial_ {
  const teacherId = entities.teacherIds[0];
  const target = entities.numbers.find((n) => n > 0 && n <= 40);

  if (!teacherId || target === undefined) {
    return {
      titleAr: 'تغيير نصاب معلمة',
      stepsAr: [],
      summaryAr: '',
      facts: [],
      followUpsAr: [],
      needsClarificationAr:
        'حدّد اسم المعلمة والنصاب الجديد معًا، مثال: «غيّر نصاب معلمة ٥ إلى ٢٠».',
    };
  }

  const teacher = snapshot.teachers.find((t) => t.id === teacherId)!;
  const load = tools.getTeacherWorkload(teacherId);
  const delta = target - load.assigned;

  const stepsAr = [
    `النصاب المطلوب حاليًا لـ${teacher.nameAr}: ${load.required} حصة، والمُسند فعلًا ${load.assigned}.`,
    `النصاب الجديد المطلوب: ${target} حصة.`,
    delta === 0
      ? 'المسند الحالي يطابق النصاب الجديد تمامًا — لا حاجة لتغيير أي حصة.'
      : delta > 0
        ? `يلزم إسناد ${delta} حصة إضافية لها للوصول إلى النصاب الجديد.`
        : `يلزم سحب ${-delta} حصة من جدولها وإعادة توزيعها على زميلاتها.`,
  ];

  return {
    titleAr: `تغيير نصاب ${teacher.nameAr} إلى ${target}`,
    stepsAr,
    summaryAr:
      delta === 0
        ? 'التغيير في بيانات النصاب فقط، ولن يتأثر الجدول.'
        : `تغيير رقم النصاب وحده لا يعدّل الجدول. بعد حفظ الرقم من صفحة المعلمة، اطلب مني إعادة التوزيع لتنفيذ الفارق (${delta > 0 ? '+' : ''}${delta} حصة).`,
    facts: [
      { labelAr: 'النصاب الحالي', value: load.required },
      { labelAr: 'النصاب الجديد', value: target },
      { labelAr: 'المسند فعلًا', value: load.assigned },
      { labelAr: 'الفارق', value: delta > 0 ? `+${delta}` : String(delta), tone: delta === 0 ? 'ok' : 'warn' },
    ],
    followUpsAr: [
      `أعد توزيع الجدول بأقل تغيير ممكن`,
      `من يمكنها أخذ ${Math.abs(delta) || 2} حصة إضافية؟`,
    ],
  };
}

function handleLock(
  tools: ReturnType<typeof createTools>,
  entities: ReturnType<typeof extractEntities>,
  snapshot: ScheduleSnapshot,
): Partial_ {
  const teacherId = entities.teacherIds[0];
  const sectionId = entities.sectionIds[0];

  if (!teacherId && !sectionId) {
    return {
      titleAr: 'تثبيت حصص',
      stepsAr: [],
      summaryAr: '',
      facts: [],
      followUpsAr: [],
      needsClarificationAr: 'حدّد المعلمة أو الشعبة المراد تثبيت حصصها، مثال: «ثبّت حصص معلمة ٢».',
    };
  }

  const lessons = teacherId ? tools.getTeacherSchedule(teacherId) : tools.getClassSchedule(sectionId!);
  const label = teacherId
    ? snapshot.teachers.find((t) => t.id === teacherId)?.nameAr
    : `الشعبة ${snapshot.sections.find((s) => s.id === sectionId)?.label}`;
  const unlocked = lessons.filter((l) => !tools.index.lockedLessonIds.has(l.id));

  return {
    titleAr: `تثبيت حصص ${label}`,
    stepsAr: [
      `عدد حصص ${label}: ${lessons.length}.`,
      `المقفلة مسبقًا: ${lessons.length - unlocked.length}.`,
      `سيتم إقفال ${unlocked.length} حصة، فلا تمسّها أي إعادة توزيع لاحقة.`,
    ],
    summaryAr:
      unlocked.length === 0
        ? 'كل الحصص مقفلة بالفعل — لا حاجة لأي تغيير.'
        : `اعتماد هذا الإجراء يحمي ${unlocked.length} حصة من أي تعديل، يدويًا أو عبر المساعد، حتى يُفتح القفل.`,
    facts: [
      { labelAr: 'إجمالي الحصص', value: lessons.length },
      { labelAr: 'ستُقفل الآن', value: unlocked.length, tone: 'ok' },
    ],
    directOps:
      unlocked.length > 0
        ? {
            ops: unlocked.map((l) => ({ t: 'lock' as const, lessonId: l.id })),
            summaryAr: `تثبيت ${unlocked.length} حصة لـ${label}`,
          }
        : undefined,
    followUpsAr: ['ابحث عن تعارضات', 'أعد توزيع الجدول بأقل تغيير ممكن'],
  };
}

function handleRedistributeSubject(
  tools: ReturnType<typeof createTools>,
  entities: ReturnType<typeof extractEntities>,
  options: RepairOptions,
  snapshot: ScheduleSnapshot,
): Partial_ {
  const subjectId = entities.subjectIds[0];
  if (!subjectId) {
    return {
      titleAr: 'إعادة توزيع مادة',
      stepsAr: [],
      summaryAr: '',
      facts: [],
      followUpsAr: [],
      needsClarificationAr: 'حدّد اسم المادة، مثال: «أعد توزيع حصص العلوم فقط».',
    };
  }

  const subject = snapshot.subjects.find((s) => s.id === subjectId)!;
  const lessons = (tools.index.bySubject.get(subjectId) ?? []).filter(
    (l) => !tools.index.lockedLessonIds.has(l.id),
  );

  // النطاق مقصور على المادة: كل ما عداها مجمَّد فعليًا.
  const orphans = lessons.map((l) => ({ ...l, teacherId: null }));
  const cleared: ScheduleSnapshot = {
    ...snapshot,
    lessons: snapshot.lessons.map((l) =>
      lessons.some((x) => x.id === l.id) ? { ...l, teacherId: null } : l,
    ),
  };
  const proposals = createTools(cleared).generateAlternativeSolutions(orphans, options);

  return {
    titleAr: `إعادة توزيع حصص ${subject.nameAr}`,
    stepsAr: [
      `عدد حصص ${subject.nameAr} في الجدول: ${(tools.index.bySubject.get(subjectId) ?? []).length}.`,
      `القابل لإعادة التوزيع (غير المقفل): ${lessons.length}.`,
      'جمّدت كل الحصص الأخرى — لن يمسّها هذا الإجراء إطلاقًا.',
      `ولّدت ${proposals.length} توزيعًا بديلًا للمادة وحدها.`,
    ],
    summaryAr:
      proposals[0] && proposals[0].resolvedCount === orphans.length
        ? `يمكن إعادة توزيع كل حصص ${subject.nameAr} على المعلمات المؤهلات دون المساس ببقية الجدول.`
        : `أفضل توزيع يغطي ${proposals[0]?.resolvedCount ?? 0} من ${orphans.length} حصة ضمن القيود الحالية.`,
    facts: [
      { labelAr: 'حصص المادة', value: (tools.index.bySubject.get(subjectId) ?? []).length },
      { labelAr: 'قابلة لإعادة التوزيع', value: lessons.length },
      {
        labelAr: 'معلمات المادة',
        value: snapshot.teachers.filter((t) => t.subjectIds.includes(subjectId)).length,
      },
    ],
    proposals,
    followUpsAr: ['ابحث عن تعارضات', 'ما درجة جودة الجدول؟'],
  };
}

function handleFixSection(
  tools: ReturnType<typeof createTools>,
  entities: ReturnType<typeof extractEntities>,
  options: RepairOptions,
  snapshot: ScheduleSnapshot,
): Partial_ {
  const sectionId = entities.sectionIds[0];
  if (!sectionId) {
    return {
      titleAr: 'إصلاح جدول شعبة',
      stepsAr: [],
      summaryAr: '',
      facts: [],
      followUpsAr: [],
      needsClarificationAr: 'حدّد الشعبة برقمها، مثال: «أصلح جدول الشعبة 7/3 فقط».',
    };
  }

  const section = snapshot.sections.find((s) => s.id === sectionId)!;
  const health = tools.findConflicts();
  const sectionViolations = health.violations.filter((v) => v.sectionIds.includes(sectionId));
  const orphans = (tools.index.bySection.get(sectionId) ?? []).filter(
    (l) => !l.teacherId && !tools.index.lockedLessonIds.has(l.id),
  );

  // كل الشعب الأخرى مجمَّدة: «أصلح هذه الشعبة فقط» تعني حرفيًا هذه الشعبة.
  const frozenSectionIds = new Set(
    snapshot.sections.filter((s) => s.id !== sectionId).map((s) => s.id),
  );
  const proposals = tools.generateAlternativeSolutions(orphans, { ...options, frozenSectionIds });

  return {
    titleAr: `إصلاح جدول الشعبة ${section.label}`,
    stepsAr: [
      `فحصت جدول الشعبة ${section.label}: ${(tools.index.bySection.get(sectionId) ?? []).length} حصة.`,
      `وجدت ${sectionViolations.length} ملاحظة تخص هذه الشعبة.`,
      `منها ${orphans.length} حصة بلا معلمة.`,
      'جمّدت جداول بقية الشعب بالكامل.',
    ],
    summaryAr:
      sectionViolations.length === 0
        ? `جدول الشعبة ${section.label} سليم — لا توجد ملاحظات تحتاج معالجة.`
        : `أهم ملاحظة: ${sectionViolations[0].messageAr}`,
    facts: [
      { labelAr: 'حصص الشعبة', value: (tools.index.bySection.get(sectionId) ?? []).length },
      { labelAr: 'ملاحظات', value: sectionViolations.length, tone: sectionViolations.length ? 'warn' : 'ok' },
      { labelAr: 'حصص بلا معلمة', value: orphans.length, tone: orphans.length ? 'danger' : 'ok' },
    ],
    table:
      sectionViolations.length > 0
        ? {
            headers: ['الملاحظة'],
            rows: sectionViolations.slice(0, 8).map((v) => ({
              cells: [v.messageAr],
              tone: v.severity === 'critical' ? ('danger' as const) : ('warn' as const),
            })),
          }
        : undefined,
    proposals: orphans.length > 0 ? proposals : undefined,
    followUpsAr: ['ابحث عن تعارضات', `اعرض جدول الشعبة ${section.label}`],
  };
}

function handleMinimalRedistribute(
  tools: ReturnType<typeof createTools>,
  options: RepairOptions,
  snapshot: ScheduleSnapshot,
): Partial_ {
  const orphans = findOrphanLessons(tools.index).filter((l) => !tools.index.lockedLessonIds.has(l.id));
  const proposals = tools.generateAlternativeSolutions(orphans, { ...options, allowMoves: false });

  return {
    titleAr: 'إعادة توزيع بأقل عدد من التغييرات',
    stepsAr: [
      `مسحت الجدول بالكامل: ${snapshot.lessons.length} حصة.`,
      `وجدت ${orphans.length} حصة تحتاج معلمة (بلا إسناد أو مسندة لمعلمة لم تعد على رأس العمل).`,
      `استثنيت ${tools.index.lockedLessonIds.size} حصة مقفلة.`,
      'شغّلت وضع أقل إزعاج: إسناد في الأماكن الحالية دون تحريك أي حصة.',
    ],
    summaryAr:
      orphans.length === 0
        ? 'لا توجد حصص تحتاج إعادة توزيع — كل حصة في الجدول مسندة إلى معلمة على رأس العمل.'
        : `أفضل حل يعالج ${proposals[0]?.resolvedCount ?? 0} من ${orphans.length} حصة بـ${proposals[0]?.lessonsChanged ?? 0} تغييرًا فقط.`,
    facts: [
      { labelAr: 'حصص تحتاج معالجة', value: orphans.length, tone: orphans.length ? 'warn' : 'ok' },
      { labelAr: 'حصص مقفلة محميّة', value: tools.index.lockedLessonIds.size },
      { labelAr: 'إجمالي الحصص', value: snapshot.lessons.length },
    ],
    proposals: orphans.length > 0 ? proposals : undefined,
    followUpsAr: ['ابحث عن تعارضات', 'ما درجة جودة الجدول؟'],
  };
}

function handleConflicts(tools: ReturnType<typeof createTools>): Partial_ {
  const health = tools.findConflicts();
  const t = health.totals;

  return {
    titleAr: 'فحص التعارضات',
    stepsAr: [
      'شغّلت كل القيود الصارمة على الجدول الحالي.',
      `صنّفت النتائج إلى ${health.groups.length} مجموعة حسب نوع الملاحظة.`,
      'رتّبت المجموعات بالخطورة: الحرج أولًا.',
    ],
    summaryAr: health.valid
      ? t.missingLessons + t.unassigned === 0
        ? 'الجدول سليم تمامًا: لا تعارضات مانعة ولا حصص ناقصة.'
        : `لا توجد تعارضات مانعة، لكن هناك ${t.missingLessons + t.unassigned} ملاحظة على اكتمال الحصص.`
      : `يوجد ${t.blocking} تعارض مانع يجب حلّه قبل اعتماد الجدول.`,
    facts: [
      { labelAr: 'درجة الجودة', value: health.valid ? `${health.score}%` : 'غير صالح', tone: health.valid ? 'ok' : 'danger' },
      { labelAr: 'تعارضات المعلمات', value: t.teacherConflicts, tone: t.teacherConflicts ? 'danger' : 'ok' },
      { labelAr: 'تعارضات الشعب', value: t.sectionConflicts, tone: t.sectionConflicts ? 'danger' : 'ok' },
      { labelAr: 'حصص بلا معلمة', value: t.unassigned, tone: t.unassigned ? 'warn' : 'ok' },
      { labelAr: 'حصص ناقصة', value: t.missingLessons, tone: t.missingLessons ? 'warn' : 'ok' },
      { labelAr: 'فوق النصاب', value: t.overload, tone: t.overload ? 'danger' : 'ok' },
    ],
    table:
      health.groups.length > 0
        ? {
            headers: ['نوع الملاحظة', 'العدد', 'مثال'],
            rows: health.groups.map((g) => ({
              cells: [g.labelAr, g.count, g.violations[0].messageAr],
              tone: g.severity === 'critical' ? ('danger' as const) : g.severity === 'high' ? ('warn' as const) : undefined,
            })),
          }
        : undefined,
    followUpsAr: ['أعد توزيع الجدول بأقل عدد ممكن من التغييرات', 'أظهر المعلمات الأقل نصابًا'],
  };
}

function handleLowestLoad(
  tools: ReturnType<typeof createTools>,
  snapshot: ScheduleSnapshot,
): Partial_ {
  const loads = tools
    .getAllWorkloads()
    .filter((w) => w.required > 0)
    .sort((a, b) => a.remaining - b.remaining);
  const under = loads.filter((w) => w.status === 'under').sort((a, b) => b.remaining - a.remaining);
  const nameOf = (id: ID) => snapshot.teachers.find((t) => t.id === id)?.nameAr ?? '—';

  return {
    titleAr: 'المعلمات الأقل نصابًا',
    stepsAr: [
      `حسبت نصاب ${loads.length} معلمة من واقع الحصص المسندة فعلًا.`,
      `قارنت المسند بالنصاب المطلوب لكل واحدة.`,
    ],
    summaryAr:
      under.length === 0
        ? 'كل المعلمات مكتملات النصاب أو أعلى منه.'
        : `${under.length} معلمة دون النصاب، ومجموع ما ينقصهن ${under.reduce((a, w) => a + w.remaining, 0)} حصة.`,
    facts: [
      { labelAr: 'دون النصاب', value: under.length, tone: under.length ? 'warn' : 'ok' },
      { labelAr: 'مجموع الحصص الناقصة', value: under.reduce((a, w) => a + w.remaining, 0) },
    ],
    table: {
      headers: ['المعلمة', 'المطلوب', 'المسند', 'المتبقي'],
      rows: under.slice(0, 12).map((w) => ({
        cells: [nameOf(w.teacherId), w.required, w.assigned, w.remaining],
        tone: 'warn' as const,
      })),
    },
    followUpsAr: ['من يمكنها أخذ حصتين إضافيتين؟', 'أعد توزيع الجدول بأقل عدد ممكن من التغييرات'],
  };
}

function handleSpareCapacity(
  tools: ReturnType<typeof createTools>,
  entities: ReturnType<typeof extractEntities>,
  snapshot: ScheduleSnapshot,
): Partial_ {
  const wanted = entities.numbers.find((n) => n > 0 && n <= 20) ?? 2;
  const subjectId = entities.subjectIds[0];
  const nameOf = (id: ID) => snapshot.teachers.find((t) => t.id === id)?.nameAr ?? '—';

  const candidates = tools
    .getAllWorkloads()
    .filter((w) => {
      const teacher = snapshot.teachers.find((t) => t.id === w.teacherId);
      if (!teacher || teacher.status === 'transferred' || teacher.status === 'on_leave') return false;
      if (subjectId && !teacher.subjectIds.includes(subjectId)) return false;
      return teacher.maxLoad - w.assigned >= wanted;
    })
    .sort((a, b) => b.remaining - a.remaining);

  const subject = subjectId ? snapshot.subjects.find((s) => s.id === subjectId) : null;

  return {
    titleAr: `من يمكنها أخذ ${wanted} حصة إضافية؟`,
    stepsAr: [
      subject ? `قصرت البحث على معلمات ${subject.nameAr}.` : 'شملت كل المعلمات على رأس العمل.',
      `استبعدت من يتجاوز الحد الأعلى لنصابها عند إضافة ${wanted} حصة.`,
      'رتّبت النتائج حسب الأبعد عن النصاب المطلوب.',
    ],
    summaryAr:
      candidates.length === 0
        ? `لا توجد معلمة تستطيع استيعاب ${wanted} حصة إضافية ضمن الحد الأعلى المسموح${subject ? ` في مادة ${subject.nameAr}` : ''}.`
        : `${candidates.length} معلمة تستطيع استيعاب ${wanted} حصة إضافية ضمن حدود نصابها.`,
    facts: [
      { labelAr: 'عدد المرشحات', value: candidates.length, tone: candidates.length ? 'ok' : 'danger' },
      { labelAr: 'الحصص المطلوبة', value: wanted },
    ],
    table: {
      headers: ['المعلمة', 'المسند', 'النصاب', 'متاح حتى الحد الأعلى'],
      rows: candidates.slice(0, 12).map((w) => ({
        cells: [nameOf(w.teacherId), w.assigned, w.required, w.maxLoad - w.assigned],
      })),
    },
    followUpsAr: ['أظهر المعلمات الأقل نصابًا', 'ابحث عن تعارضات'],
  };
}

function handleQuality(tools: ReturnType<typeof createTools>): Partial_ {
  const score = tools.calculateScheduleScore();
  const detail = tools.explainScheduleScore();

  return {
    titleAr: 'درجة جودة الجدول',
    stepsAr: [
      'تحققت أولًا من عدم وجود انتهاك صارم — وجوده يجعل الدرجة صفرًا مهما كان التوزيع.',
      'حسبت ثمانية بنود مرنة موزونة: التوزيع، الفراغات، التتابع، العدالة، الرغبات، توازن الأنصبة.',
      'خصمت نقاطًا مقابل الحصص الناقصة وغير المسندة.',
    ],
    summaryAr: score.valid
      ? `الدرجة ${score.total} من 100. أكبر خصم في «${detail[0]?.labelAr ?? '—'}»: ${detail[0]?.detailAr ?? ''}`
      : 'الجدول غير صالح حاليًا بسبب وجود تعارض صارم، لذا الدرجة صفر.',
    facts: [
      { labelAr: 'الدرجة', value: score.valid ? score.total : 0, tone: score.valid && score.total >= 80 ? 'ok' : 'warn' },
      { labelAr: 'الحالة', value: score.valid ? 'صالح' : 'غير صالح', tone: score.valid ? 'ok' : 'danger' },
    ],
    table: {
      headers: ['البند', 'النقاط المفقودة', 'من', 'التفسير'],
      rows: detail.map((line) => ({
        cells: [line.labelAr, line.lost, line.of, line.detailAr],
        tone: line.lost > line.of / 2 ? ('warn' as const) : undefined,
      })),
    },
    followUpsAr: ['ابحث عن تعارضات', 'أظهر المعلمات الأقل نصابًا'],
  };
}

function handleShowSchedule(
  tools: ReturnType<typeof createTools>,
  entities: ReturnType<typeof extractEntities>,
  snapshot: ScheduleSnapshot,
  intent: IntentId,
): Partial_ {
  const teacherId = entities.teacherIds[0];
  const sectionId = entities.sectionIds[0];

  if (!teacherId && !sectionId) {
    return {
      titleAr: 'عرض جدول',
      stepsAr: [],
      summaryAr: '',
      facts: [],
      followUpsAr: [],
      needsClarificationAr: 'حدّد المعلمة أو الشعبة، مثال: «اعرض جدول معلمة ٤» أو «اعرض جدول الشعبة 6/2».',
    };
  }

  const lessons = teacherId ? tools.getTeacherSchedule(teacherId) : tools.getClassSchedule(sectionId!);
  const label = teacherId
    ? snapshot.teachers.find((t) => t.id === teacherId)?.nameAr
    : `الشعبة ${snapshot.sections.find((s) => s.id === sectionId)?.label}`;
  const load = teacherId ? tools.getTeacherWorkload(teacherId) : null;

  const rows = [...lessons]
    .sort((a, b) => {
      const dayA = tools.index.dayById.get(a.dayId)?.sort ?? 0;
      const dayB = tools.index.dayById.get(b.dayId)?.sort ?? 0;
      return dayA - dayB || a.periodIndex - b.periodIndex;
    })
    .map((lesson) => ({
      cells: [
        tools.describeSlot(lesson),
        tools.index.subjectById.get(lesson.subjectId)?.nameAr ?? '—',
        teacherId
          ? tools.index.sectionById.get(lesson.sectionId)?.label ?? '—'
          : lesson.teacherId
            ? tools.index.teacherById.get(lesson.teacherId)?.nameAr ?? '—'
            : 'بلا معلمة',
      ],
      tone: lesson.teacherId ? undefined : ('danger' as const),
    }));

  return {
    titleAr: `جدول ${label}`,
    stepsAr: [`قرأت ${lessons.length} حصة من الجدول الحالي.`],
    summaryAr: load
      ? `${label}: ${load.assigned} حصة من نصاب ${load.required}، و${load.gaps} فراغًا في الأسبوع.`
      : `${label}: ${lessons.length} حصة أسبوعيًا.`,
    facts: load
      ? [
          { labelAr: 'المسند', value: load.assigned },
          { labelAr: 'النصاب', value: load.required },
          { labelAr: 'الفراغات', value: load.gaps, tone: load.gaps > 3 ? 'warn' : 'ok' },
          { labelAr: 'أطول تتابع', value: load.longestRun },
        ]
      : [{ labelAr: 'عدد الحصص', value: lessons.length }],
    table: {
      headers: ['الوقت', 'المادة', teacherId ? 'الشعبة' : 'المعلمة'],
      rows,
    },
    followUpsAr: ['ابحث عن تعارضات', 'ما درجة جودة الجدول؟'],
  };
}

function handleHelp(): Partial_ {
  return {
    titleAr: 'كيف أساعدك؟',
    stepsAr: [],
    summaryAr:
      'اكتب طلبك بلغتك الطبيعية. أفهم الأوامر المتعلقة بانتقال المعلمات، وإعادة التوزيع، والأنصبة، والتعارضات، وجودة الجدول. لا أنفّذ شيئًا قبل عرض المقترح وموافقتك عليه.',
    facts: [],
    followUpsAr: [
      'انتقلت معلمة ٣ من المدرسة، ما أثر ذلك على الجدول؟',
      'ابحث عن تعارضات',
      'أظهر المعلمات الأقل نصابًا',
      'من يمكنها أخذ حصتين إضافيتين؟',
      'أعد توزيع حصص العلوم فقط',
      'ما درجة جودة الجدول؟',
      'ثبّت حصص معلمة ٢',
    ],
  };
}
