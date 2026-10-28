-- The legacy anonymous schema has been retired to prevent accidentally reopening data.
-- Review ONLINE-SETUP.md and run migrations/001_authenticated_chat.sql in Supabase SQL Editor.
-- That migration retains legacy rows and creates authenticated wa_* tables.
do $$ begin
 raise exception 'Skema lama dinonaktifkan. Gunakan migrations/001_authenticated_chat.sql sesuai ONLINE-SETUP.md.';
end $$;
