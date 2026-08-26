-- ════════════════════════════════════════════════════════════════════════
--  Muraijib Smart Timetable — مخطط قاعدة البيانات
--  منظومة مريجب الذكية لإدارة الجدول المدرسي
--
--  مبدأ حاكم: قاعدة البيانات هي خط الدفاع الأخير. حتى لو أخطأ التطبيق،
--  الفهارس الفريدة أدناه تمنع الحجز المزدوج فيزيائيًا — لا اعتماد على
--  التحقق في الواجهة ولا على انضباط الكود.
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ─────────────────────────── المستخدمون والأدوار ───────────────────────────

create type app_role as enum ('admin', 'coordinator', 'viewer');

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  role        app_role not null default 'viewer',
  created_at  timestamptz not null default now()
);

comment on table profiles is 'ملف المستخدم ودوره. الدور يحدّد الصلاحية، ولا يُغني عن التحقق من القيود.';

-- الدور يُقرأ بدالة SECURITY DEFINER لتفادي العودية في سياسات RLS.
create or replace function current_role_of()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

-- coalesce ليس تجميلًا: بلا مستخدم مصادَق يعود الدور NULL، و«not NULL» في PL/pgSQL
-- لا يساوي TRUE، فيمرّ الفحص «if not can_edit()» بصمت. هذه الدوال لا تعيد NULL أبدًا.
create or replace function is_admin()
returns boolean
language sql
stable
as $$ select coalesce(current_role_of() = 'admin', false) $$;

create or replace function can_edit()
returns boolean
language sql
stable
as $$ select coalesce(current_role_of() in ('admin', 'coordinator'), false) $$;

-- ─────────────────────────── العام الدراسي وأسبوع الدراسة ───────────────────────────

create table school_years (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,                       -- '2026–2027'
  school_name text not null,
  is_active    boolean not null default false,
  created_at   timestamptz not null default now()
);

-- عام نشط واحد فقط في أي لحظة.
create unique index school_years_single_active on school_years (is_active) where is_active;

create table school_days (
  id        uuid primary key default gen_random_uuid(),
  year_id   uuid not null references school_years(id) on delete cascade,
  weekday   smallint not null check (weekday between 0 and 6),
  name_ar   text not null,
  is_teaching boolean not null default true,
  sort      smallint not null,
  unique (year_id, weekday)
);

create type period_kind as enum ('lesson', 'break', 'prayer', 'assembly', 'reserved');

create table periods (
  id         uuid primary key default gen_random_uuid(),
  day_id     uuid not null references school_days(id) on delete cascade,
  idx        smallint not null,                    -- ترتيب الفترة داخل اليوم
  kind       period_kind not null default 'lesson',
  label_ar   text not null,
  start_time time not null,
  end_time   time not null,
  unique (day_id, idx),
  check (end_time > start_time)
);

comment on table periods is 'لكل يوم فتراته الخاصة — لا يُفترض أن الأيام متطابقة.';

-- ─────────────────────────── الكيانات المرجعية ───────────────────────────

create table departments (
  id      uuid primary key default gen_random_uuid(),
  year_id uuid not null references school_years(id) on delete cascade,
  name_ar text not null,
  color   text not null default '#6B7280'
);

create type room_kind as enum ('classroom', 'lab', 'hall', 'field', 'other');

create table rooms (
  id       uuid primary key default gen_random_uuid(),
  year_id  uuid not null references school_years(id) on delete cascade,
  name_ar  text not null,
  kind     room_kind not null default 'classroom',
  capacity smallint
);

create type distribution as enum ('spread', 'paired', 'any');

create table subjects (
  id             uuid primary key default gen_random_uuid(),
  year_id        uuid not null references school_years(id) on delete cascade,
  code           text not null,
  name_ar        text not null,
  department_id  uuid references departments(id) on delete set null,
  color          text not null default '#6B7280',
  needs_lab      boolean not null default false,
  room_kind      room_kind,
  max_per_day    smallint not null default 2 check (max_per_day between 1 and 8),
  allows_double  boolean not null default false,
  preferred_distribution distribution not null default 'spread',
  is_core        boolean not null default false,
  notes          text,
  unique (year_id, name_ar)
);

create table grades (
  id      uuid primary key default gen_random_uuid(),
  year_id uuid not null references school_years(id) on delete cascade,
  level   smallint not null,
  name_ar text not null,
  sort    smallint not null,
  unique (year_id, level)
);

create table sections (
  id               uuid primary key default gen_random_uuid(),
  grade_id         uuid not null references grades(id) on delete cascade,
  name             text not null,                  -- '2'
  label            text not null,                  -- '6/2'
  student_count    smallint,
  class_teacher_id uuid,                           -- FK يُضاف بعد جدول المعلمات
  home_room_id     uuid references rooms(id) on delete set null,
  is_active        boolean not null default true,
  notes            text,
  unique (grade_id, name)
);

create type teacher_status as enum ('active', 'new', 'transferred', 'on_leave', 'unavailable');

