-- Dental AI Receptionist Platform — additive migration
-- Run AFTER schema.sql. Does not touch profiles/conversations/messages/memory/leads,
-- which remain the chat/auth backbone reused from Fikria AI Consultant.
--
-- Design notes:
--   * "profiles" (existing) continues to represent the authenticated app user
--     (staff/admin login). Patients are a separate, mostly-unauthenticated concept
--     driven by the AI receptionist, so they get their own table.
--   * appointment_status is modeled as a CHECK constraint (not a separate lookup
--     table) to keep queries simple; see comment below on why.
--   * doctor_role/receptionist_role tables intentionally minimal — this is a
--     ONE unified dashboard build. Per-doctor auth/dashboards are a clear
--     extension point, noted inline below.

-- ── Doctors ──────────────────────────────────────────────────────────────
create table if not exists doctors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,                 -- e.g. 'sarah-johnson' -> /doctors/sarah-johnson.jpg
  name text not null,
  specialty text not null,                   -- e.g. 'Orthodontist'
  qualification text,
  experience_years int not null default 0,
  biography text,
  treatments text[] not null default '{}',
  languages text[] not null default '{}',
  working_days text[] not null default '{}', -- e.g. '{Mon,Tue,Wed,Thu,Fri}'
  working_hours_start time not null default '09:00',
  working_hours_end time not null default '17:00',
  slot_duration_minutes int not null default 30,
  image_path text,                           -- '/doctors/sarah-johnson.jpg'; UI falls back to placeholder
  active boolean not null default true,
  created_at timestamptz default now()
);

-- ── Services ─────────────────────────────────────────────────────────────
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  category text,                             -- e.g. 'General', 'Cosmetic', 'Orthodontics'
  duration_minutes int not null default 30,
  created_at timestamptz default now()
);

-- ── Clinic information (singleton-style config table) ───────────────────
create table if not exists clinic_information (
  id uuid primary key default gen_random_uuid(),
  clinic_name text not null default 'Fikria Dental Clinic',
  address text,
  phone text,
  whatsapp_number text,
  email text,
  timings jsonb not null default '{}',       -- { "Mon-Fri": "9:00 AM - 7:00 PM", ... }
  insurance_info jsonb not null default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── FAQ ──────────────────────────────────────────────────────────────────
create table if not exists faq (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text,
  created_at timestamptz default now()
);

-- ── Patients ─────────────────────────────────────────────────────────────
-- Deliberately decoupled from auth.users: most patients interact only through
-- the unauthenticated AI receptionist widget and never create an account.
create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null, -- nullable: set only if patient is logged in
  name text not null,
  phone text not null,
  email text,
  notes text,
  created_at timestamptz default now(),
  unique (phone)
);

-- ── Appointments ─────────────────────────────────────────────────────────
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  appointment_code text not null unique,      -- human-friendly ID, e.g. 'FKD-A1B2C3'
  patient_id uuid not null references patients(id) on delete cascade,
  doctor_id uuid not null references doctors(id) on delete restrict,
  service_id uuid references services(id) on delete set null,
  reason text,
  appointment_date date not null,
  appointment_time time not null,
  -- appointment_status kept as a CHECK constraint rather than a lookup table:
  -- the status set is small, fixed, and queried constantly (dashboard filters),
  -- so a lookup-table join adds cost without adding flexibility here. The
  -- concept still appears in the spec's table list via this constraint +
  -- the `appointment_status_history` audit table below.
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  conversation_id uuid references conversations(id) on delete set null, -- links back to the chat that booked it
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  -- Prevent double-booking the same doctor at the same date/time
  unique (doctor_id, appointment_date, appointment_time)
);

-- Audit trail of status changes (fulfills the spec's "appointment_status" table
-- as a history log rather than a redundant enum lookup)
create table if not exists appointment_status_history (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_at timestamptz default now(),
  changed_by uuid references auth.users(id) on delete set null
);

-- ── Admins & Receptionists ───────────────────────────────────────────────
-- Thin role tables layered on top of existing auth.users + profiles.
-- Extension point: promote to full per-role dashboards later by branching
-- on these roles in middleware.ts instead of the current single-dashboard check.
create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists receptionists (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────
create index if not exists idx_appointments_doctor_date on appointments(doctor_id, appointment_date);
create index if not exists idx_appointments_patient on appointments(patient_id);
create index if not exists idx_appointments_status on appointments(status);
create index if not exists idx_patients_phone on patients(phone);

-- ── Row Level Security ───────────────────────────────────────────────────
-- Public-facing tables (doctors, services, clinic_information, faq) are
-- readable by anyone (needed for the unauthenticated AI receptionist + landing
-- page) but writable only via the service role (admin dashboard uses the
-- server-side Supabase client with the service key, never the anon key, for writes).
alter table doctors enable row level security;
alter table services enable row level security;
alter table clinic_information enable row level security;
alter table faq enable row level security;
alter table patients enable row level security;
alter table appointments enable row level security;
alter table appointment_status_history enable row level security;
alter table admins enable row level security;
alter table receptionists enable row level security;

create policy "Public can read active doctors" on doctors for select using (active = true);
create policy "Public can read services" on services for select using (true);
create policy "Public can read clinic information" on clinic_information for select using (true);
create policy "Public can read faq" on faq for select using (true);

-- Patients/appointments have no public policies: all access goes through
-- server-side API routes using the service role key (see lib/supabase/server.ts
-- usage in app/api/appointments/route.ts), never directly from the browser.

-- Admins/receptionists (authenticated staff) can read appointment data via
-- the dashboard; enforced at the API layer by checking admins/receptionists
-- membership, not via broad RLS, to keep the policy surface small and auditable.
create policy "Staff can view own admin row" on admins for select using (auth.uid() = user_id);
create policy "Staff can view own receptionist row" on receptionists for select using (auth.uid() = user_id);

-- ── Seed: clinic_information singleton row ──────────────────────────────
insert into clinic_information (clinic_name, address, phone, whatsapp_number, email, timings, insurance_info)
select
  'Fikria Dental Clinic',
  '221 Marina Boulevard, Velankanni, Tamil Nadu',
  '+91 90000 00000',
  '+91 90000 00000',
  'hello@fikriadental.example',
  '{"Mon-Fri": "9:00 AM - 7:00 PM", "Sat": "9:00 AM - 4:00 PM", "Sun": "Closed"}'::jsonb,
  '["Star Health", "HDFC Ergo", "ICICI Lombard", "Self-pay / Cash"]'::jsonb
where not exists (select 1 from clinic_information);
