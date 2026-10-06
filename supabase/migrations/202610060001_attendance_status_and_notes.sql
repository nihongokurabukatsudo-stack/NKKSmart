-- DRAFT: review against the live Supabase schema before applying.
-- Required by the meeting attendance editor (izin/sakit/alpha + per-member notes).
alter table public.absensi drop constraint if exists absensi_status_check;
alter table public.absensi add constraint absensi_status_check
  check (status in ('hadir', 'izin', 'sakit', 'alpha'));
alter table public.absensi add column if not exists catatan text;
