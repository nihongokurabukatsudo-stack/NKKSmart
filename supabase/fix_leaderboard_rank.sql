-- Run in Supabase SQL Editor to update the public leaderboard ranking.
-- Sort: attendance count descending, then full name A-Z; positions are unique.
-- Result limit is capped at 9, with positions 1-3 shown on the podium.

-- A7: Public leaderboard sorted by attendance count, then member name A-Z.
create or replace function public.get_public_leaderboard(p_periode text default 'semester', p_limit integer default 9)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_start date;
  v_end date;
  v_period_label text;
  v_month_label text;
  v_enabled boolean;
  v_name_mode text;
  v_limit integer;
  v_result jsonb;
  v_next_meeting jsonb;
begin
  select coalesce((value #>> '{}')::boolean, true) into v_enabled from public.app_settings where key = 'leaderboard_enabled';
  if not coalesce(v_enabled, true) then return jsonb_build_object('enabled', false); end if;
  select coalesce(value #>> '{}', 'singkat') into v_name_mode from public.app_settings where key = 'leaderboard_nama_mode';
  v_limit := least(greatest(coalesce(p_limit, 9), 1), 9);

  if p_periode is null or p_periode not in ('bulan', 'semester') then
    raise exception 'Periode leaderboard tidak valid.' using errcode = '22023';
  end if;

  if p_periode = 'bulan' then
    v_start := date_trunc('month', v_today)::date;
    v_end := (v_start + interval '1 month')::date;
    v_month_label := (array['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'])[extract(month from v_start)::integer];
    v_period_label := 'Bulan ' || v_month_label || ' ' || extract(year from v_start)::integer::text;
  else
    if extract(month from v_today) >= 7 then
      v_start := make_date(extract(year from v_today)::integer, 7, 1);
      v_end := make_date(extract(year from v_today)::integer + 1, 1, 1);
      v_period_label := 'Semester 1 ' || extract(year from v_today)::integer::text || '/' || (extract(year from v_today)::integer + 1)::text;
    else
      v_start := make_date(extract(year from v_today)::integer, 1, 1);
      v_end := make_date(extract(year from v_today)::integer, 7, 1);
      v_period_label := 'Semester 2 ' || (extract(year from v_today)::integer - 1)::text || '/' || extract(year from v_today)::integer::text;
    end if;
  end if;

  with active_members as (
    select a.id, a.nama_lengkap, a.kelas, a.jurusan,
      concat_ws(' ', nullif(a.kelas, ''), nullif(a.jurusan, '')) as kelas_label
    from public.anggota a
    where a.jabatan = 'Anggota' and a.status = 'Aktif' and a.is_deleted = false and a.tampil_leaderboard = true
  ), completed_meetings as (
    select p.id, p.tanggal from public.pertemuan p
    where p.tanggal >= v_start and p.tanggal < v_end
      and p.tanggal <= v_today and coalesce(p.is_libur, false) = false
  ), member_stats as (
    select m.id, m.nama_lengkap, m.kelas_label,
      count(distinct cm.id)::integer as total,
      (count(distinct ab.pertemuan_id) filter (where ab.status = 'hadir'))::integer as hadir
    from active_members m
    left join completed_meetings cm on true
    left join public.absensi ab on ab.anggota_id = m.id and ab.pertemuan_id = cm.id
    group by m.id, m.nama_lengkap, m.kelas_label
  ), rated as (
    select *, round(100.0 * hadir / nullif(total, 0))::integer as persen
    from member_stats
  ), ranked as (
    -- Every member has a unique position: more attendance first, then A-Z.
    select *, row_number() over (order by hadir desc, lower(btrim(nama_lengkap)), nama_lengkap, id)::integer as posisi
    from rated
  )
  select jsonb_build_object(
    'enabled', true,
    'periode', jsonb_build_object('label', v_period_label, 'mulai', v_start, 'sampai', v_end - 1),
    'ringkasan', jsonb_build_object(
      'anggota_aktif', (select count(*) from active_members),
      'pertemuan_terlaksana', (select count(*) from completed_meetings),
      'rata_rata_persen', coalesce((select round(avg(persen))::integer from rated), 0)
    ),
    'leaderboard', coalesce((select jsonb_agg(jsonb_build_object(
      'rank', page.posisi,
      'nama_tampil', case
        when v_name_mode = 'penuh' then page.nama_lengkap
        when v_name_mode = 'inisial' then left(page.nama_lengkap, 1) || '.'
        else array_to_string((regexp_split_to_array(btrim(page.nama_lengkap), '\s+'))[1:2], ' ')
      end,
      'kelas_label', page.kelas_label, 'hadir', page.hadir, 'total', page.total
    ) order by page.hadir desc, lower(btrim(page.nama_lengkap)), page.nama_lengkap, page.id)
      from (select * from ranked order by hadir desc, lower(btrim(nama_lengkap)), nama_lengkap, id limit v_limit) page), '[]'::jsonb),
    'kelas', coalesce((select jsonb_agg(jsonb_build_object('kelas_label', class_stats.kelas_label, 'rata_persen', class_stats.rata_persen, 'jumlah_anggota', class_stats.jumlah_anggota) order by class_stats.rata_persen desc, class_stats.kelas_label)
      from (select kelas_label, round(avg(persen))::integer as rata_persen, count(*)::integer as jumlah_anggota from rated group by kelas_label having count(*) >= 3) class_stats), '[]'::jsonb),
    'jadwal_berikutnya', v_next_meeting,
    'diperbarui', now()
  ) into v_result;

  select jsonb_build_object('nama_pertemuan', p.nama_pertemuan, 'tanggal', p.tanggal, 'jam_mulai', p.jam_mulai_scan, 'jam_akhir', p.jam_akhir_scan, 'is_libur', p.is_libur)
  into v_next_meeting from public.pertemuan p where p.tanggal >= v_today order by p.tanggal, p.jam_mulai_scan limit 1;
  v_result := jsonb_set(v_result, '{jadwal_berikutnya}', coalesce(v_next_meeting, 'null'::jsonb), true);
  return v_result;
end;
$$;
revoke all on function public.get_public_leaderboard(text, integer) from public;
grant execute on function public.get_public_leaderboard(text, integer) to anon, authenticated;
