-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create Patients Table (SAFE TO RE-RUN)
create table if not exists public.patients (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) not null,
    first_name text not null,
    last_name text not null,
    dob date not null,
    status text check (status in ('Admitted', 'Discharged', 'Critical', 'Stable')) default 'Admitted',
    diagnosis text,
    attachment_path text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add admit fields (SAFE TO RE-RUN)
alter table public.patients add column if not exists admit_type text check (admit_type in ('Emergency', 'Routine')) default 'Routine';
alter table public.patients add column if not exists admit_reason text;

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
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Allow optional display name (SAFE TO RE-RUN)
alter table public.doctors alter column display_name drop not null;

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
