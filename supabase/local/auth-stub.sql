-- AINULT kohalikuks arenduseks ilma Supabase'ita: jäljendab Supabase'i "auth" skeemi
-- ja rolle, mida migratsioonid kasutavad. Supabase'i projektis seda faili EI käivitata.
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text, invited_at timestamptz);
create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
end $$;
grant usage on schema auth to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
-- Supabase'i vaikimisi õigused, et migratsioonide "revoke" oleks kohapeal samamoodi testitav
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
