\set ON_ERROR_STOP 0
insert into auth.users (id, email) values ('99999999-9999-9999-9999-999999999999', 'vp@test');
-- التربيغر أنشأ الملف بدور «اطّلاع فقط» — يُرقّى يدويًا كما هو مقصود
update profiles set name = 'نائب المدير', role = 'admin' where id = '99999999-9999-9999-9999-999999999999';
select name, role from profiles;

insert into change_sets (id, base_version_id, summary_ar, reason, ops)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','88888888-8888-8888-8888-888888888888','نقل حصة','اختبار','[]'::jsonb);

\echo '--- ① بلا مستخدم مصادَق: يجب أن يُرفض'
select apply_change_set('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '[]'::jsonb, 'v1.1', 'مجهول', 80);

\echo '--- ② بمستخدم مدير: يجب أن ينجح'
set request.jwt.claim.sub = '99999999-9999-9999-9999-999999999999';
select apply_change_set(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  (select jsonb_agg(jsonb_build_object(
      'sectionId', section_id, 'subjectId', subject_id, 'teacherId', teacher_id,
      'dayId', day_id, 'periodIndex', period_index, 'roomId', room_id, 'isLocked', is_locked))
   from lessons where version_id = '88888888-8888-8888-8888-888888888888'),
  'v1.1', 'نائب المدير', 82
) is not null as created;

\echo '--- ③ النسخة الجديدة وحدها الحالية'
select label, is_current, quality_score, lessons_changed from schedule_versions order by created_at;

\echo '--- ④ الحصص نُسخت'
select v.label, count(l.id) as lessons from schedule_versions v
left join lessons l on l.version_id = v.id group by v.label order by v.label;

\echo '--- ⑤ سجل التدقيق'
select action, summary_ar, actor_name from audit_log;

\echo '--- ⑥ إعادة الاعتماد على نسخة لم تعد الحالية: يجب أن يُرفض برسالة عربية'
select apply_change_set('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '[]'::jsonb, 'v1.2', 'نائب المدير', 80);
