# Muraijib Smart Timetable — Architecture

**منظومة مريجب الذكية لإدارة الجدول المدرسي** · العام الأكاديمي 2026–2027
واجهة داخلية لنائب مدير المدرسة · Arabic-first (RTL)

---

## 1. المبدأ المعماري الحاكم

النظام **ليس** موقعًا يعرض جدولًا. هو محرك جدولة (Deterministic Scheduling Engine) مغلَّف بواجهة تشغيلية،
ويُوضع بجانبه وكيل ذكي (Agent) **لا يملك صلاحية الكتابة**.

```
اللغة الطبيعية ──► Agent (تخطيط + شرح)
                      │  يستدعي أدوات للقراءة والمحاكاة فقط
                      ▼
              Scheduling Engine  (منطق صافٍ، بلا UI، بلا شبكة)
                      │  يُنتج ChangeSet (مقترح تغيير)
                      ▼
              Constraint Validator  (Hard/Soft) ─── يرفض أو يعتمد
                      ▼
              Preview  ──►  موافقة المستخدم  ──►  Apply (Server-side)
                      ▼
              Version + Audit Log
```

**قاعدتان لا تُكسران:**
1. لا يكتب الـAgent في قاعدة البيانات إطلاقًا. يُنتج `ChangeSet` فقط.
2. كل كتابة تمرّ عبر التحقق على الخادم (Server-side Validation). التحقق في الواجهة للسرعة فقط، لا للأمان.

---

## 2. الطبقات (Layers)

| الطبقة | المسؤولية | لا تعرف عن |
|---|---|---|
| `lib/domain` | الأنواع والكيانات وقواعد المجال | React · قاعدة البيانات · الشبكة |
| `lib/engine` | التحقق، كشف التعارض، الأنصبة، التقييم، المحاكاة، التحسين | React · قاعدة البيانات |
| `lib/data` | مستودع بيانات مجرّد (`DataStore`) بتنفيذين: Local · Supabase | React |
| `lib/agent` | أدوات الوكيل (قراءة/محاكاة فقط) + مفسّر الأوامر | كتابة مباشرة |
| `app/api` | حدود الخادم: تحقق نهائي + كتابة + إصدار نسخة + تدقيق | UI |
| `app/(app)` | الواجهة | منطق الجدولة |

المحرك بأكمله **دوال صافية (pure functions)**: مُدخل = `ScheduleSnapshot`، مُخرج = نتيجة.
هذا ما يجعل المحاكاة (What-if) والتراجع (Undo) والاختبار ممكنًا بلا تعقيد.

---

## 3. بنية المجلدات

```
muraijib-timetable/
├─ app/
│  ├─ (app)/                     # الواجهة المحمية
│  │  ├─ page.tsx                # الرئيسية / Dashboard
│  │  ├─ timetable/              # مساحة عمل الجدول
│  │  ├─ teachers/[id]/          # ملف المعلمة
│  │  ├─ classes/  subjects/  workload/
│  │  ├─ agent/                  # مساعد الجدول الذكي
│  │  ├─ conflicts/  analytics/
│  │  ├─ print/                  # مركز الطباعة
│  │  ├─ versions/  audit/  import/  settings/
│  ├─ print/[kind]/              # مسار طباعة نظيف (بلا Sidebar)
│  └─ api/
│     ├─ changeset/validate      # تحقق بلا كتابة
│     ├─ changeset/apply         # تحقق ثم كتابة ذرّية + نسخة + تدقيق
│     ├─ agent/                  # تنفيذ أدوات الوكيل
│     └─ import/                 # تحليل الملف والمطابقة
│
├─ lib/
│  ├─ domain/         types.ts · ids.ts · invariants.ts
│  ├─ engine/
│  │  ├─ snapshot.ts             # فهرسة الجدول (O(1) lookups)
│  │  ├─ constraints/            # كل قيد ملف مستقل + سجل قيود
│  │  ├─ validator.ts            # تشغيل القيود على ChangeSet
│  │  ├─ conflicts.ts            # كشف التعارضات في جدول قائم
│  │  ├─ workload.ts             # الأنصبة والفراغات
│  │  ├─ score.ts                # Schedule Quality Score /100 + تفسير
│  │  ├─ changeset.ts            # بناء/دمج/عكس مجموعات التغيير
│  │  ├─ repair.ts               # Minimal Disruption Mode
│  │  ├─ solver.ts               # توليد بدائل مرتبة
│  │  └─ scenario.ts             # What-if
│  ├─ data/          store.ts (interface) · local.ts · supabase.ts
│  ├─ agent/         tools.ts · intents.ts · runtime.ts
│  ├─ import/        parse.ts · map.ts · audit.ts
│  └─ print/         templates
│
├─ components/       ui/ · timetable/ · charts/ · layout/
├─ supabase/         schema.sql · rls.sql · seed.sql
└─ tests/            engine tests (Vitest)
```

