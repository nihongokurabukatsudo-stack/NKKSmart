-- NKKSmart: install the semester report RPC.
-- Safe to rerun: only replaces this function; it does not modify table data.
-- Run this in the SQL Editor for project ceouldcpwflepwudqyvv.

begin;

do $preflight$
declare
  missing_tables text;
  missing_columns text;
begin
  select string_agg(required.table_name, ', ' order by required.table_name)
    into missing_tables
  from (values ('anggota'), ('absensi'), ('pertemuan')) as required(table_name)
  where to_regclass(format('public.%I', required.table_name)) is null;

  if missing_tables is not null then
    raise exception 'Schema NKKSmart tidak cocok. Tabel public berikut tidak ditemukan: %', missing_tables
      using errcode = '42P01', hint = 'Pastikan SQL Editor sedang membuka project Supabase yang sama dengan VITE_SUPABASE_URL.';
  end if;

  select string_agg(required.table_name || '.' || required.column_name, ', ' order by required.table_name, required.column_name)
    into missing_columns
  from (values
    ('anggota', 'id'),
    ('anggota', 'nama_lengkap'),
    ('anggota', 'kelas'),
    ('anggota', 'jurusan'),
    ('anggota', 'nis'),
    ('anggota', 'jabatan'),
    ('anggota', 'status'),
    ('anggota', 'is_deleted'),
    ('pertemuan', 'id'),
    ('pertemuan', 'nama_pertemuan'),
    ('pertemuan', 'pertemuan_ke'),
    ('pertemuan', 'tanggal'),
    ('pertemuan', 'is_libur'),
    ('absensi', 'id'),
    ('absensi', 'anggota_id'),
    ('absensi', 'pertemuan_id'),
    ('absensi', 'status')
  ) as required(table_name, column_name)
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = required.table_name
      and c.column_name = required.column_name
  );

  if missing_columns is not null then
    raise exception 'Schema NKKSmart belum lengkap. Kolom berikut tidak ditemukan: %', missing_columns
      using errcode = '42703', hint = 'Tidak ada perubahan yang diterapkan. Cocokkan nama kolom dengan schema project ini.';
  end if;
end;
$preflight$;

create or replace function public.rekap_semester(p_tahun integer, p_semester integer)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $function$
declare
  starts_on date;
  ends_before date;
  result jsonb;
begin
  if p_tahun is null or p_tahun < 1900 or p_tahun > 9998 then
    raise exception 'Tahun ajaran tidak valid.' using errcode = '22023';
  end if;

  if p_semester is null or p_semester not in (1, 2) then
    raise exception 'Semester harus bernilai 1 atau 2.' using errcode = '22023';
  end if;

  if p_semester = 1 then
    starts_on := make_date(p_tahun, 7, 1);
    ends_before := make_date(p_tahun + 1, 1, 1);
  else
    starts_on := make_date(p_tahun + 1, 1, 1);
    ends_before := make_date(p_tahun + 1, 7, 1);
  end if;

  with semester_meetings as (
    select
      p.id,
      p.nama_pertemuan,
      p.pertemuan_ke,
      p.tanggal,
      coalesce(p.is_libur, false) as is_libur
    from public.pertemuan p
    where p.tanggal >= starts_on
      and p.tanggal < ends_before
  ), active_members as (
    select a.id, a.nama_lengkap, a.kelas, a.jurusan, a.nis, a.jabatan
    from public.anggota a
    where a.status = 'Aktif'
      and coalesce(a.is_deleted, false) = false
  ), attendance_by_member as (
    select
      ab.anggota_id,
      jsonb_object_agg(
        ab.pertemuan_id::text,
        case when ab.status::text = 'hadir' then 'hadir' else 'tidak_hadir' end
        order by ab.pertemuan_id, ab.id
      ) as attendance
    from public.absensi ab
    join semester_meetings sm on sm.id = ab.pertemuan_id
    where ab.anggota_id is not null
    group by ab.anggota_id
  )
  select jsonb_build_object(
    'meetings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', sm.id,
        'nama_pertemuan', sm.nama_pertemuan,
        'pertemuan_ke', sm.pertemuan_ke,
        'tanggal', sm.tanggal,
        'is_libur', sm.is_libur
      ) order by sm.tanggal, sm.pertemuan_ke, sm.id)
      from semester_meetings sm
    ), '[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', am.id,
        'nama_lengkap', am.nama_lengkap,
        'kelas', am.kelas,
        'jurusan', am.jurusan,
        'nis', am.nis,
        'jabatan', am.jabatan,
        'attendance', coalesce(abm.attendance, '{}'::jsonb)
      ) order by (am.jabatan = 'Pengurus') desc, am.kelas, am.nama_lengkap)
      from active_members am
      left join attendance_by_member abm on abm.anggota_id = am.id
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$function$;

revoke all on function public.rekap_semester(integer, integer) from public, anon;
grant execute on function public.rekap_semester(integer, integer) to authenticated;

commit;

-- Optional smoke check after the transaction succeeds. Expected result: true, true.
select
  jsonb_typeof(public.rekap_semester(2026, 1)->'meetings') = 'array' as meetings_ok,
  jsonb_typeof(public.rekap_semester(2026, 1)->'members') = 'array' as members_ok;
