-- Reviewed rollout only: creates a separate authenticated data model.
-- Legacy accounts/history are retained, but legacy anonymous API access is closed.
-- Does not link old profiles by email. New users register through Supabase Auth.
begin;
create table if not exists public.wa_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 nama text not null check (length(nama) between 1 and 100),
 mata_pelajaran text not null default 'Pengguna', avatar text not null default '',
 status text not null default 'Offline' check (status in ('Online','Offline')),
 last_seen timestamptz not null default now(), created_at timestamptz not null default now()
);
create table if not exists public.wa_contacts (
 owner_id uuid not null references public.wa_profiles(id) on delete cascade,
 contact_id uuid not null references public.wa_profiles(id) on delete cascade,
 alias text not null default '', note text not null default '',
 primary key(owner_id,contact_id), check(owner_id <> contact_id)
);
create table if not exists public.wa_groups (
 id uuid primary key default gen_random_uuid(), name text not null,
 description text not null default '', avatar text not null default '',
 created_by uuid not null references public.wa_profiles(id), created_at timestamptz not null default now()
);
create table if not exists public.wa_group_members (
 group_id uuid not null references public.wa_groups(id) on delete cascade,
 user_id uuid not null references public.wa_profiles(id) on delete cascade,
 joined_at timestamptz not null default now(), primary key(group_id,user_id)
);
create table if not exists public.wa_messages (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references public.wa_profiles(id),
 receiver_id uuid references public.wa_profiles(id), group_id uuid references public.wa_groups(id),
 message_text text not null default '' check(length(message_text)<=20000),
 message_type text not null default 'TEXT' check(message_type in ('TEXT','IMAGE','AUDIO')),
 attachment_url text not null default '' check(length(attachment_url)<=524288),
 is_deleted boolean not null default false, created_at timestamptz not null default now(), edited_at timestamptz,
 check ((receiver_id is null) <> (group_id is null)), check (sender_id is distinct from receiver_id)
);
create index if not exists wa_messages_direct on public.wa_messages(sender_id,receiver_id,created_at);
create index if not exists wa_messages_receiver on public.wa_messages(receiver_id,created_at);
create index if not exists wa_messages_group on public.wa_messages(group_id,created_at);
create table if not exists public.wa_calls (
 id text primary key, caller_id uuid not null references public.wa_profiles(id),
 callee_id uuid not null references public.wa_profiles(id),
 call_type text not null check(call_type in ('voice','video')),
 status text not null default 'ringing' check(status in ('ringing','answered','rejected','ended')),
 offer text, answer text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(caller_id <> callee_id)
);

create or replace function public.wa_create_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 insert into public.wa_profiles(id,nama,mata_pelajaran)
 values(new.id, left(coalesce(nullif(trim(new.raw_user_meta_data->>'nama'),''),'Pengguna'),100),
 left(coalesce(new.raw_user_meta_data->>'mata_pelajaran','Pengguna'),200));
 return new;
end $$;
revoke all on function public.wa_create_profile() from public,anon,authenticated;
drop trigger if exists wa_auth_profile on auth.users;
create trigger wa_auth_profile after insert on auth.users for each row execute function public.wa_create_profile();
-- Provision pre-existing Auth identities without touching legacy public.users.
insert into public.wa_profiles(id,nama,mata_pelajaran)
select id,left(coalesce(nullif(trim(raw_user_meta_data->>'nama'),''),'Pengguna'),100),
 left(coalesce(raw_user_meta_data->>'mata_pelajaran','Pengguna'),200) from auth.users
on conflict(id) do nothing;

create or replace function public.wa_is_group_member(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.wa_group_members where group_id=target and user_id=auth.uid())
 or exists(select 1 from public.wa_groups where id=target and created_by=auth.uid());
$$;
revoke all on function public.wa_is_group_member(uuid) from public,anon;
grant execute on function public.wa_is_group_member(uuid) to authenticated;

