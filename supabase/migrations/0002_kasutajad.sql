-- =====================================================================
-- Kasutajad ja rakenduse andmebaasiühendus.
-- Käivitada PÄRAST 0001_skeem.sql ja 0001b_turvaparandus.sql.
-- Võib käivitada mitu korda (asendab funktsioonid ja triggerid).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Profiil tekib ainult KUTSUTUD kasutajale
--    Supabase'is: Authentication → Users → Invite user. Supabase Auth loob kasutaja
--    ja märgib kutse (invited_at) eraldi sammuna, seetõttu jälgib trigger nii
--    lisamist kui ka invited_at muutumist.
--    Roll on alati "viewer"; kasutaja enda saadetud metaandmeid (raw_user_meta_data)
--    ei kasutata, seega ei saa keegi end registreerimisel administraatoriks teha.
--    Iseregistreerunud kasutaja profiili ei saa ja RLS ei näita talle midagi.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.invited_at is not null then
    insert into public.profiles (id, full_name, email, role, is_active)
    values (new.id, coalesce(nullif(split_part(new.email, '@', 1), ''), 'Kasutaja'), new.email, 'viewer', true)
    on conflict (id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists on_auth_user_invited on auth.users;
create trigger on_auth_user_invited
  after update of invited_at on auth.users
  for each row when (old.invited_at is null and new.invited_at is not null)
  execute function public.handle_new_user();

-- E-posti muutus Supabase Authis jõuab ka profiili (ainult e-post, mitte roll).
create or replace function public.handle_user_email_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = new.email where id = new.id and email is distinct from new.email;
  return new;
end $$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

revoke all on function public.handle_new_user(), public.handle_user_email_change() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Rakenduse serveri andmebaasikasutaja (Verceli DATABASE_URL)
--    Server EI kasuta rolli "postgres" (see möödub RLS-ist). Roll app_server:
--      - ei ole superuser, ei möödu RLS-ist, ei loo rolle ega andmebaase;
--      - NOINHERIT ja ilma otseõigusteta: ilma "set role authenticated"-ita ei näe midagi;
--      - rakendus teeb iga päringu tehingus "set local role authenticated" +
--        JWT-väide sub = Supabase Authi poolt kontrollitud kasutaja (lib/db.ts asUser),
--        seega kehtivad samad RLS-poliitikad kui Supabase'i API kaudu.
--    Parool määratakse eraldi, mitte selles failis:
--      alter role app_server with password '<pikk juhuslik parool>';
--    Ühendus (Supabase → Connect → Transaction pooler), kasutajanimi app_server.<projekti-ref>.
-- ---------------------------------------------------------------------
do $$
declare m record;
begin
  if not exists (select 1 from pg_roles where rolname = 'app_server') then
    create role app_server login noinherit nosuperuser nocreatedb nocreaterole nobypassrls noreplication;
  else
    alter role app_server login noinherit nosuperuser nocreatedb nocreaterole nobypassrls noreplication;
  end if;
  -- app_server tohib olla ainult rolli authenticated liige
  for m in
    select r.rolname from pg_auth_members am join pg_roles r on r.oid = am.roleid
    where am.member = (select oid from pg_roles where rolname = 'app_server') and r.rolname <> 'authenticated'
  loop
    execute format('revoke %I from app_server', m.rolname);
  end loop;
end $$;

-- Otseõigusi ei anta; kõik käib rolli authenticated kaudu.
revoke all on all tables    in schema public from app_server;
revoke all on all functions in schema public from app_server;
grant authenticated to app_server;

commit;

-- ---------------------------------------------------------------------
-- Kontrollpäringud (käivita pärast faili; kõik peavad andma tühja tulemuse):
--
-- a) Kasutajad ilma profiilita (nt iseregistreerunud — kui avalik registreerimine
--    on sisse jäänud). Neil pole ligipääsu, kuid nad tuleks Supabase'is kustutada:
--      select id, email, created_at from auth.users u
--      where not exists (select 1 from public.profiles p where p.id = u.id);
--
-- b) app_server ei tohi RLS-ist mööda minna:
--      select rolname from pg_roles where rolname = 'app_server' and (rolsuper or rolbypassrls or rolinherit);
--
-- c) anon ei tohi saada ühtegi tabeli- ega vaateõigust:
--      select table_name, privilege_type from information_schema.role_table_grants
--      where grantee = 'anon' and table_schema = 'public';
--
-- d) Iga tabelil on RLS sees:
--      select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
--      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
-- ---------------------------------------------------------------------
