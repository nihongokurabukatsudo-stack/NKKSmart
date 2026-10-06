-- Aggregated semester report for the admin UI. Uses caller privileges and RLS.
create or replace function public.rekap_semester(p_tahun integer, p_semester integer)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with semester_bounds as (
    select
      case when p_semester = 1 then make_date(p_tahun, 7, 1)
           else make_date(p_tahun + 1, 1, 1) end as starts_on,
      case when p_semester = 1 then make_date(p_tahun + 1, 1, 1)
           else make_date(p_tahun + 1, 7, 1) end as ends_before
    where p_semester in (1, 2)
  ), semester_meetings as (
    select p.id, p.nama_pertemuan, p.pertemuan_ke, p.tanggal, coalesce(p.is_libur, false) as is_libur
    from public.pertemuan p
    cross join semester_bounds b
    where p.tanggal >= b.starts_on and p.tanggal < b.ends_before
  ), active_members as (
    select a.id, a.nama_lengkap, a.kelas, a.jurusan, a.nis, a.jabatan
    from public.anggota a
    where a.status = 'Aktif' and coalesce(a.is_deleted, false) = false
  ), attendance_by_member as (
    select ab.anggota_id,
      jsonb_object_agg(ab.pertemuan_id::text, ab.status order by ab.pertemuan_id) as attendance
    from public.absensi ab
    join semester_meetings sm on sm.id = ab.pertemuan_id
    where ab.status in ('hadir', 'izin', 'sakit', 'alpha')
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
  );
$$;

revoke all on function public.rekap_semester(integer, integer) from public;
grant execute on function public.rekap_semester(integer, integer) to authenticated;
