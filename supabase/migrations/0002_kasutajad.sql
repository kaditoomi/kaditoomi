-- Uus Supabase Authi kasutaja saab automaatselt profiili rolliga "vaatleja".
-- Koolijuht määrab seejärel rolli ja vastutusala (Seaded → Kasutajad).
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, email, role)
  values (new.id, coalesce(split_part(new.email, '@', 1), 'Kasutaja'), new.email, 'viewer')
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Rakendus pöördub andmebaasi poole rollis "authenticated" (RLS kehtib).
-- Supabase annab need õigused vaikimisi; korratakse siin kohaliku arenduse jaoks.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