create table teachers (
  id                uuid primary key default gen_random_uuid(),
  year_id           uuid not null references school_years(id) on delete cascade,
  name_ar           text not null,
  name_en           text,
  department_id     uuid references departments(id) on delete set null,
  primary_subject_id uuid references subjects(id) on delete set null,
  required_load     smallint not null default 0 check (required_load >= 0),
  max_load          smallint not null default 0 check (max_load >= 0),
  status            teacher_status not null default 'active',
  notes             text,
  check (max_load >= required_load)
);

alter table sections
  add constraint sections_class_teacher_fk
  foreign key (class_teacher_id) references teachers(id) on delete set null;

-- المواد المكلَّفة بها المعلمة. لا تُسند حصة خارج هذه القائمة (قيد صارم).
create table teacher_subjects (
  teacher_id uuid not null references teachers(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  primary key (teacher_id, subject_id)
);

-- أوقات عدم التوفر — قيد صارم.
create table teacher_unavailability (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   uuid not null references teachers(id) on delete cascade,
  day_id       uuid not null references school_days(id) on delete cascade,
  period_index smallint not null,
  reason       text,
  unique (teacher_id, day_id, period_index)
);

create type preference_kind as enum ('preferred', 'avoided');

-- الرغبات — قيد مرن يدخل في درجة الجودة فقط.
create table teacher_preferences (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   uuid not null references teachers(id) on delete cascade,
  day_id       uuid not null references school_days(id) on delete cascade,
  period_index smallint not null,
  kind         preference_kind not null,
  weight       smallint not null default 1 check (weight between 1 and 3),
  unique (teacher_id, day_id, period_index)
);

-- خطة المواد: نصاب المادة الأسبوعي لكل صف.
create table curriculum (
  id             uuid primary key default gen_random_uuid(),
  grade_id       uuid not null references grades(id) on delete cascade,
  subject_id     uuid not null references subjects(id) on delete cascade,
  weekly_lessons smallint not null check (weekly_lessons >= 0),
  unique (grade_id, subject_id)
);

-- تجاوز خطة الصف لشعبة بعينها عند الحاجة.
create table section_curriculum (
  id             uuid primary key default gen_random_uuid(),
  section_id     uuid not null references sections(id) on delete cascade,
  subject_id     uuid not null references subjects(id) on delete cascade,
  weekly_lessons smallint not null check (weekly_lessons >= 0),
  unique (section_id, subject_id)
);

-- ─────────────────────────── النسخ والحصص ───────────────────────────

create table schedule_versions (
  id             uuid primary key default gen_random_uuid(),
  year_id        uuid not null references school_years(id) on delete cascade,
  label          text not null,
  parent_id      uuid references schedule_versions(id) on delete set null,
  reason         text not null default '',
  created_by     uuid references profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  is_baseline    boolean not null default false,
  is_current     boolean not null default false,
  lessons_changed integer not null default 0,
  quality_score  smallint
);

-- نسخة حالية واحدة فقط لكل عام — تمنع غموض «أي جدول هو المعتمد».
create unique index schedule_versions_single_current
  on schedule_versions (year_id) where is_current;

create table lessons (
  id           uuid primary key default gen_random_uuid(),
  version_id   uuid not null references schedule_versions(id) on delete cascade,
  section_id   uuid not null references sections(id) on delete cascade,
  subject_id   uuid not null references subjects(id) on delete cascade,
  teacher_id   uuid references teachers(id) on delete set null,
  day_id       uuid not null references school_days(id) on delete cascade,
  period_index smallint not null,
  room_id      uuid references rooms(id) on delete set null,
  is_locked    boolean not null default false,
  group_key    text
);

-- ══════════════ خط الدفاع الأخير ══════════════
-- هذه الفهارس ليست تحسينًا للأداء. هي ما يجعل الحجز المزدوج مستحيلًا
-- على مستوى قاعدة البيانات مهما أخطأ التطبيق أو تزامنت الكتابات.

create unique index lessons_teacher_slot
  on lessons (version_id, teacher_id, day_id, period_index)
  where teacher_id is not null;

create unique index lessons_section_slot
  on lessons (version_id, section_id, day_id, period_index);

create unique index lessons_room_slot
  on lessons (version_id, room_id, day_id, period_index)
  where room_id is not null;

create index lessons_version_idx on lessons (version_id);
create index lessons_teacher_idx on lessons (version_id, teacher_id);
create index lessons_section_idx on lessons (version_id, section_id);

create type lock_scope as enum ('lesson', 'teacher', 'section', 'day', 'grade');

create table locks (
  id         uuid primary key default gen_random_uuid(),
  version_id uuid not null references schedule_versions(id) on delete cascade,
  scope      lock_scope not null,
  ref_id     uuid not null,
  reason     text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (version_id, scope, ref_id)
);

-- ─────────────────────────── التغييرات والتدقيق ───────────────────────────

create type change_status as enum ('draft', 'previewed', 'approved', 'applied', 'rejected');
create type change_source as enum ('user', 'agent', 'import', 'repair', 'scenario');

create table change_sets (
  id              uuid primary key default gen_random_uuid(),
  base_version_id uuid not null references schedule_versions(id) on delete cascade,
  result_version_id uuid references schedule_versions(id) on delete set null,
  status          change_status not null default 'draft',
  source          change_source not null default 'user',
  summary_ar      text not null,
  reason          text not null default '',
  ops             jsonb not null,
  impact          jsonb,
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  applied_at      timestamptz
);

create table audit_log (
  id            uuid primary key default gen_random_uuid(),
  at            timestamptz not null default now(),
  actor_id      uuid references profiles(id) on delete set null,
  actor_name    text not null,
  action        text not null,
  entity        text not null,
  summary_ar    text not null,
  reason        text,
  change_set_id uuid references change_sets(id) on delete set null,
  before        jsonb,
  after         jsonb
);

create index audit_log_at_idx on audit_log (at desc);

comment on table audit_log is
  'سجل دائم. لا توجد سياسة UPDATE أو DELETE عليه — لا يمكن لأي دور تعديله أو حذفه.';

create table scenarios (
  id              uuid primary key default gen_random_uuid(),
  base_version_id uuid not null references schedule_versions(id) on delete cascade,
  name            text not null,
  ops             jsonb not null,
  result          jsonb,
  note            text,
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

-- ─────────────────────────── التطبيق الذرّي ───────────────────────────

/**
 * اعتماد مجموعة تغيير: نسخ حصص النسخة الحالية إلى نسخة جديدة مع تطبيق العمليات،
 * كل ذلك داخل معاملة واحدة. إن خالف الناتج أي فهرس فريد، تُلغى المعاملة كاملة
 * ولا يبقى جدول نصف معدَّل.
 *
 * التحقق من القيود التربوية (النصاب، الأهلية، التوزيع) يتم في طبقة الخادم
 * بمحرك القيود نفسه قبل استدعاء هذه الدالة؛ ما هنا هو ضمان السلامة الذرّية
 * وعدم الحجز المزدوج.
 */
create or replace function apply_change_set(
  p_change_set_id uuid,
  p_new_lessons   jsonb,      -- الحصص كاملةً بعد التطبيق
  p_label         text,
  p_actor_name    text,
  -- integer لا smallint: تمرير عدد صحيح عادي يجب أن يجد الدالة بلا تحويل صريح.
  p_quality_score integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_change    change_sets%rowtype;
  v_year      uuid;
  v_new_id    uuid;
  v_changed   integer;
begin
  if not can_edit() then
    raise exception 'ليست لديك صلاحية تعديل الجدول.';
  end if;

  select * into v_change from change_sets where id = p_change_set_id for update;
  if not found then
    raise exception 'مجموعة التغيير غير موجودة.';
  end if;

  select year_id into v_year from schedule_versions where id = v_change.base_version_id;

  -- حماية من التزامن: المعاينة بُنيت على نسخة، فإن لم تعد هي الحالية يُرفض الاعتماد.
  if not exists (
    select 1 from schedule_versions
    where id = v_change.base_version_id and is_current
  ) then
    raise exception
      'تعذّر اعتماد التعديل لأن الجدول تغيّر في نسخة أحدث. يرجى تحديث الصفحة ومراجعة التغيير قبل الاعتماد.';
  end if;

  update schedule_versions set is_current = false where year_id = v_year and is_current;

  insert into schedule_versions (
    year_id, label, parent_id, reason, created_by, is_baseline, is_current, quality_score
  )
  values (
    v_year, p_label, v_change.base_version_id, v_change.reason, auth.uid(), false, true, p_quality_score::smallint
  )
  returning id into v_new_id;

  insert into lessons (
    version_id, section_id, subject_id, teacher_id, day_id, period_index, room_id, is_locked, group_key
  )
  select
    v_new_id,
    (item->>'sectionId')::uuid,
    (item->>'subjectId')::uuid,
    nullif(item->>'teacherId', '')::uuid,
    (item->>'dayId')::uuid,
    (item->>'periodIndex')::smallint,
    nullif(item->>'roomId', '')::uuid,
    coalesce((item->>'isLocked')::boolean, false),
    nullif(item->>'groupKey', '')
  from jsonb_array_elements(p_new_lessons) as item;

  insert into locks (version_id, scope, ref_id, reason, created_by)
  select v_new_id, scope, ref_id, reason, created_by
  from locks where version_id = v_change.base_version_id;

  select count(*) into v_changed from jsonb_array_elements(p_new_lessons);
  update schedule_versions set lessons_changed = v_changed where id = v_new_id;

  update change_sets
  set status = 'applied', result_version_id = v_new_id, applied_at = now()
  where id = p_change_set_id;

  insert into audit_log (actor_id, actor_name, action, entity, summary_ar, reason, change_set_id, before, after)
  values (
    auth.uid(), p_actor_name, 'apply-changeset', 'schedule',
    v_change.summary_ar, v_change.reason, p_change_set_id,
    jsonb_build_object('versionId', v_change.base_version_id),
    jsonb_build_object('versionId', v_new_id, 'score', p_quality_score)
  );

  return v_new_id;
end;
$$;
