\set ON_ERROR_STOP on
begin;
do $$ begin
 if (select count(*) from public.users)<>1 then raise exception 'legacy data was not retained'; end if;
end $$;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('11111111-1111-4111-8111-111111111111','alice@example.test',now(),'{"nama":"Alice"}'),
 ('22222222-2222-4222-8222-222222222222','bob@example.test',now(),'{"nama":"Bob"}'),
 ('33333333-3333-4333-8333-333333333333','eve@example.test',now(),'{"nama":"Eve"}');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
insert into public.wa_contacts(owner_id,contact_id,alias) values(auth.uid(),'22222222-2222-4222-8222-222222222222','Teman');
insert into public.wa_groups(id,name,created_by) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Private Group',auth.uid());
insert into public.wa_group_members(group_id,user_id) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222');
insert into public.wa_messages(id,sender_id,receiver_id,message_text) values('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',auth.uid(),'22222222-2222-4222-8222-222222222222','Secret direct');
insert into public.wa_messages(sender_id,group_id,message_text) values(auth.uid(),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Secret group');
insert into public.wa_calls(id,caller_id,callee_id,call_type,offer) values('call-test',auth.uid(),'22222222-2222-4222-8222-222222222222','voice','offer');
do $$ declare i int; begin
 if (select count(*) from public.wa_messages)<>2 then raise exception 'sender must read both messages'; end if;
 if (select count(*) from public.wa_find_contact('BOB@example.test'))<>1 then raise exception 'exact contact lookup failed'; end if;
 if (select count(*) from public.wa_find_contact('%'))<>0 then raise exception 'wildcard contact lookup allowed'; end if;
 for i in 1..10 loop
  if not public.wa_claim_ai_request() then raise exception 'quota rejected request %',i; end if;
 end loop;
 if public.wa_claim_ai_request() then raise exception 'quota exceeded ten requests'; end if;
 begin
  update public.wa_messages set receiver_id='33333333-3333-4333-8333-333333333333';
  raise exception 'recipient tampering permitted';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.wa_messages(sender_id,receiver_id,message_text) values('22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','forged');
  raise exception 'sender impersonation permitted';
 exception when insufficient_privilege then null; end;
 begin
  update public.wa_calls set status='answered',answer='fake answer' where id='call-test';
  raise exception 'caller answered own call';
 exception when raise_exception then
  if sqlerrm='caller answered own call' then raise; end if;
 end;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ declare changed integer; begin
 if (select count(*) from public.wa_messages)<>2 then raise exception 'recipient/group member cannot read messages'; end if;
 if (select count(*) from public.wa_contacts)<>0 then raise exception 'contact list leaked'; end if;
 update public.wa_messages set message_text='tampered'; get diagnostics changed=row_count;
 if changed<>0 then raise exception 'recipient modified sender messages'; end if;
 update public.wa_profiles set nama='tampered' where id='11111111-1111-4111-8111-111111111111'; get diagnostics changed=row_count;
 if changed<>0 then raise exception 'another user profile modified'; end if;
 begin
  delete from public.wa_messages;
  raise exception 'physical deletion allowed';
 exception when insufficient_privilege then null; end;
end $$;
update public.wa_calls set status='answered',answer='answer' where id='call-test';
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
do $$ begin
 if (select count(*) from public.wa_messages)<>0 then raise exception 'third party can read private/group messages'; end if;
 if (select count(*) from public.wa_calls)<>0 then raise exception 'third party can read call SDP'; end if;
 if (select count(*) from public.wa_groups)<>0 then raise exception 'third party can read private groups'; end if;
 begin
  insert into public.wa_messages(sender_id,group_id,message_text) values(auth.uid(),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','intruder');
  raise exception 'nonmember can send group messages';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.wa_group_members(group_id,user_id) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',auth.uid());
  raise exception 'nonmember can self-enroll';
 exception when insufficient_privilege then null; end;
 begin
  select * from public.wa_ai_limits;
  raise exception 'quota table exposed';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
update public.wa_messages set is_deleted=true where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
delete from public.wa_contacts where contact_id='22222222-2222-4222-8222-222222222222';
do $$ begin
 if (select count(*) from public.wa_profiles)<>3 then raise exception 'deleting contact deleted a user'; end if;
 if (select count(*) from public.wa_messages)<>2 then raise exception 'deleting contact destroyed history'; end if;
 if (select message_text from public.wa_messages where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')<>'' then raise exception 'deleted message content remains exposed'; end if;
 if not (select is_deleted from public.wa_messages where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') then raise exception 'soft delete failed'; end if;
end $$;
set local role anon;
do $$ begin
 begin perform * from public.users; raise exception 'legacy passwords still exposed'; exception when insufficient_privilege then null; end;
 begin perform * from public.wa_messages; raise exception 'anonymous messages access'; exception when insufficient_privilege then null; end;
 begin perform * from public.wa_profiles; raise exception 'anonymous profiles access'; exception when insufficient_privilege then null; end;
 begin perform * from public.wa_find_contact('bob@example.test'); raise exception 'anonymous lookup'; exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'PASS: real PostgreSQL RLS for sender, recipient, third party, groups, calls, contacts, anonymous access, and AI quota' as result;
