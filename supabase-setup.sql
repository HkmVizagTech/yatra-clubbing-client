-- ============================================================
--  Yatra Clubbing · Supabase setup
--  Run this once in  Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- 1) Registrations table -------------------------------------------------
create table if not exists public.registrations (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  ref                text unique not null,
  name               text not null,
  phone              text not null,
  email              text,
  pass_type          text not null,                 -- 'general' | 'student'
  qty_general        int  not null default 0,
  qty_student        int  not null default 0,
  total              int  not null default 0,        -- rupees
  student_status     text,
  id_card_path       text,                            -- path in the student-ids bucket
  payment_id         text,
  order_id           text,
  payment_signature  text,
  payment_status     text not null default 'pending', -- 'paid' | 'demo' | 'pending'
  raw                jsonb                            -- full payload, for safety
);

create index if not exists registrations_created_idx on public.registrations (created_at desc);
create index if not exists registrations_phone_idx   on public.registrations (phone);

-- The table is written/read only by the server (service-role key), so we keep
-- Row Level Security ON with no public policies — anon/public cannot touch it.
alter table public.registrations enable row level security;

-- 2) Private storage bucket for student ID cards -------------------------
insert into storage.buckets (id, name, public)
values ('student-ids', 'student-ids', false)
on conflict (id) do nothing;
-- No storage policies added → bucket is reachable only with the service-role
-- key (server side). Admins view IDs via short-lived signed URLs.
