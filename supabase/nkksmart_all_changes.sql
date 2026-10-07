-- NKKSmart backend setup for project ceouldcpwflepwudqyvv.
-- Safe to rerun: additive schema changes and CREATE OR REPLACE RPCs only.
-- Does not delete tables, rows, or existing scan RPCs.

begin;

-- Stop before making changes if this is not the legacy schema expected by the app.
do $preflight$
declare
  missing_tables text;
  missing_columns text;
  admin_id_type text;
begin
  select string_agg(required.table_name, ', ' order by required.table_name)
    into missing_tables
  from (values ('admins'), ('anggota'), ('barcode'), ('pertemuan'), ('absensi')) as required(table_name)
  where to_regclass(format('public.%I', required.table_name)) is null;
  if missing_tables is not null then
    raise exception 'Schema project tidak cocok; tabel public hilang: %', missing_tables
      using errcode = '42P01', hint = 'Pastikan SQL Editor membuka project ceouldcpwflepwudqyvv.';
  end if;

  select string_agg(required.table_name || '.' || required.column_name, ', ' order by required.table_name, required.column_name)
    into missing_columns
  from (values
    ('admins','id'), ('admins','username'), ('admins','full_name'),
    ('anggota','id'), ('anggota','kode_qr'), ('anggota','nama_lengkap'), ('anggota','kelas'),
    ('anggota','jurusan'), ('anggota','nis'), ('anggota','jenis_kelamin'), ('anggota','jabatan'),
    ('anggota','status'), ('anggota','is_deleted'), ('anggota','created_at'),
    ('barcode','anggota_id'), ('barcode','kode_unik'), ('barcode','qr_value'),
    ('pertemuan','id'), ('pertemuan','nama_pertemuan'), ('pertemuan','pertemuan_ke'),
    ('pertemuan','tanggal'), ('pertemuan','is_libur'), ('pertemuan','jam_mulai_scan'), ('pertemuan','jam_akhir_scan'),
    ('absensi','id'), ('absensi','pertemuan_id'), ('absensi','anggota_id'),
    ('absensi','barcode_id'), ('absensi','status'), ('absensi','scan_time'), ('absensi','waktu_scan')
  ) as required(table_name, column_name)
  where not exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = required.table_name
      and c.column_name = required.column_name
  );
  if missing_columns is not null then
    raise exception 'Schema project belum cocok; kolom public hilang: %', missing_columns
      using errcode = '42703', hint = 'Transaksi dibatalkan tanpa perubahan. Cocokkan schema dengan database NKKSmart.';
  end if;

  select c.data_type into admin_id_type
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = 'admins' and c.column_name = 'id';
  if admin_id_type <> 'uuid' then
    raise exception 'admins.id harus UUID untuk menghubungkan pemroses ke auth.uid(); tipe saat ini: %', admin_id_type;
  end if;
  if to_regprocedure('public.is_admin()') is null then
    raise exception 'Fungsi public.is_admin() tidak ditemukan; RPC admin tidak dibuat.';
  end if;

  if to_regclass('public.pendaftar') is not null then
    select string_agg(required.column_name, ', ' order by required.column_name)
      into missing_columns
    from (values ('id'), ('nama_lengkap'), ('kelas'), ('jurusan'), ('nis'), ('jenis_kelamin'),
      ('kontak'), ('alasan'), ('status'), ('created_at'), ('diproses_oleh'), ('diproses_pada'),
      ('alasan_tolak'), ('anggota_id')) as required(column_name)
    where not exists (
      select 1 from information_schema.columns c
      where c.table_schema = 'public' and c.table_name = 'pendaftar'
        and c.column_name = required.column_name
    );
    if missing_columns is not null then
      raise exception 'Tabel public.pendaftar sudah ada tetapi belum lengkap: %', missing_columns;
    end if;
    if exists (
      select 1 from public.pendaftar
      where status = 'pending'
      group by lower(nama_lengkap), kelas, jurusan
      having count(*) > 1
    ) then
      raise exception 'Ada pendaftar pending duplikat; periksa datanya sebelum membuat index pendaftar.';
    end if;
  end if;
