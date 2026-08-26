-- محاكاة الحد الأدنى من مخطط Supabase للتحقق المحلي فقط (ليس جزءًا من النشر)
create schema if not exists auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb
);
create or replace function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create role authenticated;