create or replace function public.wa_find_contact(contact_email text)
returns table(id uuid,nama text,mata_pelajaran text,avatar text,status text)
language sql stable security definer set search_path = '' as $$
 select p.id,p.nama,p.mata_pelajaran,p.avatar,p.status from public.wa_profiles p
 join auth.users u on u.id=p.id
 where auth.uid() is not null and u.email_confirmed_at is not null
 and lower(u.email)=lower(trim(contact_email)) and p.id<>auth.uid() limit 1;
$$;
revoke all on function public.wa_find_contact(text) from public,anon;
grant execute on function public.wa_find_contact(text) to authenticated;

-- Revoke broad default grants inherited from the old schema before granting the minimum.
revoke all on public.wa_profiles,public.wa_contacts,public.wa_groups,public.wa_group_members,public.wa_messages,public.wa_calls from public,anon,authenticated;
alter table public.wa_profiles enable row level security;
alter table public.wa_contacts enable row level security;
alter table public.wa_groups enable row level security;
alter table public.wa_group_members enable row level security;
alter table public.wa_messages enable row level security;
alter table public.wa_calls enable row level security;

grant select on public.wa_profiles to authenticated;
grant update(nama,mata_pelajaran,avatar,status,last_seen) on public.wa_profiles to authenticated;
grant select,insert,delete on public.wa_contacts to authenticated;
grant update(alias,note) on public.wa_contacts to authenticated;
grant select,insert on public.wa_groups,public.wa_group_members to authenticated;
grant update(name,description,avatar) on public.wa_groups to authenticated;
grant select on public.wa_messages to authenticated;
grant insert(id,sender_id,receiver_id,group_id,message_text,message_type,attachment_url) on public.wa_messages to authenticated;
grant update(message_text,is_deleted) on public.wa_messages to authenticated;
grant select on public.wa_calls to authenticated;
grant insert(id,caller_id,callee_id,call_type,status,offer) on public.wa_calls to authenticated;
grant update(status,answer) on public.wa_calls to authenticated;

drop policy if exists wa_profile_read on public.wa_profiles;
create policy wa_profile_read on public.wa_profiles for select to authenticated using (true);
drop policy if exists wa_profile_edit on public.wa_profiles;
create policy wa_profile_edit on public.wa_profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
drop policy if exists wa_contacts_owner on public.wa_contacts;
create policy wa_contacts_owner on public.wa_contacts for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
drop policy if exists wa_groups_read on public.wa_groups;
create policy wa_groups_read on public.wa_groups for select to authenticated using(public.wa_is_group_member(id));
drop policy if exists wa_groups_create on public.wa_groups;
create policy wa_groups_create on public.wa_groups for insert to authenticated with check(created_by=auth.uid());
drop policy if exists wa_groups_edit on public.wa_groups;
create policy wa_groups_edit on public.wa_groups for update to authenticated using(created_by=auth.uid()) with check(created_by=auth.uid());
drop policy if exists wa_members_read on public.wa_group_members;
create policy wa_members_read on public.wa_group_members for select to authenticated using(public.wa_is_group_member(group_id));
drop policy if exists wa_members_add on public.wa_group_members;
create policy wa_members_add on public.wa_group_members for insert to authenticated with check(exists(select 1 from public.wa_groups g where g.id=group_id and g.created_by=auth.uid()));
drop policy if exists wa_messages_read on public.wa_messages;
create policy wa_messages_read on public.wa_messages for select to authenticated using(
 sender_id=auth.uid() or receiver_id=auth.uid() or (group_id is not null and public.wa_is_group_member(group_id)));
drop policy if exists wa_messages_send on public.wa_messages;
create policy wa_messages_send on public.wa_messages for insert to authenticated with check(
 sender_id=auth.uid() and (receiver_id is not null or public.wa_is_group_member(group_id)));