end;
$preflight$;

-- Attendance status supports manual izin/sakit/alpha plus existing legacy values.
do $attendance_status$
declare
  status_data_type text;
  status_type_schema text;
  status_type_name text;
  status_label text;
begin
  select c.data_type, c.udt_schema, c.udt_name
    into status_data_type, status_type_schema, status_type_name
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = 'absensi' and c.column_name = 'status';

  alter table public.absensi drop constraint if exists absensi_status_check;
  if status_data_type = 'USER-DEFINED' then
    foreach status_label in array array['izin', 'sakit', 'alpha'] loop
      execute format('alter type %I.%I add value if not exists %L', status_type_schema, status_type_name, status_label);
    end loop;
  elsif status_data_type in ('text', 'character varying', 'character') then
    alter table public.absensi add constraint absensi_status_check
      check (status in ('hadir', 'izin', 'sakit', 'alpha', 'tidak_hadir', 'libur')) not valid;
  else
    raise exception 'Tipe absensi.status tidak didukung: %', status_data_type;
  end if;
end;
$attendance_status$;

alter table public.absensi add column if not exists catatan text;
alter table public.anggota add column if not exists tampil_leaderboard boolean not null default true;



-- NIS remains optional and may repeat.
alter table public.anggota drop constraint if exists anggota_nis_key;
create index if not exists anggota_nis_idx on public.anggota(nis);
create index if not exists pertemuan_rekap_semester_idx
  on public.pertemuan (tanggal, pertemuan_ke, id);
create index if not exists absensi_rekap_semester_idx
  on public.absensi (pertemuan_id, anggota_id) include (status);
create index if not exists anggota_rekap_semester_idx
  on public.anggota (jabatan, kelas, nama_lengkap)
  where status = 'Aktif' and coalesce(is_deleted, false) = false;

-- A2: Public registration queue. Anonymous clients can only call the submit RPC.
create table if not exists public.pendaftar (
  id bigint generated always as identity primary key,
  nama_lengkap text not null check (char_length(nama_lengkap) between 1 and 120),
  kelas text not null check (char_length(kelas) <= 32),
  jurusan text not null default '-' check (char_length(jurusan) <= 100),
  nis text,
  jenis_kelamin text check (jenis_kelamin in ('L', 'P')),
  kontak text check (kontak is null or char_length(kontak) <= 100),
  alasan text check (alasan is null or char_length(alasan) <= 500),
  status text not null default 'pending' check (status in ('pending', 'disetujui', 'ditolak')),
  created_at timestamptz not null default now(),
  diproses_oleh uuid references public.admins(id) on delete set null,
  diproses_pada timestamptz,
  alasan_tolak text,
  anggota_id bigint references public.anggota(id) on delete set null
);
create index if not exists pendaftar_status_idx on public.pendaftar(status);
create index if not exists pendaftar_created_at_idx on public.pendaftar(created_at desc);
create unique index if not exists pendaftar_pending_identity_idx
  on public.pendaftar (lower(nama_lengkap), kelas, jurusan)
  where status = 'pending';

alter table public.pendaftar enable row level security;
revoke all on table public.pendaftar from public, anon;
grant select, update, delete on table public.pendaftar to authenticated;
drop policy if exists "Admin manages pendaftar" on public.pendaftar;
create policy "Admin manages pendaftar" on public.pendaftar
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant usage, select on sequence public.pendaftar_id_seq to authenticated;

-- A3: Start after the highest existing NKKP-#### barcode without hard-coding a number.
create sequence if not exists public.kode_anggota_seq as bigint start with 1 increment by 1;
select setval(
  'public.kode_anggota_seq',
  greatest(
    1,
    coalesce((select max(substring(kode_unik from '^NKKP-([0-9]{4})$')::bigint) + 1
              from public.barcode where kode_unik ~ '^NKKP-[0-9]{4}$'), 1),
    (select last_value + case when is_called then 1 else 0 end from public.kode_anggota_seq)
  ),
  false
);

