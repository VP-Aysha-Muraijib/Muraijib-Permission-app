# قاعدة البيانات — Muraijib Smart Timetable

## الملفات

| الملف | الغرض |
|---|---|
| `schema.sql` | الجداول والأنواع والفهارس ودالة الاعتماد الذرّية |
| `rls.sql` | سياسات أمان الصفوف والأدوار وتربيغر إنشاء الملف الشخصي |
| `local-auth-shim.sql` | محاكاة الحد الأدنى من مخطط `auth` في Supabase — **للتحقق المحلي فقط، لا يُنشر** |
| `verify-guards.sql` | يثبت أن قاعدة البيانات ترفض الحجز المزدوج فعلًا |
| `verify-apply.sql` | يثبت سلوك دالة الاعتماد: الصلاحية، النسخ، التدقيق، حماية التزامن |

## النشر على Supabase

```sql
-- في SQL Editor، بهذا الترتيب:
\i schema.sql
\i rls.sql
```

`local-auth-shim.sql` **لا يُنشر**: مخطط `auth` ودالة `auth.uid()` موجودان أصلًا في Supabase.

## التحقق محليًا

```bash
initdb -D ./pgdata -U postgres --auth=trust
pg_ctl -D ./pgdata -o "-k /tmp -p 55432" start

createdb -h /tmp -p 55432 muraijib
psql -h /tmp -p 55432 -d muraijib -f local-auth-shim.sql
psql -h /tmp -p 55432 -d muraijib -f schema.sql
psql -h /tmp -p 55432 -d muraijib -f rls.sql

psql -h /tmp -p 55432 -d muraijib -f verify-guards.sql   # يجب أن يرفض 5 محاولات
psql -h /tmp -p 55432 -d muraijib -f verify-apply.sql     # يجب أن ينجح الاعتماد المصرّح به وحده
```

هذا المخطط **مُشغَّل ومُتحقَّق منه فعلًا** على PostgreSQL 16: `verify-guards.sql` يرفض المحاولات
الخمس (ازدواج المعلمة، ازدواج الشعبة، ازدواج الغرفة، نسخة حالية ثانية، حد أعلى أقل من النصاب)،
و`verify-apply.sql` يرفض غير المصرّح له ويقبل المدير وينشئ النسخة ويسجّل التدقيق.

## لماذا الفهارس الفريدة؟

```sql
create unique index lessons_teacher_slot
  on lessons (version_id, teacher_id, day_id, period_index)
  where teacher_id is not null;
```

ليست تحسينًا للأداء. هي **خط الدفاع الأخير**: حتى لو أخطأ التطبيق، أو تزامنت كتابتان،
أو حدث خلل في محرك القيود، لا يمكن لقاعدة البيانات أن تحفظ معلمة في مكانين.
التحقق في الواجهة للسرعة، والتحقق في الخادم للصحة، وهذه الفهارس للاستحالة.

## ملاحظة على المنطق الثلاثي في SQL

```sql
create or replace function can_edit() returns boolean language sql stable
as $$ select coalesce(current_role_of() in ('admin', 'coordinator'), false) $$;
```

`coalesce` هنا ليست تجميلًا. بلا مستخدم مصادَق يعود الدور `NULL`، فتعود المقارنة `NULL`،
و`if not NULL` في PL/pgSQL لا تساوي `TRUE` — فيمرّ فحص الصلاحية بصمت.
اكتُشفت هذه الحالة أثناء التحقق المحلي، ولذلك لا تعيد هذه الدوال `NULL` أبدًا.
