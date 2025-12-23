-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create Patients Table (SAFE TO RE-RUN)
create table if not exists public.patients (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) not null,
    first_name text not null,
    last_name text not null,
    dob date not null,

    -- Patient Profile Details
    gender text check (gender in ('Male', 'Female', 'Other', 'Unknown')) default 'Unknown',
    phone text,
    email text,
    address text,
    medical_history text,
    allergies text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Note: admit_type, case_status, etc. are now handled in the CASES table.

-- Add new patient details (SAFE TO RE-RUN)
alter table public.patients add column if not exists gender text check (gender in ('Male', 'Female', 'Other', 'Unknown')) default 'Unknown';
alter table public.patients add column if not exists phone text;
alter table public.patients add column if not exists email text;
alter table public.patients add column if not exists address text;
alter table public.patients add column if not exists medical_history text;
alter table public.patients add column if not exists allergies text;

-- Enable RLS
alter table public.patients enable row level security;

-- ==========================================
-- PATIENTS TABLE POLICIES (DROP & RE-CREATE)
-- ==========================================

-- Drop potentially conflicting old policies
drop policy if exists "Users can perform all actions on their own patients" on public.patients;
drop policy if exists "Enable read access for users based on user_id" on public.patients;
drop policy if exists "Enable insert access for users based on user_id" on public.patients;
drop policy if exists "Enable update access for users based on user_id" on public.patients;
drop policy if exists "Enable delete access for users based on user_id" on public.patients;

-- 1. SELECT
create policy "Enable read access for users based on user_id"
on public.patients for select
using (auth.uid() = user_id);

-- 2. INSERT
create policy "Enable insert access for users based on user_id"
on public.patients for insert
with check (auth.uid() = user_id);

-- 3. UPDATE
create policy "Enable update access for users based on user_id"
on public.patients for update
using (auth.uid() = user_id);

-- 4. DELETE
create policy "Enable delete access for users based on user_id"
on public.patients for delete
using (auth.uid() = user_id);

-- ==========================================
-- STORAGE POLICIES (DROP & RE-CREATE)
-- Targeting bucket: 'file_bucket'
-- ==========================================

-- Drop potentially conflicting policies
drop policy if exists "Authenticated users can upload medical records" on storage.objects;
drop policy if exists "Users can view own medical records" on storage.objects;
drop policy if exists "Users can delete own medical records" on storage.objects;

-- 1. UPLOAD (INSERT)
create policy "Authenticated users can upload medical records"
on storage.objects for insert
to authenticated
with check (
    bucket_id = 'file_bucket' AND
    auth.uid() = owner
);

-- 2. VIEW (SELECT)
create policy "Users can view own medical records"
on storage.objects for select
to authenticated
using (
    bucket_id = 'file_bucket' AND
    auth.uid() = owner
);

-- 3. DELETE
create policy "Users can delete own medical records"
on storage.objects for delete
to authenticated
using (
    bucket_id = 'file_bucket' AND
    auth.uid() = owner
);

-- ==========================================
-- CASES TABLE (SAFE TO RE-RUN)
-- ==========================================

create table if not exists public.cases (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) not null,
    patient_id uuid references public.patients(id) on delete cascade not null,
    status text default 'Active',
    constraint cases_status_check check (status in ('Active', 'Upcoming', 'Closed')),
    admit_type text check (admit_type in ('Emergency', 'Routine')) default 'Routine',
    admit_reason text,
    diagnosis text,
    attachment_path text,
    started_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure Constraints are correct (SAFE TO RE-RUN)
DO $$
BEGIN
    -- Drop old/conflicting case status constraints if they exist
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cases_status_check') THEN
        ALTER TABLE public.cases DROP CONSTRAINT cases_status_check;
    END IF;
    -- Add the correct constraint
    ALTER TABLE public.cases ADD CONSTRAINT cases_status_check CHECK (status IN ('Active', 'Upcoming', 'Closed'));
EXCEPTION
    WHEN check_violation THEN
        -- If data violates check, we can't auto-fix in schema.sql safely without potentially altering data, 
        -- but the user has already run the fix. 
        -- Ideally, we'd warn or clean, but purely DDL scripts usually avoid data modification.
        -- However, given USER REQUEST to match fix_db.sql:
        RAISE NOTICE 'Constraint violation detected. Please clean data or run fix_db.sql first.';
END $$;

-- Enable RLS
alter table public.cases enable row level security;

-- Drop potentially conflicting old policies
drop policy if exists "Users can read own cases" on public.cases;
drop policy if exists "Users can insert own cases" on public.cases;
drop policy if exists "Users can update own cases" on public.cases;
drop policy if exists "Users can delete own cases" on public.cases;

