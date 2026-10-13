-- =====================================================================
-- Kasutajad ja rakenduse andmebaasiühendus. Käivitada pärast 0001_skeem.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Profiil tekib ainult KUTSUTUD kasutajale
--    Supabase'is: Authentication → Users → Invite user. Kutsutud kasutaja saab
--    rolli "vaatleja"; koolijuht määrab rolli ja vastutusala rakenduse seadetes.
--    Roll on alati "viewer" — kasutaja enda saadetud metaandmeid (raw_user_meta_data)
--    ei kasutata, seega ei saa keegi end registreerimisel administraatoriks teha.
--    Iseregistreerunud kasutaja (kui registreerimine peaks olema lubatud) profiili
--    ei saa ja RLS ei näita talle midagi.
-- ---------------------------------------------------------------------
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.invited_at is not null then
    insert into public.profiles (id, full_name, email, role)
    values (new.id, coalesce(nullif(split_part(new.email, '@', 1), ''), 'Kasutaja'), new.email, 'viewer')
    on conflict (id) do nothing;
  end if;
  return new;
end $$;

revoke all on function handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- E-posti muutus Supabase Authis jõuab ka profiili (ainult e-post, mitte roll).
create function handle_user_email_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = new.email where id = new.id and email is distinct from new.email;
  return new;
end $$;

revoke all on function handle_user_email_change() from public, anon, authenticated;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function handle_user_email_change();

-- ---------------------------------------------------------------------
-- 2. Rakenduse serveri andmebaasikasutaja (Verceli DATABASE_URL)
--    Server EI kasuta rolli "postgres" (see möödub RLS-ist). Roll app_server:
--      - ei ole superuser, ei möödu RLS-ist, ei loo rolle ega andmebaase;
--      - NOINHERIT: ilma "set role authenticated"-ita pole tal ühtegi tabeliõigust;
--      - rakendus teeb iga päringu tehingus "set local role authenticated" +
--        JWT-väide sub = sisselogitud kasutaja (lib/db.ts asUser), seega kehtib RLS.
--    Parool määratakse eraldi (mitte selles failis):
--      alter role app_server with password '<pikk juhuslik parool>';
--    Ühendus (Supabase → Connect → Transaction pooler), kasutajanimi app_server.<projekti-ref>:
--      postgres://app_server.<ref>:<parool>@aws-0-<regioon>.pooler.supabase.com:6543/postgres
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_server') then
    create role app_server login noinherit nosuperuser nocreatedb nocreaterole nobypassrls noreplication;
  end if;
end $$;

grant authenticated to app_server;
