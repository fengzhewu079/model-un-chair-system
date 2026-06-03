create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create or replace function public.get_pgcrypto_schema()
returns text
language plpgsql
stable
as $func$
declare
  pgcrypto_schema text;
begin
  select n.nspname
  into pgcrypto_schema
  from pg_extension e
  join pg_namespace n
    on n.oid = e.extnamespace
  where e.extname = 'pgcrypto';

  if pgcrypto_schema is null then
    raise exception 'pgcrypto extension must be installed for collaboration';
  end if;

  return pgcrypto_schema;
end;
$func$;

create or replace function public.issue_collaboration_member_token()
returns text
language plpgsql
volatile
as $func$
declare
  issued_token text;
begin
  execute format(
    'select encode(%I.gen_random_bytes(24), ''hex'')',
    public.get_pgcrypto_schema()
  )
  into issued_token;

  return issued_token;
end;
$func$;

create or replace function public.hash_collaboration_access_code(input_text text)
returns text
language plpgsql
volatile
as $func$
declare
  hashed_text text;
  pgcrypto_schema text;
begin
  pgcrypto_schema := public.get_pgcrypto_schema();

  execute format(
    'select %1$I.crypt($1, %1$I.gen_salt(''bf''))',
    pgcrypto_schema
  )
  into hashed_text
  using coalesce(input_text, '');

  return hashed_text;
end;
$func$;

create or replace function public.verify_collaboration_access_code(
  input_text text,
  hashed_text text
)
returns boolean
language plpgsql
stable
as $func$
declare
  is_valid boolean;
begin
  execute format(
    'select coalesce($2 = %1$I.crypt($1, $2), false)',
    public.get_pgcrypto_schema()
  )
  into is_valid
  using coalesce(input_text, ''), hashed_text;

  return is_valid;
end;
$func$;

create or replace function public.sha256_hex(input_text text)
returns text
language plpgsql
stable
as $func$
declare
  hashed_text text;
begin
  execute format(
    'select encode(%I.digest($1, ''sha256''), ''hex'')',
    public.get_pgcrypto_schema()
  )
  into hashed_text
  using coalesce(input_text, '');

  return hashed_text;
end;
$func$;

create or replace function public.get_collaboration_access_code_secret()
returns text
language plpgsql
stable
as $func$
declare
  configured_secret text;
begin
  configured_secret := nullif(current_setting('app.settings.collaboration_access_code_secret', true), '');

  if configured_secret is null then
    raise exception 'app.settings.collaboration_access_code_secret must be configured';
  end if;

  return configured_secret;
end;
$func$;

create or replace function public.encrypt_collaboration_access_code(input_text text)
returns bytea
language plpgsql
stable
as $func$
declare
  encrypted_value bytea;
begin
  execute format(
    'select %I.pgp_sym_encrypt($1, $2, $3)',
    public.get_pgcrypto_schema()
  )
  into encrypted_value
  using
    coalesce(input_text, ''),
    public.get_collaboration_access_code_secret(),
    'cipher-algo=aes256';

  return encrypted_value;
end;
$func$;

notify pgrst, 'reload schema';
