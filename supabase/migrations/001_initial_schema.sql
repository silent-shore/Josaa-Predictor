create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user',
  created_at timestamptz not null default now()
);

create table if not exists public.institutes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  institute_type text not null,
  state text,
  city text,
  official_code text,
  created_at timestamptz not null default now(),
  unique(name, institute_type)
);

create table if not exists public.academic_programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text,
  degree text,
  duration_years int,
  created_at timestamptz not null default now(),
  unique(name)
);

create table if not exists public.josaa_cutoffs (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  round int not null,
  institute_id uuid references public.institutes(id) on delete cascade,
  program_id uuid references public.academic_programs(id) on delete cascade,
  institute_name_raw text not null,
  program_name_raw text not null,
  quota text,
  seat_type text,
  gender text,
  opening_rank_raw text,
  closing_rank_raw text,
  opening_rank_num int,
  closing_rank_num int,
  rank_suffix text,
  rank_list_type text,
  source_url text,
  source_hash text,
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(year, round, institute_name_raw, program_name_raw, quota, seat_type, gender, opening_rank_raw, closing_rank_raw)
);

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  source_name text,
  source_url text,
  year int,
  round int,
  status text,
  total_rows int not null default 0,
  inserted_rows int not null default 0,
  skipped_rows int not null default 0,
  invalid_rows int not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid references auth.users(id)
);

create table if not exists public.import_errors (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.import_batches(id) on delete cascade,
  row_number int,
  raw_row jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.data_snapshots (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  round int not null,
  total_rows int not null,
  source_url text,
  source_hash text,
  created_at timestamptz not null default now()
);

create index if not exists josaa_cutoffs_year_idx on public.josaa_cutoffs(year);
create index if not exists josaa_cutoffs_round_idx on public.josaa_cutoffs(round);
create index if not exists josaa_cutoffs_institute_id_idx on public.josaa_cutoffs(institute_id);
create index if not exists josaa_cutoffs_program_id_idx on public.josaa_cutoffs(program_id);
create index if not exists josaa_cutoffs_institute_name_trgm_idx on public.josaa_cutoffs using gin(institute_name_raw gin_trgm_ops);
create index if not exists josaa_cutoffs_program_name_trgm_idx on public.josaa_cutoffs using gin(program_name_raw gin_trgm_ops);
create index if not exists josaa_cutoffs_closing_rank_num_idx on public.josaa_cutoffs(closing_rank_num);
create index if not exists josaa_cutoffs_seat_type_idx on public.josaa_cutoffs(seat_type);
create index if not exists josaa_cutoffs_quota_idx on public.josaa_cutoffs(quota);
create index if not exists josaa_cutoffs_gender_idx on public.josaa_cutoffs(gender);
create index if not exists josaa_cutoffs_filter_idx on public.josaa_cutoffs(year, round, seat_type, gender, quota, closing_rank_num);

alter table public.profiles enable row level security;
alter table public.institutes enable row level security;
alter table public.academic_programs enable row level security;
alter table public.josaa_cutoffs enable row level security;
alter table public.import_batches enable row level security;
alter table public.import_errors enable row level security;
alter table public.data_snapshots enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create policy "public read institutes" on public.institutes for select using (true);
create policy "public read academic programs" on public.academic_programs for select using (true);
create policy "public read cutoffs" on public.josaa_cutoffs for select using (true);
create policy "public read snapshots" on public.data_snapshots for select using (true);

create policy "users read own profile" on public.profiles for select using (auth.uid() = id or public.is_admin());
create policy "admins manage profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

create policy "admins manage institutes" on public.institutes for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage academic programs" on public.academic_programs for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage cutoffs" on public.josaa_cutoffs for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage import batches" on public.import_batches for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage import errors" on public.import_errors for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage snapshots" on public.data_snapshots for all using (public.is_admin()) with check (public.is_admin());
