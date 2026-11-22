create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  focus text not null default 'Autocuidado'
    check (focus in ('Autocuidado', 'Movimento', 'Estilo', 'Rotina')),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  local_date date not null,
  completed_task_ids integer[] not null default '{}',
  mission_done boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, local_date)
);

alter table public.profiles enable row level security;
alter table public.daily_progress enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.daily_progress from anon, authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.daily_progress to authenticated;

create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create their own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their own profile"
  on public.profiles for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read their own daily progress"
  on public.daily_progress for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can create their own daily progress"
  on public.daily_progress for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own daily progress"
  on public.daily_progress for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their own daily progress"
  on public.daily_progress for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name, focus)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(new.raw_user_meta_data ->> 'focus', 'Autocuidado')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_profile_created on auth.users;
create trigger on_auth_user_profile_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user_profile();
