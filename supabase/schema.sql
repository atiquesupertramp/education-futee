-- Éducation Futée: database schema (Supabase project "Éducation Futée", ref uaulnbilcewbjrhjvqik, ca-central-1).
-- Reference copy of what is applied in Supabase. Apply new changes as migrations
-- (Supabase MCP apply_migration or the Supabase CLI), then update this file.

create extension if not exists pgcrypto;

-- One row per group code (e.g. 3CF-E-01). Program, cycle and subject are derived from the code.
create table public.groups (
  code text primary key,
  program text not null check (program in ('tutorat','classes_futees')),
  cycle int not null check (cycle in (2,3)),
  subject text not null check (subject in ('lecture','ecriture','math')),
  teacher text,
  day text,
  time text,
  zoom_url text,
  zoom_id text,
  zoom_password text,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One family per parent email; siblings share it.
create table public.families (
  id uuid primary key default gen_random_uuid(),
  parent_name text,
  parent_email text not null,
  parent_phone text,
  created_at timestamptz not null default now()
);
create unique index families_email_idx on public.families (lower(parent_email));

create table public.students (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  first_name text not null,
  grade text,
  cycle int not null check (cycle in (2,3)),
  start_date date,
  end_date date,
  membership_status text not null default 'actif' check (membership_status in ('actif','en_pause','termine')),
  closer_name text,
  notes text,
  created_at timestamptz not null default now()
);

-- One row per (student, group). Each has its own confirmation token and follow-up state.
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  group_code text not null references public.groups(code) on update cascade,
  status text not null default 'en_attente' check (status in ('en_attente','envoye','relance','a_appeler','confirme','termine')),
  confirm_token uuid not null default gen_random_uuid() unique,
  welcome_sent_at timestamptz,
  confirmed_at timestamptz,
  confirmed_via text,
  reminder_sent_at timestamptz,
  escalated_at timestamptz,
  next_action_at timestamptz,
  call_done_at timestamptz,
  call_notes text,
  created_at timestamptz not null default now(),
  unique (student_id, group_code)
);

-- Every email/SMS the system generates (demo: stored, never sent).
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  enrollment_id uuid references public.enrollments(id) on delete cascade,
  channel text not null check (channel in ('email','sms')),
  kind text not null,          -- bienvenue | relance | sms_relance | merci | alerte_va
  to_address text not null,
  subject text,
  body_html text,
  body_text text,
  status text not null default 'simule',  -- simule | envoye | envoye_test | echec
  provider_id text,            -- Resend message id
  error text,
  sent_at timestamptz not null default now()
);

create table public.events (
  id bigint generated always as identity primary key,
  student_id uuid references public.students(id) on delete cascade,
  enrollment_id uuid references public.enrollments(id) on delete cascade,
  type text not null,
  detail text,
  at timestamptz not null default now()
);

-- Single-row settings.
create table public.settings (
  id int primary key default 1 check (id = 1),
  demo_offset_hours int not null default 0,
  sender_email text not null default 'bienvenue@onboarding.educationfutee.com',
  reply_to text not null default 'info@educationfutee.com',
  va_email text not null default 'info@educationfutee.com',
  sms_enabled boolean not null default false,
  email_mode text not null default 'simule' check (email_mode in ('simule','test','reel')),
  test_recipients text not null default ''
);
insert into public.settings (id) values (1);

create index on public.students (family_id);
create index on public.enrollments (student_id);
create index on public.enrollments (group_code);
create index on public.enrollments (status, next_action_at);
create index on public.messages (student_id);
create index on public.messages (enrollment_id);
create index on public.events (student_id);
create index on public.events (enrollment_id);

-- DEMO ONLY: RLS on, open policy for the anon/publishable key, which is used
-- server-side only. Tighten before real data (service key + restrictive policies).
do $$
declare t text;
begin
  foreach t in array array['groups','families','students','enrollments','messages','events','settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "demo_server_access" on public.%I for all to anon using (true) with check (true)', t);
  end loop;
end $$;
