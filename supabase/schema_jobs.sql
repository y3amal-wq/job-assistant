-- شغّل هذا الملف بعد schema.sql: SQL Editor → New query → Run

-- المشرفون (من يحق لهم نشر الوظائف)
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- وظائف تنشرها المنصة / أصحاب العمل
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text not null,
  city text,
  job_type text not null default 'full_time'
    check (job_type in ('full_time','part_time','remote','internship','contract')),
  level text,
  description text,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- الوظائف المحفوظة (مفضلة) — داخلية أو خارجية
create table if not exists public.saved_jobs (
  user_id uuid not null references auth.users(id) on delete cascade,
  job_key text not null,
  job jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, job_key)
);

-- التقديم السريع على وظائف المنصة
create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  applicant_email text,
  profile_summary text,
  message text,
  status text not null default 'new'
    check (status in ('new','reviewed','shortlisted','rejected')),
  created_at timestamptz not null default now(),
  unique (job_id, user_id)
);

-- تنبيهات الوظائف
create table if not exists public.job_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  keywords text,
  city text,
  last_checked timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ذاكرة مؤقتة لنتائج البحث الخارجي (لتوفير حصة API)
create table if not exists public.search_cache (
  cache_key text primary key,
  results jsonb not null,
  fetched_at timestamptz not null default now()
);

alter table public.admins enable row level security;
alter table public.jobs enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.job_applications enable row level security;
alter table public.job_alerts enable row level security;
alter table public.search_cache enable row level security;

create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create policy "see own admin row" on public.admins
  for select using (user_id = auth.uid());

create policy "read active jobs" on public.jobs
  for select to authenticated using (active or public.is_admin());
create policy "admin insert jobs" on public.jobs
  for insert to authenticated with check (public.is_admin());
create policy "admin update jobs" on public.jobs
  for update to authenticated using (public.is_admin());
create policy "admin delete jobs" on public.jobs
  for delete to authenticated using (public.is_admin());

create policy "own saved jobs" on public.saved_jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "apply as self" on public.job_applications
  for insert to authenticated with check (auth.uid() = user_id);
create policy "read own or admin" on public.job_applications
  for select to authenticated using (auth.uid() = user_id or public.is_admin());
create policy "admin update applications" on public.job_applications
  for update to authenticated using (public.is_admin());

create policy "own alerts" on public.job_alerts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "read cache" on public.search_cache
  for select to authenticated using (true);
create policy "write cache" on public.search_cache
  for insert to authenticated with check (true);
create policy "update cache" on public.search_cache
  for update to authenticated using (true);

-- اجعل نفسك مشرفاً (بدّل البريد ببريدك المسجّل في الموقع بعد إنشاء حسابك):
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'ضع_بريدك_هنا';