---

## 4. نموذج البيانات (Database Schema)

كل شيء ديناميكي — لا أسماء معلمات أو صفوف داخل الكود.

### الكيانات الأساسية

```
school_years ──┬── school_days ── periods            (أسبوع الدراسة، عدد الحصص لكل يوم مستقل)
               ├── departments ── teachers
               ├── subjects
               ├── grades ── sections (= class)
               ├── rooms
               └── schedule_versions ── lessons
```

| جدول | الحقول المفتاحية |
|---|---|
| `school_years` | `id, label ('2026–2027'), is_active` |
| `school_days` | `id, year_id, weekday (0..6), name_ar, is_teaching, period_count, sort` |
| `periods` | `id, day_id, index, kind (lesson\|break\|prayer\|assembly\|reserved), start_time, end_time, label_ar` |
| `departments` | `id, name_ar, color` |
| `subjects` | `id, code, name_ar, department_id, color, needs_lab, room_kind, max_per_day, allows_double, preferred_distribution` |
| `grades` | `id, level (1..12), name_ar, sort` |
| `sections` | `id, grade_id, name ('2'), label ('6/2'), student_count, class_teacher_id, is_active` |
| `curriculum` | `id, grade_id, subject_id, weekly_lessons` ← نصاب المادة لكل صف |
| `section_curriculum` | تجاوز اختياري لشعبة بعينها |
| `teachers` | `id, name_ar, name_en, department_id, primary_subject_id, required_load, max_load, status(active\|new\|transferred\|on_leave\|unavailable), notes` |
| `teacher_subjects` | `teacher_id, subject_id` ← لا تُسند مادة لمعلمة غير مكلفة بها |
| `teacher_sections` | `teacher_id, section_id, subject_id` ← الإسناد المعتمد |
| `teacher_unavailability` | `teacher_id, day_id, period_index, reason` (Hard) |
| `teacher_preferences` | `teacher_id, day_id, period_index, kind(preferred\|avoided), weight` (Soft) |
| `rooms` | `id, name_ar, kind, capacity` |
| `schedule_versions` | `id, year_id, label ('v1.2'), parent_id, reason, created_by, created_at, is_baseline, is_current, quality_score` |
| `lessons` | `id, version_id, section_id, subject_id, teacher_id, day_id, period_index, room_id, is_locked, group_key` |
| `locks` | `id, version_id, scope(lesson\|teacher\|section\|day\|grade), ref_id, created_by` |
| `change_sets` | `id, version_id, status(draft\|previewed\|approved\|applied\|rejected), source(user\|agent\|import\|repair), summary, ops jsonb, impact jsonb` |
| `audit_log` | `id, at, actor_id, action, entity, before jsonb, after jsonb, reason, changeset_id` |
| `scenarios` | `id, base_version_id, name, ops jsonb, result jsonb, created_by` |
| `profiles` | `id (auth.uid), name, role(admin\|coordinator\|viewer)` |

### قواعد سلامة على مستوى قاعدة البيانات

```sql
-- معلمة واحدة لا تكون في مكانين في نفس الحصة
create unique index lessons_teacher_slot
  on lessons(version_id, teacher_id, day_id, period_index)
  where teacher_id is not null;

-- شعبة واحدة لا تدرس مادتين في نفس الحصة
create unique index lessons_section_slot
  on lessons(version_id, section_id, day_id, period_index);

-- غرفة واحدة لا تُحجز مرتين
create unique index lessons_room_slot
  on lessons(version_id, room_id, day_id, period_index)
  where room_id is not null;
```

هذه ليست تحسينًا للأداء — هي **خط الدفاع الأخير**: حتى لو أخطأ التطبيق، قاعدة البيانات ترفض الحجز المزدوج.

### النسخ (Versioning)

`lessons` مرتبطة بـ`version_id`. اعتماد أي `ChangeSet` = نسخ الحصص إلى نسخة جديدة مع تطبيق العمليات
داخل معاملة واحدة (transaction). لا تُعدَّل نسخة سابقة أبدًا → المقارنة والاسترجاع مضمونان.

---

## 5. معمارية القيود (Constraints Architecture)

كل قيد كائن مستقل بواجهة موحّدة:

```ts
interface Constraint {
  id: string;                 // 'teacher-double-booking'
  kind: 'hard' | 'soft';
  severity: 'critical'|'high'|'medium'|'low';
  labelAr: string;
  check(snapshot, scope): Violation[];   // hard → انتهاكات
  score?(snapshot): { value: number; max: number; detail: string };  // soft → درجة
}
```

