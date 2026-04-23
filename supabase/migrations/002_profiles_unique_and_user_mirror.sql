alter table public.financial_profiles
add constraint financial_profiles_user_id_unique unique (user_id);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

drop policy if exists "Users can manage their profile" on public.financial_profiles;
create policy "Users can read own profile" on public.financial_profiles
for select using (auth.uid() = user_id);

create policy "Users can insert own profile" on public.financial_profiles
for insert with check (auth.uid() = user_id);

create policy "Users can update own profile" on public.financial_profiles
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete own profile" on public.financial_profiles
for delete using (auth.uid() = user_id);
