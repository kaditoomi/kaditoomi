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
-- Supabase'i "postgres" ei ole superuser: ta ei tohi muuta olemasoleva rolli atribuute
-- (ALTER ROLE ... NOBYPASSRLS/NOREPLICATION annab vea "permission denied to alter role").
-- Seetõttu: uus roll luuakse ainult turvaliste vaikeväärtustega (NOSUPERUSER, NOBYPASSRLS,
-- NOREPLICATION, NOCREATEDB, NOCREATEROLE on vaikimisi), olemasolevat rolli ainult KONTROLLITAKSE.
do $$
declare
  r record;
  bad text;
begin
  if not exists (select 1 from pg_roles where rolname = 'app_server') then
    create role app_server login noinherit;
  end if;

  select * into r from pg_roles where rolname = 'app_server';
  bad := concat_ws(', ',
    case when r.rolsuper      then 'SUPERUSER'   end,
    case when r.rolbypassrls  then 'BYPASSRLS'   end,
    case when r.rolreplication then 'REPLICATION' end,
    case when r.rolcreaterole then 'CREATEROLE'  end,
    case when r.rolcreatedb   then 'CREATEDB'    end,
    case when r.rolinherit    then 'INHERIT'     end);
  if bad <> '' then
    raise exception 'Roll app_server on ohtlike atribuutidega: %. Kustuta roll (drop role app_server) ja käivita fail uuesti.', bad;
  end if;

  -- app_server tohib olla ainult rolli authenticated liige
  select string_agg(g.rolname, ', ') into bad
  from pg_auth_members am join pg_roles g on g.oid = am.roleid
  where am.member = r.oid and g.rolname <> 'authenticated';
  if bad is not null then
    raise exception 'Roll app_server on lisaks rollide % liige. Eemalda need (revoke ... from app_server) ja käivita fail uuesti.', bad;
  end if;

  -- app_serveril ei tohi olla otseõigusi tabelitele (kõik käib rolli authenticated kaudu)
  if exists (select 1 from information_schema.role_table_grants where grantee = 'app_server') then
    raise exception 'Rollil app_server on otseõigusi tabelitele. Eemalda need: revoke all on all tables in schema public from app_server;';
  end if;

  -- Liikmesus rollis authenticated (vajalik "set local role authenticated" jaoks).
  -- Antakse ainult siis, kui seda veel pole.
  if not pg_has_role('app_server', 'authenticated', 'MEMBER') then
    begin
      grant authenticated to app_server;
    exception when insufficient_privilege then
      raise exception 'Rolli authenticated ei saanud app_server rollile anda (puudub ADMIN OPTION). Käivita Supabase''i SQL Editoris eraldi: grant authenticated to app_server;  Kui see annab sama vea, võta ühendust Supabase''i toega.';
    end;
  end if;
end $$;

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
--      select rolname from pg_roles where rolname = 'app_server'
--        and (rolsuper or rolbypassrls or rolreplication or rolcreaterole or rolcreatedb or rolinherit);
--
-- b2) app_server peab olema rolli authenticated liige (see päring peab andma TÄPSELT ühe rea "true"):
--      select pg_has_role('app_server', 'authenticated', 'MEMBER');
--
-- c) anon ei tohi saada ühtegi tabeli- ega vaateõigust:
--      select table_name, privilege_type from information_schema.role_table_grants
--      where grantee = 'anon' and table_schema = 'public';
--
-- d) Iga tabelil on RLS sees:
--      select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
--      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
-- ---------------------------------------------------------------------