-- 1. SELECT
create policy "Users can read own cases"
on public.cases for select
using (auth.uid() = user_id);

-- 2. INSERT
create policy "Users can insert own cases"
on public.cases for insert
with check (auth.uid() = user_id);

-- 3. UPDATE
create policy "Users can update own cases"
on public.cases for update
using (auth.uid() = user_id);

-- 4. DELETE
create policy "Users can delete own cases"
on public.cases for delete
using (auth.uid() = user_id);

-- ==========================================
-- APPOINTMENTS TABLE (SAFE TO RE-RUN)
-- ==========================================

create table if not exists public.appointments (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) not null,
    patient_id uuid references public.patients(id) on delete cascade not null,
    scheduled_at timestamp with time zone not null,
    status text check (status in ('Scheduled', 'Completed', 'Cancelled')) default 'Scheduled',
    reason text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.appointments add column if not exists case_id uuid;
alter table public.appointments drop constraint if exists appointments_case_id_fkey;
alter table public.appointments add constraint appointments_case_id_fkey
    foreign key (case_id) references public.cases(id) on delete set null;

-- Enable RLS
alter table public.appointments enable row level security;

-- Drop potentially conflicting old policies
drop policy if exists "Users can read own appointments" on public.appointments;
drop policy if exists "Users can insert own appointments" on public.appointments;
drop policy if exists "Users can update own appointments" on public.appointments;
drop policy if exists "Users can delete own appointments" on public.appointments;

-- 1. SELECT
create policy "Users can read own appointments"
on public.appointments for select
using (auth.uid() = user_id);

-- 2. INSERT
create policy "Users can insert own appointments"
on public.appointments for insert
with check (auth.uid() = user_id);

-- 3. UPDATE
create policy "Users can update own appointments"
on public.appointments for update
using (auth.uid() = user_id);

-- 4. DELETE
create policy "Users can delete own appointments"
on public.appointments for delete
using (auth.uid() = user_id);

-- ==========================================
-- VISIT NOTES TABLE (SAFE TO RE-RUN)
-- ==========================================

create table if not exists public.visit_notes (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) not null,
    patient_id uuid references public.patients(id) on delete cascade not null,
    appointment_id uuid references public.appointments(id) on delete set null,
    note text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.visit_notes add column if not exists case_id uuid;
alter table public.visit_notes drop constraint if exists visit_notes_case_id_fkey;
alter table public.visit_notes add constraint visit_notes_case_id_fkey
    foreign key (case_id) references public.cases(id) on delete cascade;

-- Enable RLS
alter table public.visit_notes enable row level security;

-- Drop potentially conflicting old policies
drop policy if exists "Users can read own visit notes" on public.visit_notes;
drop policy if exists "Users can insert own visit notes" on public.visit_notes;
drop policy if exists "Users can update own visit notes" on public.visit_notes;
drop policy if exists "Users can delete own visit notes" on public.visit_notes;

-- 1. SELECT
create policy "Users can read own visit notes"
on public.visit_notes for select
using (auth.uid() = user_id);

-- 2. INSERT
create policy "Users can insert own visit notes"
on public.visit_notes for insert
with check (auth.uid() = user_id);

-- 3. UPDATE
create policy "Users can update own visit notes"
on public.visit_notes for update
using (auth.uid() = user_id);

-- 4. DELETE
create policy "Users can delete own visit notes"
on public.visit_notes for delete
using (auth.uid() = user_id);

-- ==========================================
-- DOCTORS TABLE (SAFE TO RE-RUN)
-- ==========================================

create table if not exists public.doctors (
    user_id uuid references auth.users(id) primary key,
    display_name text,
    title text,
    department text,
    avatar_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Allow optional display name (SAFE TO RE-RUN)
alter table public.doctors alter column display_name drop not null;
alter table public.doctors add column if not exists avatar_url text;

-- Enable RLS
alter table public.doctors enable row level security;

-- Drop potentially conflicting old policies
drop policy if exists "Users can read own doctor profile" on public.doctors;
drop policy if exists "Users can insert own doctor profile" on public.doctors;
drop policy if exists "Users can update own doctor profile" on public.doctors;

-- 1. SELECT
create policy "Users can read own doctor profile"
on public.doctors for select
using (auth.uid() = user_id);

-- 2. INSERT
create policy "Users can insert own doctor profile"
on public.doctors for insert
with check (auth.uid() = user_id);

-- 3. UPDATE
create policy "Users can update own doctor profile"
on public.doctors for update
using (auth.uid() = user_id);