drop policy if exists wa_messages_edit on public.wa_messages;
create policy wa_messages_edit on public.wa_messages for update to authenticated using(sender_id=auth.uid()) with check(sender_id=auth.uid());
drop policy if exists wa_calls_read on public.wa_calls;
create policy wa_calls_read on public.wa_calls for select to authenticated using(caller_id=auth.uid() or callee_id=auth.uid());
drop policy if exists wa_calls_create on public.wa_calls;
create policy wa_calls_create on public.wa_calls for insert to authenticated with check(caller_id=auth.uid() and status='ringing' and answer is null);
drop policy if exists wa_calls_edit on public.wa_calls;
create policy wa_calls_edit on public.wa_calls for update to authenticated using(caller_id=auth.uid() or callee_id=auth.uid()) with check(caller_id=auth.uid() or callee_id=auth.uid());

create or replace function public.wa_stamp_message() returns trigger language plpgsql set search_path='' as $$
begin
 if old.is_deleted then raise exception 'Pesan sudah dihapus'; end if;
 if new.is_deleted then new.message_text=''; new.attachment_url=''; end if;
 new.edited_at=now(); return new;
end $$;
drop trigger if exists wa_message_edit on public.wa_messages;
create trigger wa_message_edit before update on public.wa_messages for each row execute function public.wa_stamp_message();

-- Atomic per-user AI quota, shared across server instances. No client table access.
create table if not exists public.wa_ai_limits (
 user_id uuid primary key references auth.users(id) on delete cascade,
 window_start timestamptz not null default now(), requests integer not null default 0
);
alter table public.wa_ai_limits enable row level security;
revoke all on public.wa_ai_limits from public,anon,authenticated;
create or replace function public.wa_claim_ai_request() returns boolean
language plpgsql security definer set search_path='' as $$
declare quota public.wa_ai_limits;
begin
 if auth.uid() is null then return false; end if;
 insert into public.wa_ai_limits(user_id) values(auth.uid()) on conflict(user_id) do nothing;
 select * into quota from public.wa_ai_limits where user_id=auth.uid() for update;
 if quota.window_start < now()-interval '1 minute' then
  update public.wa_ai_limits set window_start=now(),requests=1 where user_id=auth.uid(); return true;
 end if;
 if quota.requests>=10 then return false; end if;
 update public.wa_ai_limits set requests=requests+1 where user_id=auth.uid(); return true;
end $$;
revoke all on function public.wa_claim_ai_request() from public,anon;
grant execute on function public.wa_claim_ai_request() to authenticated;

-- Ensure participant identities and call offers cannot be rewritten; column grants enforce this too.
create or replace function public.wa_validate_call_update() returns trigger language plpgsql set search_path='' as $$
begin
 if old.status in ('ended','rejected') then raise exception 'Panggilan sudah berakhir'; end if;
 if old.status='answered' and new.status<>'ended' then raise exception 'Panggilan hanya dapat diakhiri'; end if;
 if old.status='ringing' and new.status not in ('answered','rejected','ended') then raise exception 'Status panggilan tidak valid'; end if;
 if auth.uid()=old.caller_id and (new.status<>'ended' or new.answer is distinct from old.answer) then
  raise exception 'Hanya penerima dapat menjawab panggilan';
 end if;
 if new.status='answered' and (new.answer is null or old.status<>'ringing') then raise exception 'Jawaban panggilan tidak valid'; end if;
 new.updated_at=now(); return new;
end $$;
drop trigger if exists wa_call_update on public.wa_calls;
create trigger wa_call_update before update on public.wa_calls for each row execute function public.wa_validate_call_update();

do $$ declare t text; begin
 if not exists(select 1 from pg_publication where pubname='supabase_realtime') then
  raise exception 'Publication supabase_realtime belum tersedia. Konfigurasikan Realtime sebelum migrasi.';
 end if;
 foreach t in array array['wa_messages','wa_calls','wa_contacts','wa_profiles'] loop
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(
   select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
   execute format('alter publication supabase_realtime add table public.%I',t);
  end if;
 end loop;
 -- Close insecure legacy APIs while retaining the original tables and rows for manual migration.
 foreach t in array array['users','messages','groups','group_members','calls','statuses'] loop
  if to_regclass('public.'||t) is not null then
   execute format('revoke all on public.%I from public,anon,authenticated',t);
   execute format('alter table public.%I enable row level security',t);
  end if;
 end loop;
end $$;
commit;
