-- ════════════════════════════════════════════════════════════════════════
--  سياسات أمان الصفوف (Row Level Security)
--
--  المنصة داخلية: لا قراءة بلا مصادقة إطلاقًا، ولا كتابة لغير المخوّلين،
--  وسجل التدقيق لا يُعدَّل ولا يُحذف من أي دور.
-- ════════════════════════════════════════════════════════════════════════

alter table profiles               enable row level security;
alter table school_years           enable row level security;
alter table school_days            enable row level security;
alter table periods                enable row level security;
alter table departments            enable row level security;
alter table rooms                  enable row level security;
alter table subjects               enable row level security;
alter table grades                 enable row level security;
alter table sections               enable row level security;
alter table teachers               enable row level security;
alter table teacher_subjects       enable row level security;
alter table teacher_unavailability enable row level security;
alter table teacher_preferences    enable row level security;
alter table curriculum             enable row level security;
alter table section_curriculum     enable row level security;
alter table schedule_versions      enable row level security;
alter table lessons                enable row level security;
alter table locks                  enable row level security;
alter table change_sets            enable row level security;
alter table audit_log              enable row level security;
alter table scenarios              enable row level security;

-- ── الملفات الشخصية ──
create policy profiles_self_read on profiles
  for select to authenticated using (id = auth.uid() or is_admin());
create policy profiles_admin_write on profiles
  for all to authenticated using (is_admin()) with check (is_admin());

-- ── القراءة: كل مستخدم مصادَق يقرأ بيانات المدرسة ──
do $$
declare t text;
begin
  foreach t in array array[
    'school_years','school_days','periods','departments','rooms','subjects','grades','sections',
    'teachers','teacher_subjects','teacher_unavailability','teacher_preferences',
    'curriculum','section_curriculum','schedule_versions','lessons','locks','change_sets','scenarios'
  ] loop
    execute format(
      'create policy %I on %I for select to authenticated using (true)',
      t || '_read', t
    );
  end loop;
end $$;

-- ── الكتابة على البيانات المرجعية: المدير فقط ──
do $$
declare t text;
begin
  foreach t in array array[
    'school_years','school_days','periods','departments','rooms','subjects','grades','sections',
    'teachers','teacher_subjects','teacher_unavailability','teacher_preferences',
    'curriculum','section_curriculum'
  ] loop
    execute format(
      'create policy %I on %I for insert to authenticated with check (is_admin())',
      t || '_insert', t
    );
    execute format(
      'create policy %I on %I for update to authenticated using (is_admin()) with check (is_admin())',
      t || '_update', t
    );
    execute format(
      'create policy %I on %I for delete to authenticated using (is_admin())',
      t || '_delete', t
    );
  end loop;
end $$;

-- ── الجدول نفسه: المدير والمنسّق ──
create policy lessons_write on lessons
  for all to authenticated using (can_edit()) with check (can_edit());

create policy locks_write on locks
  for all to authenticated using (can_edit()) with check (can_edit());

create policy versions_write on schedule_versions
  for all to authenticated using (can_edit()) with check (can_edit());

create policy change_sets_write on change_sets
  for all to authenticated using (can_edit()) with check (can_edit());

create policy scenarios_write on scenarios
  for all to authenticated using (can_edit()) with check (can_edit());

-- ── سجل التدقيق: يُقرأ ويُضاف إليه، ولا يُعدَّل ولا يُحذف ──
-- غياب سياستي UPDATE و DELETE مقصود: لا دور يملك تعديل السجل.
create policy audit_read on audit_log
  for select to authenticated using (true);
create policy audit_insert on audit_log
  for insert to authenticated with check (auth.uid() is not null);

-- ── إنشاء ملف تلقائيًا عند تسجيل مستخدم جديد بدور «اطّلاع فقط» ──
-- الترقية إلى منسّق أو مدير تتم يدويًا من المدير: أقل صلاحية افتراضيًا.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), 'viewer')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