### Hard Constraints (لا تُكسر — أي انتهاك يمنع الاعتماد)

| المعرّف | الوصف |
|---|---|
| `teacher-double-booking` | المعلمة في صفين بنفس الحصة |
| `section-double-booking` | الشعبة لها مادتان بنفس الحصة |
| `room-conflict` | غرفة/مختبر محجوز مرتين |
| `teacher-unavailable` | حصة في وقت عدم توفر المعلمة |
| `teacher-not-qualified` | مادة غير مسندة للمعلمة |
| `locked-lesson-moved` | تحريك/حذف حصة مقفلة |
| `curriculum-completeness` | نصاب المادة الأسبوعي للشعبة ناقص أو زائد |
| `teacher-max-load` | تجاوز الحد الأعلى لنصاب المعلمة |
| `period-not-teaching` | حصة في فترة غير تدريسية (فسحة/صلاة/طابور) |
| `subject-max-per-day` | تكرار المادة لنفس الشعبة فوق الحد اليومي |
| `no-lesson-loss` | إعادة الجدولة حذفت حصة مطلوبة |

### Soft Constraints (تُحسَّن — تدخل في الدرجة)

| المعرّف | الوزن الافتراضي |
|---|---|
| `subject-day-spread` — توزيع المادة على الأيام | 18 |
| `teacher-gaps` — تقليل الفراغات | 16 |
| `teacher-consecutive` — تقليل التتابع الطويل | 12 |
| `first-last-fairness` — عدالة الحصص الأولى والأخيرة | 12 |
| `subject-clustering` — منع تجميع المادة في يوم/يومين | 10 |
| `core-subject-early` — المواد الأساسية في الحصص المبكرة | 10 |
| `teacher-preferences` — رغبات المعلمات | 12 |
| `workload-balance` — توازن الأنصبة | 10 |

الأوزان في `lib/engine/constraints/weights.ts` وقابلة للتعديل من الإعدادات — لا أرقام سحرية متناثرة.

### Schedule Quality Score

```
إن وُجد أي انتهاك Hard  →  Score = 0  ويُعرض "الجدول غير صالح"
غير ذلك:
  Score = Σ(weightᵢ × normalizedScoreᵢ) / Σ(weightᵢ) × 100
```
تُعرض دائمًا **تفاصيل الدرجة** بندًا بندًا (كم فقدت ولماذا). لا رقم بلا تفسير.

---

## 6. ChangeSet — وحدة التغيير الوحيدة

كل تعديل، سواء جاء من السحب والإفلات أو من الوكيل أو من الاستيراد، يُمثَّل بالشكل نفسه:

```ts
type Op =
  | { t:'move';   lessonId; to:{ dayId; periodIndex } }
  | { t:'swap';   aId; bId }
  | { t:'assign'; lessonId; teacherId }
  | { t:'create'; section; subject; teacher; day; period }
  | { t:'delete'; lessonId }
  | { t:'lock' | 'unlock'; lessonId }
  | { t:'room';   lessonId; roomId };

interface ChangeSet {
  id; baseVersionId; source; reason;
  ops: Op[];
  impact: { lessonsChanged; teachersAffected; sectionsAffected; scoreBefore; scoreAfter };
  validation: { hardViolations: Violation[]; softDeltas: ScoreDelta[] };
}
```

**سير العمل الإلزامي:** `اقتراح → تحقق → أثر → معاينة → موافقة → تطبيق → نسخة → تدقيق`.
زران فقط في نهاية المعاينة: **اعتماد التغييرات** · **إلغاء**.

`baseVersionId` يمنع التعارض: إذا تغيّرت النسخة الحالية بعد المعاينة، يُرفض التطبيق برسالة بشرية واضحة
("تعذّر اعتماد التعديل لأن الجدول تغيّر في نسخة أحدث…") — لا كتابة فوق عمل شخص آخر.

---

## 7. Minimal Disruption Mode

عند تغيّر خلال العام (انتقال معلمة، تعديل نصاب…) الهدف ليس بناء جدول جديد، بل **أقل عدد تغييرات**.

خوارزمية `repair.ts`:
1. تحديد الحصص المتضررة فقط (Affected Set).
2. تجميد كل ما عداها (Frozen Set) — يشمل كل المقفل وكل ما استثناه المستخدم.
3. بحث موجّه (Best-first / branch-and-bound) بعمق متزايد: حاول إسنادًا مباشرًا، ثم نقلًا واحدًا، ثم سلسلة تبديل بطول 2، ثم 3.
4. الإيقاف عند أول حل صالح بعدد تغييرات ≤ الحد، ثم متابعة البحث ضمن ميزانية زمنية لتحسين الدرجة.
5. الإخراج: عدة `ChangeSet` مرتبة — `Minimal Change` · `Best Workload Balance` · `Best Quality`.

