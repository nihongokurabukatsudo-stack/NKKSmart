-- Read-only diagnostic for Supabase SQL Editor.
-- It does not create, alter, or delete database objects or rows.
-- The frontend currently expects the legacy NKKSmart schema; compare both
-- schema families below before writing any migration.
with expected(family, table_name) as (
  values
    ('legacy_nkksmart', 'admins'),
    ('legacy_nkksmart', 'anggota'),
    ('legacy_nkksmart', 'barcode'),
    ('legacy_nkksmart', 'pertemuan'),
    ('legacy_nkksmart', 'absensi'),
    ('legacy_nkksmart', 'geofence_settings'),
    ('english_schema', 'members'),
    ('english_schema', 'meetings'),
    ('english_schema', 'attendance'),
    ('english_schema', 'finance'),
    ('english_schema', 'pending'),
    ('english_schema', 'profiles')
), present as (
  select e.family, e.table_name, (t.table_name is not null) as is_present
  from expected e
  left join information_schema.tables t
    on t.table_schema = 'public'
   and t.table_name = e.table_name
   and t.table_type = 'BASE TABLE'
), enum_values as (
  select n.nspname as schema_name, t.typname as enum_type, e.enumlabel, e.enumsortorder
  from pg_type t
  join pg_enum e on e.enumtypid = t.oid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
)
select jsonb_build_object(
  'database', current_database(),
  'sql_role', current_user,
  'legacy_nkksmart_tables_present', coalesce((
    select jsonb_agg(table_name order by table_name)
    from present where family = 'legacy_nkksmart' and is_present
  ), '[]'::jsonb),
  'legacy_nkksmart_tables_missing', coalesce((
    select jsonb_agg(table_name order by table_name)
    from present where family = 'legacy_nkksmart' and not is_present
  ), '[]'::jsonb),
  'english_schema_tables_present', coalesce((
    select jsonb_agg(table_name order by table_name)
    from present where family = 'english_schema' and is_present
  ), '[]'::jsonb),
  'english_schema_tables_missing', coalesce((
    select jsonb_agg(table_name order by table_name)
    from present where family = 'english_schema' and not is_present
  ), '[]'::jsonb),
  'columns', coalesce((
    select jsonb_agg(jsonb_build_object(
      'table', table_name,
      'column', column_name,
      'data_type', data_type,
      'udt_name', udt_name
    ) order by table_name, ordinal_position)
    from information_schema.columns
    where table_schema = 'public'
      and table_name in (select table_name from expected)
  ), '[]'::jsonb),
  'public_enum_values', coalesce((
    select jsonb_agg(jsonb_build_object(
      'enum_type', enum_type,
      'enum_label', enumlabel
    ) order by enum_type, enumsortorder)
    from enum_values
  ), '[]'::jsonb)
) as schema_diagnostic;
