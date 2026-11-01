-- شغّل هذا الملف مرة واحدة في Supabase: SQL Editor → New query → Run

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  company text,
  status text not null default 'found'
    check (status in ('found','suitable','applied','interview','offer','rejected')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.chats (
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null,
  messages jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, mode)
);

alter table public.profiles enable row level security;
alter table public.applications enable row level security;
alter table public.chats enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own applications" on public.applications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own chats" on public.chats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
