create table if not exists public.appearance_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  result jsonb,
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint appearance_analyses_result_object check (result is null or jsonb_typeof(result) = 'object')
);

create index if not exists appearance_analyses_user_created_idx
  on public.appearance_analyses (user_id, created_at desc);

alter table public.appearance_analyses enable row level security;
revoke all on table public.appearance_analyses from anon, authenticated;
grant select, insert, delete on table public.appearance_analyses to authenticated;

drop policy if exists "Users can read their own appearance analyses" on public.appearance_analyses;
create policy "Users can read their own appearance analyses"
  on public.appearance_analyses for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own consented appearance analyses" on public.appearance_analyses;
create policy "Users can create their own consented appearance analyses"
  on public.appearance_analyses for insert to authenticated
  with check ((select auth.uid()) = user_id and consent_at <= now() and status = 'pending' and result is null);

drop policy if exists "Users can delete their own appearance analyses" on public.appearance_analyses;
create policy "Users can delete their own appearance analyses"
  on public.appearance_analyses for delete to authenticated
  using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('analysis-photos', 'analysis-photos', false, 8388608, array['image/jpeg'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload their own analysis photos" on storage.objects;
create policy "Users can upload their own analysis photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'analysis-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can remove their own analysis photos" on storage.objects;
create policy "Users can remove their own analysis photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'analysis-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
