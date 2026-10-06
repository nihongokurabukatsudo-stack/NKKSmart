-- Semester report for the live schema (meetings, members, attendance).
-- Runs with caller privileges so the existing table RLS remains in force.
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
    select
      m.id,
      m.meeting_number,
      m.meeting_date,
      (m.status::text = 'libur') as is_libur
    from public.meetings m
    cross join semester_bounds b
    where m.meeting_date >= b.starts_on and m.meeting_date < b.ends_before
  ), attendance_by_member as (
    select
      a.member_id,
      jsonb_object_agg(a.meeting_id::text, a.status::text) as attendance
    from public.attendance a
    join semester_meetings sm on sm.id = a.meeting_id
    group by a.member_id
  )
  select jsonb_build_object(
    'meetings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', sm.id,
        'nama_pertemuan', 'Pertemuan ' || sm.meeting_number,
        'pertemuan_ke', sm.meeting_number,
        'tanggal', sm.meeting_date,
        'is_libur', sm.is_libur
      ) order by sm.meeting_date, sm.meeting_number, sm.id)
      from semester_meetings sm
    ), '[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'nama_lengkap', m.nama,
        'kelas', coalesce(m.kelas, ''),
        'jurusan', coalesce(m.jurusan, ''),
        'nis', m.nis,
        'jabatan', case when m.title::text = 'pengurus' then 'Pengurus' else 'Anggota' end,
        'attendance', coalesce(abm.attendance, '{}'::jsonb)
      ) order by (m.title::text = 'pengurus') desc, m.kelas, m.nama)
      from public.members m
      left join attendance_by_member abm on abm.member_id = m.id
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.rekap_semester(integer, integer) from public;
grant execute on function public.rekap_semester(integer, integer) to authenticated;
