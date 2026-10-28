-- Local test scaffolding only. Supabase provides these identities/functions in production.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth,public to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
create publication supabase_realtime;
-- Simulate the old publicly readable table, so the migration must close it without deleting rows.
create table public.users(id uuid primary key, nama text, password text);
insert into public.users values('99999999-9999-4999-8999-999999999999','Legacy retained','test-fixture-only');
grant all on public.users to anon,authenticated;