-- A7 settings and member opt-out flag.
alter table public.anggota add column if not exists tampil_leaderboard boolean not null default true;
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null
);
alter table public.app_settings enable row level security;
revoke all on table public.app_settings from public, anon;
grant select, insert, update, delete on table public.app_settings to authenticated;
drop policy if exists "Admin manages app settings" on public.app_settings;
create policy "Admin manages app settings" on public.app_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
insert into public.app_settings(key, value) values
  ('leaderboard_enabled', 'true'::jsonb),
  ('leaderboard_nama_mode', '"singkat"'::jsonb),
  ('leaderboard_min_pertemuan', '3'::jsonb),
  ('leaderboard_limit', '10'::jsonb)
on conflict (key) do nothing;

-- Public registration endpoint; anonymous clients can only call this RPC.
create or replace function public.submit_pendaftaran(
  p_nama text,
  p_kelas text,
  p_jurusan text,
  p_nis text,
  p_jk text,
  p_kontak text,
  p_alasan text,
  p_website text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nama text := btrim(coalesce(p_nama, ''));
  v_kelas text := btrim(coalesce(p_kelas, ''));
  v_jurusan text := btrim(coalesce(p_jurusan, ''));
  v_jk text := upper(btrim(coalesce(p_jk, '')));
  v_pending_count integer;
begin
  if btrim(coalesce(p_website, '')) <> '' then
    return jsonb_build_object('ok', true);
  end if;

  perform pg_advisory_xact_lock(hashtextextended('submit_pendaftaran', 0));
  if v_nama = '' or char_length(v_nama) > 120
     or v_kelas not in ('X', 'XI')
     or v_jurusan not in ('PSPT 1', 'PSPT 2', 'TJKT 1', 'TJKT 2', 'PPLG', 'TAV 1', 'TAV 2', 'TMT', 'TITL 1', 'TITL 2', 'TITL 3', 'TITL 4', 'TPM 1', 'TPM 2', 'TPM 3', 'TPM 4', 'OT 1', 'OT 2', 'OT 3', 'OT 4', 'DPIB 1', 'DPIB 2', 'DPIB 3', 'DPIB 4')
     or v_jk not in ('L', 'P')
     or char_length(btrim(coalesce(p_kontak, ''))) > 100
     or char_length(btrim(coalesce(p_alasan, ''))) > 500 then
    return jsonb_build_object('ok', false, 'message', 'Periksa kembali data pendaftaran.');
  end if;

  select count(*) into v_pending_count from public.pendaftar where status = 'pending';
  if v_pending_count >= 500 then
    return jsonb_build_object('ok', false, 'message', 'Pendaftaran sedang penuh. Silakan coba lagi nanti.');
  end if;

  insert into public.pendaftar(nama_lengkap, kelas, jurusan, nis, jenis_kelamin, kontak, alasan)
  values (
    v_nama,
    v_kelas,
    v_jurusan,
    nullif(btrim(coalesce(p_nis, '')), ''), -- do not normalize NIS; the literal text "null" remains valid
    v_jk,
    nullif(btrim(coalesce(p_kontak, '')), ''),
    nullif(btrim(coalesce(p_alasan, '')), '')
  )
  on conflict (lower(nama_lengkap), kelas, jurusan) where status = 'pending' do nothing;

  return jsonb_build_object('ok', true);
exception when others then
  return jsonb_build_object('ok', false, 'message', 'Pendaftaran belum dapat diproses. Silakan coba lagi.');
end;
$$;
revoke all on function public.submit_pendaftaran(text, text, text, text, text, text, text, text) from public;
grant execute on function public.submit_pendaftaran(text, text, text, text, text, text, text, text) to anon, authenticated;

-- Admin approval atomically creates the member and barcode.
create or replace function public.approve_pendaftaran(p_id bigint, p_ubah jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pendaftar public.pendaftar%rowtype;
  v_nama text;
  v_kelas text;
  v_jurusan text;
  v_nis text;
  v_jk text;
  v_kode text;
  v_anggota_id bigint;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'message', 'Akses ditolak.');
  end if;

  select * into v_pendaftar from public.pendaftar where id = p_id for update;
  if not found then return jsonb_build_object('ok', false, 'message', 'Pendaftar tidak ditemukan.'); end if;
  if v_pendaftar.status <> 'pending' then return jsonb_build_object('ok', false, 'message', 'Pendaftar sudah diproses.'); end if;

  v_nama := btrim(coalesce(p_ubah->>'nama_lengkap', v_pendaftar.nama_lengkap));
  v_kelas := btrim(coalesce(p_ubah->>'kelas', v_pendaftar.kelas));
  v_jurusan := btrim(coalesce(p_ubah->>'jurusan', v_pendaftar.jurusan));
  v_nis := case when p_ubah ? 'nis' then p_ubah->>'nis' else v_pendaftar.nis end;
  v_jk := upper(btrim(coalesce(p_ubah->>'jenis_kelamin', v_pendaftar.jenis_kelamin, '')));
  if v_nama = '' or char_length(v_nama) > 120 or v_kelas not in ('X', 'XI') or v_jurusan = '' or char_length(v_jurusan) > 100 or v_jk not in ('L', 'P') then
    return jsonb_build_object('ok', false, 'message', 'Data pendaftar tidak valid.');
  end if;

  v_kode := 'NKKP-' || lpad(nextval('public.kode_anggota_seq')::text, 4, '0');
  insert into public.anggota(kode_qr, nama_lengkap, kelas, jurusan, nis, jenis_kelamin, jabatan, status, is_deleted, created_at, tampil_leaderboard)
  values (v_kode, v_nama, v_kelas, v_jurusan, v_nis, v_jk, 'Anggota', 'Aktif', false, now(), true)
  returning id into v_anggota_id;

  insert into public.barcode(kode_unik, qr_value, anggota_id)
  values (v_kode, 'NKKSMART|MEMBER|' || v_kode, v_anggota_id);

  update public.pendaftar set status = 'disetujui', anggota_id = v_anggota_id, diproses_oleh = auth.uid(), diproses_pada = now()
  where id = p_id;
  return jsonb_build_object('ok', true, 'anggota_id', v_anggota_id, 'kode', v_kode);
exception when others then
  return jsonb_build_object('ok', false, 'message', 'Persetujuan gagal. Data tidak diubah.');
end;
$$;
revoke all on function public.approve_pendaftaran(bigint, jsonb) from public, anon;
grant execute on function public.approve_pendaftaran(bigint, jsonb) to authenticated;

-- Admin-only rejection.
create or replace function public.reject_pendaftaran(p_id bigint, p_alasan text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_updated integer;
begin
  if not public.is_admin() then return jsonb_build_object('ok', false, 'message', 'Akses ditolak.'); end if;
  update public.pendaftar set status = 'ditolak', alasan_tolak = nullif(left(btrim(coalesce(p_alasan, '')), 500), ''), diproses_oleh = auth.uid(), diproses_pada = now()
  where id = p_id and status = 'pending';
  get diagnostics v_updated = row_count;
  if v_updated = 0 then return jsonb_build_object('ok', false, 'message', 'Pendaftar tidak ditemukan atau sudah diproses.'); end if;
  return jsonb_build_object('ok', true);
exception when others then
  return jsonb_build_object('ok', false, 'message', 'Penolakan gagal. Silakan coba lagi.');
end;
$$;
revoke all on function public.reject_pendaftaran(bigint, text) from public, anon;
grant execute on function public.reject_pendaftaran(bigint, text) to authenticated;


-- Semester report RPC used by the admin recap page.
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


-- A7: A privacy-limited public leaderboard. Only aggregated attendance fields leave this function.
create or replace function public.get_public_leaderboard(p_periode text default 'semester', p_limit integer default 10)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_start date;
  v_end date;
  v_period_label text;
  v_month_label text;
  v_enabled boolean;
  v_name_mode text;
  v_min_meetings integer;
  v_limit integer;
  v_result jsonb;
  v_next_meeting jsonb;
begin
  select coalesce((value #>> '{}')::boolean, true) into v_enabled from public.app_settings where key = 'leaderboard_enabled';
  if not coalesce(v_enabled, true) then return jsonb_build_object('enabled', false); end if;
  select coalesce(value #>> '{}', 'singkat') into v_name_mode from public.app_settings where key = 'leaderboard_nama_mode';
  select coalesce((value #>> '{}')::integer, 3) into v_min_meetings from public.app_settings where key = 'leaderboard_min_pertemuan';
  select coalesce((value #>> '{}')::integer, 10) into v_limit from public.app_settings where key = 'leaderboard_limit';
  v_min_meetings := coalesce(v_min_meetings, 3);
  v_limit := least(greatest(coalesce(p_limit, v_limit), 1), 50);

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
      count(cm.id)::integer as total,
      (count(ab.id) filter (where ab.status = 'hadir'))::integer as hadir
    from active_members m
    left join completed_meetings cm on true
    left join public.absensi ab on ab.anggota_id = m.id and ab.pertemuan_id = cm.id
    group by m.id, m.nama_lengkap, m.kelas_label
  ), rated as (
    select *, round(100.0 * hadir / nullif(total, 0))::integer as persen
    from member_stats where total >= v_min_meetings
  ), ranked as (
    select *, rank() over (order by persen desc, hadir desc) as posisi
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
      'nama_tampil', case when v_name_mode = 'penuh' then page.nama_lengkap when v_name_mode = 'inisial' then left(page.nama_lengkap, 1) || '.' else split_part(btrim(page.nama_lengkap), ' ', 1) || case when position(' ' in btrim(page.nama_lengkap)) > 0 then ' ' || left(split_part(btrim(page.nama_lengkap), ' ', 2), 1) || '.' else '' end end,
      'kelas_label', page.kelas_label, 'hadir', page.hadir, 'total', page.total, 'persen', page.persen
    ) order by page.persen desc, page.hadir desc, page.nama_lengkap)
      from (select * from ranked order by persen desc, hadir desc, nama_lengkap limit v_limit) page), '[]'::jsonb),
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

-- Public self-service lookup: exact full name only, with card fields and no NIS/contact data.
create index if not exists anggota_public_name_lookup_idx
  on public.anggota (lower(btrim(nama_lengkap)))
  where status = 'Aktif' and coalesce(is_deleted, false) = false;
create or replace function public.lookup_member_card(p_nama text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(card) order by card.kelas, card.jurusan, card.nama_lengkap), '[]'::jsonb)
  from (
    select
      a.nama_lengkap,
      a.kelas,
      a.jurusan,
      a.jabatan,
      coalesce(b.kode_unik, a.kode_qr) as kode_unik,
      coalesce(b.qr_value, 'NKKSMART|MEMBER|' || coalesce(b.kode_unik, a.kode_qr)) as qr_value
    from public.anggota a
    left join public.barcode b on b.anggota_id = a.id
    where char_length(btrim(coalesce(p_nama, ''))) between 3 and 120
      and lower(btrim(a.nama_lengkap)) = lower(btrim(p_nama))
      and a.status = 'Aktif'
      and coalesce(a.is_deleted, false) = false
      and coalesce(b.kode_unik, a.kode_qr) is not null
    order by a.kelas, a.jurusan, a.nama_lengkap
    limit 10
  ) card;
$$;
revoke all on function public.lookup_member_card(text) from public;
grant execute on function public.lookup_member_card(text) to anon, authenticated;



commit;

notify pgrst, 'reload schema';

-- Safe smoke check: does not write application rows.
select
  jsonb_typeof(public.rekap_semester(2026, 1)->'meetings') = 'array' as meetings_ok,
  jsonb_typeof(public.rekap_semester(2026, 1)->'members') = 'array' as members_ok,
  jsonb_typeof(public.get_public_leaderboard('semester', 10)) = 'object' as leaderboard_ok,
  jsonb_typeof(public.lookup_member_card('___nkk_setup_check___')) = 'array' as card_lookup_ok;
