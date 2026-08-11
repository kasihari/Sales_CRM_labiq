-- ===========================================================================
-- Lab IQ Sales — Database schema + Row Level Security
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- ===========================================================================

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- USERS (profile row, 1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '',
  email       text not null default '',
  phone       text,
  role        text not null default 'salesperson'
                check (role in ('salesperson', 'manager')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'phone',
    coalesce(new.raw_user_meta_data ->> 'role', 'salesperson')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: is the current user a manager? (SECURITY DEFINER bypasses RLS,
-- so it never recurses into the users policies below.)
create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'manager'
  );
$$;

-- ---------------------------------------------------------------------------
-- ATTENDANCE (punch in / punch out)
-- ---------------------------------------------------------------------------
create table if not exists public.attendance (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.users (id) on delete cascade,
  punch_in_time         timestamptz not null default now(),
  punch_in_latitude     double precision,
  punch_in_longitude    double precision,
  punch_in_accuracy     double precision,
  punch_in_address      text,
  punch_out_time        timestamptz,
  punch_out_latitude    double precision,
  punch_out_longitude   double precision,
  punch_out_accuracy    double precision,
  punch_out_address     text,
  created_at            timestamptz not null default now()
);
create index if not exists attendance_user_idx on public.attendance (user_id, punch_in_time desc);

-- ---------------------------------------------------------------------------
-- SITES
-- ---------------------------------------------------------------------------
create table if not exists public.sites (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  site_type   text not null default 'Other'
                check (site_type in (
                  'Hospital','Diagnostic Centre','Laboratory','Clinic',
                  'Nursing Home','Pharmacy','Corporate','Other')),
  address     text,
  city        text,
  district    text,
  state       text,
  latitude    double precision,
  longitude   double precision,
  created_by  uuid references public.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists sites_name_idx on public.sites (lower(name));

-- ---------------------------------------------------------------------------
-- VISITS
-- ---------------------------------------------------------------------------
create table if not exists public.visits (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users (id) on delete cascade,
  site_id       uuid references public.sites (id) on delete set null,
  visit_time    timestamptz not null default now(),
  latitude      double precision,
  longitude     double precision,
  accuracy      double precision,
  address       text,
  person_met    text,
  designation   text,
  mobile        text,
  outcome       text
                  check (outcome in (
                    'Positive','Interested','Follow-up Required',
                    'Decision Maker Unavailable','Not Interested','No Opportunity')),
  notes         text,
  created_at    timestamptz not null default now()
);
create index if not exists visits_user_idx on public.visits (user_id, visit_time desc);
create index if not exists visits_time_idx on public.visits (visit_time desc);

-- ---------------------------------------------------------------------------
-- LEADS
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id                          uuid primary key default gen_random_uuid(),
  visit_id                    uuid references public.visits (id) on delete cascade,
  site_id                     uuid references public.sites (id) on delete set null,
  user_id                     uuid not null references public.users (id) on delete cascade,
  lead_type                   text,
  opportunity                 text[] not null default '{}',
  estimated_monthly_business  numeric(14,2),
  priority                    text check (priority in ('High','Medium','Low')),
  expected_conversion         text,
  next_followup_date          date,
  next_action                 text,
  status                      text not null default 'New'
                                check (status in (
                                  'New','Interested','Proposal Sent',
                                  'Negotiation','Won','Lost')),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
create index if not exists leads_user_idx on public.leads (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.users      enable row level security;
alter table public.attendance enable row level security;
alter table public.sites      enable row level security;
alter table public.visits     enable row level security;
alter table public.leads      enable row level security;

-- USERS ---------------------------------------------------------------------
drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select using (id = auth.uid() or public.is_manager());

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ATTENDANCE ----------------------------------------------------------------
drop policy if exists attendance_select on public.attendance;
create policy attendance_select on public.attendance
  for select using (user_id = auth.uid() or public.is_manager());

drop policy if exists attendance_insert on public.attendance;
create policy attendance_insert on public.attendance
  for insert with check (user_id = auth.uid());

drop policy if exists attendance_update on public.attendance;
create policy attendance_update on public.attendance
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- SITES (shared catalogue: any authenticated user can read / add) -----------
drop policy if exists sites_select on public.sites;
create policy sites_select on public.sites
  for select using (auth.role() = 'authenticated');

drop policy if exists sites_insert on public.sites;
create policy sites_insert on public.sites
  for insert with check (auth.uid() = created_by);

drop policy if exists sites_update on public.sites;
create policy sites_update on public.sites
  for update using (created_by = auth.uid() or public.is_manager());

-- VISITS --------------------------------------------------------------------
drop policy if exists visits_select on public.visits;
create policy visits_select on public.visits
  for select using (user_id = auth.uid() or public.is_manager());

drop policy if exists visits_insert on public.visits;
create policy visits_insert on public.visits
  for insert with check (user_id = auth.uid());

drop policy if exists visits_update on public.visits;
create policy visits_update on public.visits
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- LEADS ---------------------------------------------------------------------
drop policy if exists leads_select on public.leads;
create policy leads_select on public.leads
  for select using (user_id = auth.uid() or public.is_manager());

drop policy if exists leads_insert on public.leads;
create policy leads_insert on public.leads
  for insert with check (user_id = auth.uid());

drop policy if exists leads_update on public.leads;
create policy leads_update on public.leads
  for update using (user_id = auth.uid() or public.is_manager())
  with check (user_id = auth.uid() or public.is_manager());
