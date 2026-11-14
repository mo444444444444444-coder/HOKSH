-- نور الإسلام: قاعدة بيانات الأسئلة والأجوبة والحسابات
-- شغّل هذا الملف في Supabase SQL Editor. لا تضع service_role key في الموقع.
create extension if not exists pgcrypto;

create table if not exists public.noor_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'visitor' check (role in ('visitor','sheikh','admin')),
  created_at timestamptz not null default now()
);
create table if not exists public.noor_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null default 'زائر',
  is_anonymous boolean not null default false,
  title text not null check (char_length(title) between 3 and 160),
  body text not null check (char_length(body) between 5 and 5000),
  status text not null default 'pending' check (status in ('pending','published','closed')),
  created_at timestamptz not null default now()
);
create table if not exists public.noor_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.noor_questions(id) on delete cascade,
  staff_id uuid not null references auth.users(id),
  body text not null check (char_length(body) between 2 and 5000),
  created_at timestamptz not null default now()
);
create index if not exists noor_questions_user_created on public.noor_questions(user_id, created_at desc);
create index if not exists noor_questions_status_created on public.noor_questions(status, created_at desc);
create index if not exists noor_answers_question on public.noor_answers(question_id, created_at);

create or replace function public.noor_is_staff()
returns boolean language sql stable security definer set search_path=pg_catalog, public, auth
as $function$ select exists(select 1 from public.noor_profiles p where p.id=auth.uid() and p.role in ('admin','sheikh')); $function$;
revoke all on function public.noor_is_staff() from public, anon;
grant execute on function public.noor_is_staff() to authenticated;
create or replace function public.noor_new_profile()
returns trigger language plpgsql security definer set search_path=pg_catalog, public, auth
as $function$ begin insert into public.noor_profiles(id,display_name) values(new.id, coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name',split_part(coalesce(new.email,''),'@',1))) on conflict(id) do nothing; return new; end; $function$;
drop trigger if exists noor_auth_user_profile on auth.users;
create trigger noor_auth_user_profile after insert on auth.users for each row execute procedure public.noor_new_profile();
revoke all on function public.noor_new_profile() from public, anon, authenticated;
insert into public.noor_profiles(id,display_name) select id, coalesce(raw_user_meta_data->>'full_name',raw_user_meta_data->>'name',split_part(coalesce(email,''),'@',1)) from auth.users on conflict(id) do nothing;

alter table public.noor_profiles enable row level security;
alter table public.noor_questions enable row level security;
alter table public.noor_answers enable row level security;

drop policy if exists "noor profile self read" on public.noor_profiles;
create policy "noor profile self read" on public.noor_profiles for select to authenticated using (id=auth.uid() or public.noor_is_staff());

drop policy if exists "noor public ask" on public.noor_questions;
create policy "noor public ask" on public.noor_questions for insert to anon, authenticated with check (status='pending' and (user_id is null or user_id=auth.uid()));
drop policy if exists "noor questions staff read" on public.noor_questions;
create policy "noor questions staff read" on public.noor_questions for select to authenticated using (public.noor_is_staff());
drop policy if exists "noor own questions read" on public.noor_questions;
create policy "noor own questions read" on public.noor_questions for select to authenticated using (user_id=auth.uid());
drop policy if exists "noor published questions public read" on public.noor_questions;
create policy "noor published questions public read" on public.noor_questions for select to anon, authenticated using (status='published');
drop policy if exists "noor staff update questions" on public.noor_questions;
create policy "noor staff update questions" on public.noor_questions for update to authenticated using (public.noor_is_staff()) with check (public.noor_is_staff());

drop policy if exists "noor answers staff insert" on public.noor_answers;
create policy "noor answers staff insert" on public.noor_answers for insert to authenticated with check (staff_id=auth.uid() and public.noor_is_staff());
drop policy if exists "noor answers public read published" on public.noor_answers;
create policy "noor answers public read published" on public.noor_answers for select to anon, authenticated using (exists(select 1 from public.noor_questions q where q.id=question_id and (q.status='published' or (auth.uid() is not null and q.user_id=auth.uid()))));
drop policy if exists "noor answers staff read" on public.noor_answers;
create policy "noor answers staff read" on public.noor_answers for select to authenticated using (public.noor_is_staff());

grant select on public.noor_profiles to authenticated;
grant select, insert on public.noor_questions to anon;
grant select, insert, update on public.noor_questions to authenticated;
grant select on public.noor_answers to anon;
grant select, insert on public.noor_answers to authenticated;