يُعرض دائمًا: **عدد الحصص التي ستتغير: N**.

---

## 8. الوكيل الذكي (Agent)

الوكيل يخطط ويشرح؛ المحرك يقرر. طبقة الأدوات للقراءة والمحاكاة **فقط**:

```
getTeacherSchedule · getClassSchedule · getTeacherWorkload
findConflicts · findAvailableTeachers · findAvailableSlots
simulateTeacherRemoval · simulateTeacherAddition · simulateLessonMove
calculateScheduleScore · generateAlternativeSolutions
createChangeSet · validateChangeSet         ← تُنتج مقترحًا، لا تكتب
applyApprovedChangeSet                      ← تتطلب موافقة صريحة من المستخدم
```

`applyApprovedChangeSet` لا تُستدعى من الوكيل إطلاقًا؛ تُستدعى من الواجهة بعد ضغط المستخدم "اعتماد".

يعمل الوكيل بمسارين: **مفسّر أوامر حتمي (intents)** يغطي الأوامر الشائعة بلا نموذج لغوي،
ونموذج لغوي اختياري للصياغة الحرة — وكلاهما ينتهي إلى الأدوات نفسها والتحقق نفسه.

---

## 9. الاستيراد (Import)

`رفع → تحليل الأعمدة → مطابقة الحقول → تحقق → عرض المشكلات → معاينة → استيراد`

لا يُستورد صف واحد خاطئ بصمت. يُنتج النظام **Data Audit Report** قبل أي كتابة:
ما تم التعرف عليه · القيم المفقودة · التكرار · التعارضات · غير المفهوم.
بعد الاعتماد يُخزَّن كـ**Baseline Schedule v1.0**.

---

## 10. التقنيات

| الطبقة | الاختيار | السبب |
|---|---|---|
| إطار العمل | Next.js 15 (App Router) + TypeScript strict | Route Handlers تعطي تحققًا على الخادم |
| الواجهة | React 19 · Tailwind CSS · مكوّنات مخصّصة بروح shadcn | تحكم كامل في RTL والطباعة |
| قاعدة البيانات | Supabase / PostgreSQL + RLS | فهارس فريدة تمنع الحجز المزدوج |
| الحالة | TanStack Query + مخفّضات محلية للمعاينة | لا تحديث متفائل في تغييرات الجدول |
| الاستيراد | SheetJS (xlsx) | XLSX/CSV |
| الاختبار | Vitest | المحرك دوال صافية → اختباره مباشر |

**وضعان للتشغيل:** `local` (IndexedDB — للتقييم الفوري بلا خادم) و`supabase` (الإنتاج).
يُبدَّل بمتغيّر بيئة واحد؛ الواجهة والمحرك لا يعرفان الفرق.

---

## 11. الهوية البصرية

كل الألوان في `app/tokens.css` كـCSS Variables (`--brand-primary` …). لا لون ثابت (hard-coded) في المكوّنات.
شعار الوزارة والأصول الرسمية تُوضع لاحقًا في `public/brand/` وتُربط عبر `lib/brand.ts`.
لم تُخترع ألوان وزارية ولم يُعَد رسم الشعار.

---

## 12. خطة التنفيذ

| المرحلة | المحتوى | الحالة |
|---|---|---|
| 1 — الأساس | المخطط · الأنواع · المحرك · مخزن البيانات · Design System · Shell · Dashboard · المعلمات/الصفوف/المواد/الأنصبة/إعدادات الأسبوع | ✅ |
| 2 — نواة الجدول | Master/Teacher/Class/Subject/Day views · محرك القيود · كشف التعارض · القفل | ✅ |
| 3 — التغيير الديناميكي | السحب والإفلات · معاينة النقل · ChangeSet · النسخ · سجل التدقيق · Minimal Change | ✅ |
| 4 — الوكيل | الأوامر الطبيعية · تحليل الأثر · المحاكاة · البدائل · سير الموافقة | ✅ |
| 5 — الطباعة والتحليلات | طباعة معلمة/صف/رئيسي · PDF/Excel · التحليلات · فحص صحة الجدول | ✅ |

---

## 13. المبدأ الحاكم للمنتج

> هل تجعل هذه الميزة نائب المدير قادرًا على التعامل مع تغيير مفاجئ خلال دقائق بدل ساعات يدوية؟

الأولوية: **الدقة ← السرعة ← التحكم ← القابلية للتفسير ← التصميم المهني**.
