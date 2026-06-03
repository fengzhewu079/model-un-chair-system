create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

do $$
begin
  if not exists (
    select 1
    from pg_extension
    where extname = 'pgcrypto'
  ) then
    raise exception 'pgcrypto extension must be installed for collaboration_mvp.sql';
  end if;
end;
$$;

drop function if exists public.get_collaboration_room_state(text, text);
drop function if exists public.apply_collaboration_state_update(text, uuid, text, bigint, jsonb);
drop function if exists public.create_collaboration_room(text, text, text, jsonb, text);
drop function if exists public.join_collaboration_room(text, text, text, text, text);
drop function if exists public.get_collaboration_room_state(text, uuid, text);
drop function if exists public.heartbeat_collaboration_member(uuid, uuid, text);
drop function if exists public.leave_collaboration_member(uuid, uuid, text, text);
drop function if exists public.apply_collaboration_state_update(text, uuid, uuid, text, bigint, jsonb);
drop function if exists public.get_collaboration_room_access_code(text, uuid, uuid, text);
drop function if exists public.set_collaboration_motion_processing(text, uuid, uuid, text, text);
drop function if exists public.finish_collaboration_motion(text, uuid, uuid, text, text, bigint, jsonb);

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'meeting_rooms_host_member_fk'
  ) then
    alter table public.meeting_rooms
      drop constraint meeting_rooms_host_member_fk;
  end if;
end;
$$;

create or replace function public.normalize_member_name(input_name text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(trim(coalesce(input_name, '')), '\s+', ' ', 'g'));
$$;

-- Keep pgcrypto access behind helpers so collaboration RPCs do not depend on
-- extension schema visibility under security-definer search_path rules.
create or replace function public.get_pgcrypto_schema()
returns text
language plpgsql
stable
as $$
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
    raise exception 'pgcrypto extension must be installed for collaboration_mvp.sql';
  end if;

  return pgcrypto_schema;
end;
$$;

create or replace function public.generate_collaboration_uuid()
returns uuid
language plpgsql
volatile
as $$
declare
  generated_uuid uuid;
begin
  execute format(
    'select %I.gen_random_uuid()',
    public.get_pgcrypto_schema()
  )
  into generated_uuid;

  return generated_uuid;
end;
$$;

create or replace function public.issue_collaboration_member_token()
returns text
language plpgsql
volatile
as $$
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
$$;

create or replace function public.hash_collaboration_access_code(input_text text)
returns text
language plpgsql
volatile
as $$
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
$$;

create or replace function public.verify_collaboration_access_code(
  input_text text,
  hashed_text text
)
returns boolean
language plpgsql
stable
as $$
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
$$;

create or replace function public.sha256_hex(input_text text)
returns text
language plpgsql
stable
as $$
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
$$;

create or replace function public.get_collaboration_access_code_secret()
returns text
language plpgsql
stable
as $$
declare
  configured_secret text;
begin
  configured_secret := nullif(current_setting('app.settings.collaboration_access_code_secret', true), '');

  if configured_secret is null then
    raise exception 'app.settings.collaboration_access_code_secret must be configured';
  end if;

  return configured_secret;
end;
$$;

create or replace function public.encrypt_collaboration_access_code(input_text text)
returns bytea
language plpgsql
stable
as $$
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
$$;

create or replace function public.decrypt_collaboration_access_code(ciphertext bytea)
returns text
language plpgsql
stable
as $$
declare
  decrypted_value text;
begin
  execute format(
    'select %I.pgp_sym_decrypt($1, $2)',
    public.get_pgcrypto_schema()
  )
  into decrypted_value
  using ciphertext, public.get_collaboration_access_code_secret();

  return decrypted_value;
end;
$$;

create table if not exists public.meeting_rooms (
  id uuid primary key default public.generate_collaboration_uuid(),
  public_meeting_id text not null unique,
  access_code_hash text not null,
  access_code_ciphertext bytea,
  status text not null default 'active' check (status in ('active', 'archived')),
  host_member_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_active_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.meeting_room_members (
  id uuid primary key default public.generate_collaboration_uuid(),
  room_id uuid not null references public.meeting_rooms(id) on delete cascade,
  display_name text not null,
  normalized_name text not null,
  role text not null check (role in ('host', 'chair')),
  status text not null default 'online' check (status in ('online', 'offline')),
  joined_at timestamptz not null default timezone('utc', now()),
  last_active_at timestamptz not null default timezone('utc', now()),
  left_at timestamptz,
  rejoin_token_hash text not null,
  last_session_id uuid
);

create unique index if not exists idx_room_members_unique_name
  on public.meeting_room_members (room_id, normalized_name);

create unique index if not exists idx_room_single_host
  on public.meeting_room_members (room_id)
  where role = 'host';

create unique index if not exists idx_room_members_rejoin_token_hash
  on public.meeting_room_members (rejoin_token_hash);

create unique index if not exists idx_room_members_room_id_id
  on public.meeting_room_members (room_id, id);

create table if not exists public.meeting_room_sessions (
  id uuid primary key default public.generate_collaboration_uuid(),
  room_id uuid not null,
  member_id uuid not null,
  client_instance_id text,
  status text not null default 'online' check (status in ('online', 'offline')),
  joined_at timestamptz not null default timezone('utc', now()),
  last_heartbeat_at timestamptz not null default timezone('utc', now()),
  disconnected_at timestamptz,
  disconnect_reason text,
  constraint meeting_room_sessions_member_fk
    foreign key (member_id) references public.meeting_room_members(id) on delete cascade,
  constraint meeting_room_sessions_room_fk
    foreign key (room_id) references public.meeting_rooms(id) on delete cascade,
  constraint meeting_room_sessions_room_member_fk
    foreign key (room_id, member_id)
    references public.meeting_room_members(room_id, id)
    on delete cascade
);

create index if not exists idx_room_sessions_room_id
  on public.meeting_room_sessions (room_id);

create index if not exists idx_room_sessions_member_id
  on public.meeting_room_sessions (member_id);

create index if not exists idx_room_sessions_last_heartbeat
  on public.meeting_room_sessions (last_heartbeat_at);

create table if not exists public.meeting_room_state (
  room_id uuid primary key references public.meeting_rooms(id) on delete cascade,
  shared_payload jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  updated_by_member_id uuid references public.meeting_room_members(id),
  active_motion_id text,
  active_motion_operator_member_id uuid references public.meeting_room_members(id) on delete set null,
  active_motion_started_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.meeting_rooms
  alter column id set default public.generate_collaboration_uuid();

alter table public.meeting_room_members
  alter column id set default public.generate_collaboration_uuid();

alter table public.meeting_room_sessions
  alter column id set default public.generate_collaboration_uuid();

alter table public.meeting_rooms
  add column if not exists access_code_ciphertext bytea;

alter table public.meeting_room_state
  add column if not exists active_motion_id text;

alter table public.meeting_room_state
  add column if not exists active_motion_operator_member_id uuid references public.meeting_room_members(id) on delete set null;

alter table public.meeting_room_state
  add column if not exists active_motion_started_at timestamptz;

alter table public.meeting_rooms
  add constraint meeting_rooms_host_member_fk
  foreign key (host_member_id)
  references public.meeting_room_members(id)
  on delete set null;

alter table public.meeting_room_members enable row level security;
alter table public.meeting_room_sessions enable row level security;
alter table public.meeting_room_state enable row level security;
alter table public.meeting_rooms enable row level security;

revoke all on public.meeting_rooms from anon;
revoke all on public.meeting_room_members from anon;
revoke all on public.meeting_room_sessions from anon;
revoke all on public.meeting_room_state from anon;

create or replace function public.validate_room_host_member()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  valid_host_exists boolean;
begin
  if new.host_member_id is null then
    return new;
  end if;

  select exists (
    select 1
    from public.meeting_room_members m
    where m.id = new.host_member_id
      and m.room_id = new.id
      and m.role = 'host'
  ) into valid_host_exists;

  if not valid_host_exists then
    raise exception 'host_member_id must reference the host member in the same room';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_room_host_member on public.meeting_rooms;
create trigger trg_validate_room_host_member
before insert or update on public.meeting_rooms
for each row
execute function public.validate_room_host_member();

create or replace function public.get_active_session_window_seconds()
returns integer
language sql
immutable
as $$
  select 45;
$$;

create or replace function public.get_heartbeat_interval_seconds()
returns integer
language sql
immutable
as $$
  select 15;
$$;

create or replace function public.is_room_session_active(last_seen timestamptz)
returns boolean
language sql
stable
as $$
  select coalesce(
    last_seen >= timezone('utc', now()) - make_interval(secs => public.get_active_session_window_seconds()),
    false
  );
$$;

create or replace function public.reconcile_room_presence(target_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.meeting_room_sessions
  set
    status = 'offline',
    disconnected_at = coalesce(disconnected_at, timezone('utc', now())),
    disconnect_reason = coalesce(disconnect_reason, 'heartbeat_timeout')
  where room_id = target_room_id
    and status = 'online'
    and not public.is_room_session_active(last_heartbeat_at);

  update public.meeting_room_members m
  set
    status = case
      when exists (
        select 1
        from public.meeting_room_sessions s
        where s.member_id = m.id
          and s.room_id = m.room_id
          and s.status = 'online'
          and public.is_room_session_active(s.last_heartbeat_at)
      ) then 'online'
      else 'offline'
    end,
    left_at = case
      when exists (
        select 1
        from public.meeting_room_sessions s
        where s.member_id = m.id
          and s.room_id = m.room_id
          and s.status = 'online'
          and public.is_room_session_active(s.last_heartbeat_at)
      ) then null
      else coalesce(m.left_at, timezone('utc', now()))
    end
  where m.room_id = target_room_id;

  update public.meeting_room_state st
  set
    active_motion_id = null,
    active_motion_operator_member_id = null,
    active_motion_started_at = null
  where st.room_id = target_room_id
    and st.active_motion_operator_member_id is not null
    and not exists (
      select 1
      from public.meeting_room_members m
      where m.id = st.active_motion_operator_member_id
        and m.room_id = target_room_id
        and m.status = 'online'
    );
end;
$$;

create or replace function public.get_room_members_snapshot(target_room_id uuid)
returns table (
  members jsonb,
  online_count integer
)
language sql
security definer
set search_path = public
as $$
  with member_rows as (
    select
      m.id,
      m.display_name,
      m.role,
      case
        when exists (
          select 1
          from public.meeting_room_sessions s
          where s.member_id = m.id
            and s.room_id = m.room_id
            and s.status = 'online'
            and public.is_room_session_active(s.last_heartbeat_at)
        ) then 'online'
        else 'offline'
      end as derived_status,
      m.last_active_at,
      m.joined_at
    from public.meeting_room_members m
    where m.room_id = target_room_id
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'memberId', id,
          'name', display_name,
          'role', role,
          'status', derived_status,
          'lastActiveAt', last_active_at
        )
        order by joined_at asc
      ),
      '[]'::jsonb
    ) as members,
    coalesce(count(*) filter (where derived_status = 'online'), 0)::integer as online_count
  from member_rows;
$$;

create or replace function public.get_room_active_motion_snapshot(target_room_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select
    case
      when st.active_motion_id is null
        or st.active_motion_operator_member_id is null
        or m.id is null then null
      else jsonb_build_object(
        'motionId', st.active_motion_id,
        'operatorMemberId', st.active_motion_operator_member_id,
        'operatorName', m.display_name,
        'operatorRole', m.role,
        'startedAt', st.active_motion_started_at
      )
    end
  from public.meeting_room_state st
  left join public.meeting_room_members m
    on m.id = st.active_motion_operator_member_id
  where st.room_id = target_room_id;
$$;

create or replace function public.assert_active_member_session(
  requested_member_id uuid,
  requested_session_id uuid,
  supplied_member_token text
)
returns table (
  room_id uuid,
  member_id uuid,
  role text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_row record;
begin
  select
    m.room_id,
    m.id as member_id,
    m.role
  into matched_row
  from public.meeting_room_members m
  join public.meeting_room_sessions s
    on s.member_id = m.id
   and s.room_id = m.room_id
  where m.id = requested_member_id
    and m.rejoin_token_hash = public.sha256_hex(supplied_member_token)
    and s.id = requested_session_id
    and s.status = 'online'
    and public.is_room_session_active(s.last_heartbeat_at);

  if not found then
    raise exception 'member session is invalid or expired';
  end if;

  return query
  select matched_row.room_id, matched_row.member_id, matched_row.role;
end;
$$;

create or replace function public.create_collaboration_room(
  requested_public_meeting_id text,
  requested_access_code text,
  requested_host_name text,
  initial_shared_payload jsonb default '{}'::jsonb,
  requested_client_instance_id text default null
)
returns table (
  room_id uuid,
  public_meeting_id text,
  member_id uuid,
  role text,
  member_token text,
  session_id uuid,
  shared_payload jsonb,
  version bigint,
  members jsonb,
  online_count integer,
  active_motion jsonb,
  heartbeat_interval_seconds integer,
  session_timeout_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_room_id uuid;
  new_member_id uuid;
  new_session_id uuid;
  issued_member_token text;
  room_members jsonb;
  room_online_count integer;
  room_active_motion jsonb;
begin
  if trim(coalesce(requested_public_meeting_id, '')) = '' then
    raise exception 'public_meeting_id is required';
  end if;

  if trim(coalesce(requested_access_code, '')) = '' then
    raise exception 'access_code is required';
  end if;

  if trim(coalesce(requested_host_name, '')) = '' then
    raise exception 'host_name is required';
  end if;

  issued_member_token := public.issue_collaboration_member_token();

  insert into public.meeting_rooms (
    public_meeting_id,
    access_code_hash,
    access_code_ciphertext
  ) values (
    trim(requested_public_meeting_id),
    public.hash_collaboration_access_code(requested_access_code),
    public.encrypt_collaboration_access_code(requested_access_code)
  )
  returning id into new_room_id;

  insert into public.meeting_room_members (
    room_id,
    display_name,
    normalized_name,
    role,
    status,
    rejoin_token_hash
  ) values (
    new_room_id,
    trim(requested_host_name),
    public.normalize_member_name(requested_host_name),
    'host',
    'online',
    public.sha256_hex(issued_member_token)
  )
  returning id into new_member_id;

  insert into public.meeting_room_sessions (
    room_id,
    member_id,
    client_instance_id,
    status
  ) values (
    new_room_id,
    new_member_id,
    requested_client_instance_id,
    'online'
  )
  returning id into new_session_id;

  insert into public.meeting_room_state (
    room_id,
    shared_payload,
    version,
    updated_by_member_id
  ) values (
    new_room_id,
    coalesce(initial_shared_payload, '{}'::jsonb),
    1,
    new_member_id
  );

  update public.meeting_room_members
  set last_session_id = new_session_id
  where id = new_member_id;

  update public.meeting_rooms
  set
    host_member_id = new_member_id,
    updated_at = timezone('utc', now()),
    last_active_at = timezone('utc', now())
  where id = new_room_id;

  perform public.reconcile_room_presence(new_room_id);

  select room_snapshot.members, room_snapshot.online_count
  into room_members, room_online_count
  from public.get_room_members_snapshot(new_room_id) as room_snapshot;

  select public.get_room_active_motion_snapshot(new_room_id)
  into room_active_motion;

  return query
  select
    new_room_id,
    trim(requested_public_meeting_id),
    new_member_id,
    'host'::text,
    issued_member_token,
    new_session_id,
    coalesce(initial_shared_payload, '{}'::jsonb),
    1::bigint,
    room_members,
    room_online_count,
    room_active_motion,
    public.get_heartbeat_interval_seconds(),
    public.get_active_session_window_seconds();
end;
$$;

create or replace function public.join_collaboration_room(
  requested_public_meeting_id text,
  requested_access_code text,
  requested_display_name text,
  requested_client_instance_id text default null,
  supplied_member_token text default null
)
returns table (
  room_id uuid,
  public_meeting_id text,
  member_id uuid,
  role text,
  member_token text,
  session_id uuid,
  shared_payload jsonb,
  version bigint,
  members jsonb,
  online_count integer,
  active_motion jsonb,
  heartbeat_interval_seconds integer,
  session_timeout_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_room public.meeting_rooms%rowtype;
  target_member public.meeting_room_members%rowtype;
  target_state public.meeting_room_state%rowtype;
  new_session_id uuid;
  issued_member_token text;
  normalized_requested_name text;
  token_member_found boolean := false;
  name_member_found boolean := false;
  room_members jsonb;
  room_online_count integer;
  room_active_motion jsonb;
begin
  if trim(coalesce(requested_public_meeting_id, '')) = '' then
    raise exception 'public_meeting_id is required';
  end if;

  if trim(coalesce(requested_access_code, '')) = '' then
    raise exception 'access_code is required';
  end if;

  if trim(coalesce(requested_display_name, '')) = '' then
    raise exception 'display_name is required';
  end if;

  normalized_requested_name := public.normalize_member_name(requested_display_name);

  select *
  into target_room
  from public.meeting_rooms
  where meeting_rooms.public_meeting_id = trim(requested_public_meeting_id)
    and public.verify_collaboration_access_code(
      requested_access_code,
      meeting_rooms.access_code_hash
    )
    and meeting_rooms.status = 'active';

  if not found then
    raise exception 'room not found or access code is invalid';
  end if;

  if target_room.access_code_ciphertext is null
    and nullif(current_setting('app.settings.collaboration_access_code_secret', true), '') is not null then
    update public.meeting_rooms
    set access_code_ciphertext = public.encrypt_collaboration_access_code(requested_access_code)
    where id = target_room.id
      and access_code_ciphertext is null;
  end if;

  perform public.reconcile_room_presence(target_room.id);

  if trim(coalesce(supplied_member_token, '')) <> '' then
    select *
    into target_member
    from public.meeting_room_members
    where meeting_room_members.room_id = target_room.id
      and meeting_room_members.rejoin_token_hash = public.sha256_hex(supplied_member_token);

    token_member_found := found;
  end if;

  if token_member_found then
    if exists (
      select 1
      from public.meeting_room_members m
      where m.room_id = target_room.id
        and m.normalized_name = normalized_requested_name
        and m.id <> target_member.id
    ) then
      raise exception 'display name is already in use by another member';
    end if;

    issued_member_token := supplied_member_token;

    update public.meeting_room_members
    set
      display_name = trim(requested_display_name),
      normalized_name = normalized_requested_name,
      status = 'online',
      left_at = null,
      last_active_at = timezone('utc', now())
    where id = target_member.id
    returning * into target_member;
  else
    select *
    into target_member
    from public.meeting_room_members
    where meeting_room_members.room_id = target_room.id
      and meeting_room_members.normalized_name = normalized_requested_name;

    name_member_found := found;

    if name_member_found then
      if target_member.status = 'online' then
        raise exception 'display name is already in use by an online member';
      end if;

      raise exception 'display name already exists; use the original member token to rejoin';
    end if;

    issued_member_token := public.issue_collaboration_member_token();

    insert into public.meeting_room_members (
      room_id,
      display_name,
      normalized_name,
      role,
      status,
      rejoin_token_hash
    ) values (
      target_room.id,
      trim(requested_display_name),
      normalized_requested_name,
      'chair',
      'online',
      public.sha256_hex(issued_member_token)
    )
    returning * into target_member;
  end if;

  insert into public.meeting_room_sessions (
    room_id,
    member_id,
    client_instance_id,
    status
  ) values (
    target_room.id,
    target_member.id,
    requested_client_instance_id,
    'online'
  )
  returning id into new_session_id;

  update public.meeting_room_members
  set
    last_session_id = new_session_id,
    status = 'online',
    last_active_at = timezone('utc', now()),
    left_at = null
  where id = target_member.id;

  update public.meeting_rooms
  set
    updated_at = timezone('utc', now()),
    last_active_at = timezone('utc', now())
  where id = target_room.id;

  select *
  into target_state
  from public.meeting_room_state
  where meeting_room_state.room_id = target_room.id;

  select room_snapshot.members, room_snapshot.online_count
  into room_members, room_online_count
  from public.get_room_members_snapshot(target_room.id) as room_snapshot;

  select public.get_room_active_motion_snapshot(target_room.id)
  into room_active_motion;

  return query
  select
    target_room.id,
    target_room.public_meeting_id,
    target_member.id,
    target_member.role,
    issued_member_token,
    new_session_id,
    target_state.shared_payload,
    target_state.version,
    room_members,
    room_online_count,
    room_active_motion,
    public.get_heartbeat_interval_seconds(),
    public.get_active_session_window_seconds();
end;
$$;

create or replace function public.get_collaboration_room_state(
  requested_public_meeting_id text,
  requested_session_id uuid,
  supplied_member_token text
)
returns table (
  room_id uuid,
  public_meeting_id text,
  member_id uuid,
  role text,
  session_id uuid,
  shared_payload jsonb,
  version bigint,
  members jsonb,
  online_count integer,
  active_motion jsonb,
  heartbeat_interval_seconds integer,
  session_timeout_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  validated_session record;
  target_room public.meeting_rooms%rowtype;
  target_state public.meeting_room_state%rowtype;
  room_members jsonb;
  room_online_count integer;
  room_active_motion jsonb;
begin
  select *
  into target_room
  from public.meeting_rooms
  where meeting_rooms.public_meeting_id = trim(requested_public_meeting_id)
    and meeting_rooms.status = 'active';

  if not found then
    raise exception 'room not found';
  end if;

  perform public.reconcile_room_presence(target_room.id);

  select *
  into validated_session
  from public.assert_active_member_session(
    (
      select m.id
      from public.meeting_room_members m
      join public.meeting_room_sessions s
        on s.member_id = m.id
       and s.room_id = m.room_id
      where m.room_id = target_room.id
        and s.id = requested_session_id
        and m.rejoin_token_hash = public.sha256_hex(supplied_member_token)
      limit 1
    ),
    requested_session_id,
    supplied_member_token
  );

  select *
  into target_state
  from public.meeting_room_state
  where meeting_room_state.room_id = target_room.id;

  select room_snapshot.members, room_snapshot.online_count
  into room_members, room_online_count
  from public.get_room_members_snapshot(target_room.id) as room_snapshot;

  select public.get_room_active_motion_snapshot(target_room.id)
  into room_active_motion;

  return query
  select
    target_room.id,
    target_room.public_meeting_id,
    validated_session.member_id,
    validated_session.role,
    requested_session_id,
    target_state.shared_payload,
    target_state.version,
    room_members,
    room_online_count,
    room_active_motion,
    public.get_heartbeat_interval_seconds(),
    public.get_active_session_window_seconds();
end;
$$;

create or replace function public.get_collaboration_room_access_code(
  requested_public_meeting_id text,
  requested_member_id uuid,
  requested_session_id uuid,
  supplied_member_token text
)
returns table (
  room_id uuid,
  public_meeting_id text,
  access_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_room public.meeting_rooms%rowtype;
  validated_session record;
begin
  select *
  into target_room
  from public.meeting_rooms
  where meeting_rooms.public_meeting_id = trim(requested_public_meeting_id)
    and meeting_rooms.status = 'active';

  if not found then
    raise exception 'room not found';
  end if;

  perform public.reconcile_room_presence(target_room.id);

  select *
  into validated_session
  from public.assert_active_member_session(
    requested_member_id,
    requested_session_id,
    supplied_member_token
  );

  if validated_session.room_id <> target_room.id then
    raise exception 'member does not belong to requested room';
  end if;

  if validated_session.role <> 'host' then
    raise exception 'only host can reveal the access code';
  end if;

  if target_room.access_code_ciphertext is null then
    raise exception 'access code reveal is unavailable for this legacy room until someone rejoins with the code once';
  end if;

  update public.meeting_room_sessions as room_sessions
  set last_heartbeat_at = timezone('utc', now())
  where room_sessions.id = requested_session_id
    and room_sessions.member_id = requested_member_id
    and room_sessions.room_id = target_room.id;

  update public.meeting_room_members
  set
    status = 'online',
    last_active_at = timezone('utc', now()),
    left_at = null
  where id = requested_member_id;

  update public.meeting_rooms
  set last_active_at = timezone('utc', now())
  where id = target_room.id;

  return query
  select
    target_room.id,
    target_room.public_meeting_id,
    public.decrypt_collaboration_access_code(target_room.access_code_ciphertext);
end;
$$;

create or replace function public.heartbeat_collaboration_member(
  requested_member_id uuid,
  requested_session_id uuid,
  supplied_member_token text
)
returns table (
  members jsonb,
  online_count integer,
  active_motion jsonb,
  heartbeat_interval_seconds integer,
  session_timeout_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  validated_session record;
  room_members jsonb;
  room_online_count integer;
  room_active_motion jsonb;
begin
  select *
  into validated_session
  from public.assert_active_member_session(
    requested_member_id,
    requested_session_id,
    supplied_member_token
  );

  update public.meeting_room_sessions
  set
    last_heartbeat_at = timezone('utc', now()),
    disconnected_at = null,
    disconnect_reason = null
  where id = requested_session_id
    and member_id = requested_member_id
    and room_id = validated_session.room_id;

  update public.meeting_room_members
  set
    status = 'online',
    last_active_at = timezone('utc', now()),
    left_at = null
  where id = requested_member_id;

  update public.meeting_rooms
  set last_active_at = timezone('utc', now())
  where id = validated_session.room_id;

  perform public.reconcile_room_presence(validated_session.room_id);

  select room_snapshot.members, room_snapshot.online_count
  into room_members, room_online_count
  from public.get_room_members_snapshot(validated_session.room_id) as room_snapshot;

  select public.get_room_active_motion_snapshot(validated_session.room_id)
  into room_active_motion;

  return query
  select
    room_members,
    room_online_count,
    room_active_motion,
    public.get_heartbeat_interval_seconds(),
    public.get_active_session_window_seconds();
end;
$$;

create or replace function public.set_collaboration_motion_processing(
  requested_public_meeting_id text,
  requested_member_id uuid,
  requested_session_id uuid,
  supplied_member_token text,
  requested_motion_id text default null
)
returns table (
  room_id uuid,
  active_motion jsonb,
  members jsonb,
  online_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_room public.meeting_rooms%rowtype;
  validated_session record;
  normalized_motion_id text;
  room_members jsonb;
  room_online_count integer;
  room_active_motion jsonb;
begin
  select *
  into target_room
  from public.meeting_rooms
  where meeting_rooms.public_meeting_id = trim(requested_public_meeting_id)
    and meeting_rooms.status = 'active';

  if not found then
    raise exception 'room not found';
  end if;

  perform public.reconcile_room_presence(target_room.id);

  select *
  into validated_session
  from public.assert_active_member_session(
    requested_member_id,
    requested_session_id,
    supplied_member_token
  );

  if validated_session.room_id <> target_room.id then
    raise exception 'member does not belong to requested room';
  end if;

  normalized_motion_id := nullif(trim(coalesce(requested_motion_id, '')), '');

  if normalized_motion_id is null then
    update public.meeting_room_state as room_state
    set
      active_motion_id = null,
      active_motion_operator_member_id = null,
      active_motion_started_at = null
    where room_state.room_id = target_room.id
      and (
        room_state.active_motion_operator_member_id is null
        or room_state.active_motion_operator_member_id = requested_member_id
      );

    if not found
      and exists (
        select 1
        from public.meeting_room_state
        where meeting_room_state.room_id = target_room.id
          and meeting_room_state.active_motion_operator_member_id is not null
      ) then
      raise exception 'another member is currently processing a motion';
    end if;
  else
    if exists (
      select 1
      from public.meeting_room_state
      where meeting_room_state.room_id = target_room.id
        and meeting_room_state.active_motion_operator_member_id is not null
        and meeting_room_state.active_motion_operator_member_id <> requested_member_id
    ) then
      raise exception 'another member is currently processing a motion';
    end if;

    update public.meeting_room_state as room_state
    set
      active_motion_id = normalized_motion_id,
      active_motion_operator_member_id = requested_member_id,
      active_motion_started_at = timezone('utc', now())
    where room_state.room_id = target_room.id;
  end if;

  update public.meeting_room_sessions as room_sessions
  set last_heartbeat_at = timezone('utc', now())
  where room_sessions.id = requested_session_id
    and room_sessions.member_id = requested_member_id
    and room_sessions.room_id = target_room.id;

  update public.meeting_room_members
  set
    status = 'online',
    last_active_at = timezone('utc', now()),
    left_at = null
  where id = requested_member_id;

  update public.meeting_rooms
  set last_active_at = timezone('utc', now())
  where id = target_room.id;

  perform public.reconcile_room_presence(target_room.id);

  select room_snapshot.members, room_snapshot.online_count
  into room_members, room_online_count
  from public.get_room_members_snapshot(target_room.id) as room_snapshot;

  select public.get_room_active_motion_snapshot(target_room.id)
  into room_active_motion;

  return query
  select
    target_room.id,
    room_active_motion,
    room_members,
    room_online_count;
end;
$$;

create or replace function public.leave_collaboration_member(
  requested_member_id uuid,
  requested_session_id uuid,
  supplied_member_token text,
  requested_disconnect_reason text default 'manual_leave'
)
returns table (
  members jsonb,
  online_count integer,
  active_motion jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  validated_session record;
  room_members jsonb;
  room_online_count integer;
  room_active_motion jsonb;
begin
  if length(coalesce(requested_disconnect_reason, '')) > 128 then
    raise exception 'disconnect_reason too long';
  end if;

  select *
  into validated_session
  from public.assert_active_member_session(
    requested_member_id,
    requested_session_id,
    supplied_member_token
  );

  update public.meeting_room_sessions
  set
    status = 'offline',
    disconnected_at = timezone('utc', now()),
    disconnect_reason = requested_disconnect_reason
  where id = requested_session_id
    and member_id = requested_member_id
    and room_id = validated_session.room_id;

  perform public.reconcile_room_presence(validated_session.room_id);

  select room_snapshot.members, room_snapshot.online_count
  into room_members, room_online_count
  from public.get_room_members_snapshot(validated_session.room_id) as room_snapshot;

  select public.get_room_active_motion_snapshot(validated_session.room_id)
  into room_active_motion;

  return query
  select room_members, room_online_count, room_active_motion;
end;
$$;

create or replace function public.apply_collaboration_state_update(
  requested_public_meeting_id text,
  requested_member_id uuid,
  requested_session_id uuid,
  supplied_member_token text,
  base_version bigint,
  next_shared_payload jsonb
)
returns table (
  room_id uuid,
  version bigint,
  updated_at timestamptz,
  members jsonb,
  online_count integer,
  active_motion jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_room public.meeting_rooms%rowtype;
  target_state public.meeting_room_state%rowtype;
  validated_session record;
  room_members jsonb;
  room_online_count integer;
  room_active_motion jsonb;
begin
  if next_shared_payload is null then
    raise exception 'next_shared_payload is required';
  end if;

  if jsonb_typeof(next_shared_payload) <> 'object' then
    raise exception 'next_shared_payload must be a json object';
  end if;

  select *
  into target_room
  from public.meeting_rooms
  where meeting_rooms.public_meeting_id = trim(requested_public_meeting_id)
    and meeting_rooms.status = 'active';

  if not found then
    raise exception 'room not found';
  end if;

  perform public.reconcile_room_presence(target_room.id);

  select *
  into validated_session
  from public.assert_active_member_session(
    requested_member_id,
    requested_session_id,
    supplied_member_token
  );

  if validated_session.room_id <> target_room.id then
    raise exception 'member does not belong to requested room';
  end if;

  select *
  into target_state
  from public.meeting_room_state
  where meeting_room_state.room_id = target_room.id;

  if not found then
    raise exception 'room state not found';
  end if;

  if target_state.active_motion_id is not null
    or target_state.active_motion_operator_member_id is not null then
    raise exception 'shared state updates are blocked while a motion is being processed; use finish_collaboration_motion';
  end if;

  update public.meeting_room_state as room_state
  set
    shared_payload = next_shared_payload,
    version = room_state.version + 1,
    updated_by_member_id = requested_member_id,
    updated_at = timezone('utc', now())
  where room_state.room_id = target_room.id
    and room_state.version = base_version;

  if not found then
    raise exception 'state version conflict';
  end if;

  update public.meeting_room_sessions as room_sessions
  set last_heartbeat_at = timezone('utc', now())
  where room_sessions.id = requested_session_id
    and room_sessions.member_id = requested_member_id
    and room_sessions.room_id = target_room.id;

  update public.meeting_rooms
  set
    updated_at = timezone('utc', now()),
    last_active_at = timezone('utc', now())
  where id = target_room.id;

  update public.meeting_room_members
  set
    status = 'online',
    last_active_at = timezone('utc', now()),
    left_at = null
  where id = requested_member_id;

  perform public.reconcile_room_presence(target_room.id);

  select room_snapshot.members, room_snapshot.online_count
  into room_members, room_online_count
  from public.get_room_members_snapshot(target_room.id) as room_snapshot;

  select public.get_room_active_motion_snapshot(target_room.id)
  into room_active_motion;

  return query
  select
    state_snapshot.room_id,
    state_snapshot.version,
    state_snapshot.updated_at,
    room_members,
    room_online_count,
    room_active_motion
  from public.meeting_room_state as state_snapshot
  where state_snapshot.room_id = target_room.id;
end;
$$;

create or replace function public.finish_collaboration_motion(
  requested_public_meeting_id text,
  requested_member_id uuid,
  requested_session_id uuid,
  supplied_member_token text,
  requested_motion_id text,
  base_version bigint,
  next_shared_payload jsonb
)
returns table (
  room_id uuid,
  version bigint,
  shared_payload jsonb,
  updated_at timestamptz,
  members jsonb,
  online_count integer,
  active_motion jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_room public.meeting_rooms%rowtype;
  target_state public.meeting_room_state%rowtype;
  validated_session record;
  normalized_motion_id text;
  room_members jsonb;
  room_online_count integer;
  room_active_motion jsonb;
begin
  normalized_motion_id := nullif(trim(coalesce(requested_motion_id, '')), '');

  if normalized_motion_id is null then
    raise exception 'motion_id is required';
  end if;

  if next_shared_payload is null then
    raise exception 'next_shared_payload is required';
  end if;

  if jsonb_typeof(next_shared_payload) <> 'object' then
    raise exception 'next_shared_payload must be a json object';
  end if;

  select *
  into target_room
  from public.meeting_rooms
  where meeting_rooms.public_meeting_id = trim(requested_public_meeting_id)
    and meeting_rooms.status = 'active';

  if not found then
    raise exception 'room not found';
  end if;

  perform public.reconcile_room_presence(target_room.id);

  select *
  into validated_session
  from public.assert_active_member_session(
    requested_member_id,
    requested_session_id,
    supplied_member_token
  );

  if validated_session.room_id <> target_room.id then
    raise exception 'member does not belong to requested room';
  end if;

  select *
  into target_state
  from public.meeting_room_state
  where meeting_room_state.room_id = target_room.id;

  if target_state.version <> base_version then
    raise exception 'state version conflict';
  end if;

  if target_state.active_motion_id is null
    or target_state.active_motion_operator_member_id is null then
    raise exception 'no motion is currently being processed';
  end if;

  if target_state.active_motion_operator_member_id <> requested_member_id then
    raise exception 'another member is currently processing this motion';
  end if;

  if target_state.active_motion_id <> normalized_motion_id then
    raise exception 'requested motion is not the active motion';
  end if;

  update public.meeting_room_state as room_state
  set
    shared_payload = next_shared_payload,
    version = room_state.version + 1,
    updated_by_member_id = requested_member_id,
    updated_at = timezone('utc', now()),
    active_motion_id = null,
    active_motion_operator_member_id = null,
    active_motion_started_at = null
  where room_state.room_id = target_room.id
    and room_state.version = base_version
    and room_state.active_motion_id = normalized_motion_id
    and room_state.active_motion_operator_member_id = requested_member_id;

  if not found then
    raise exception 'motion finish conflict; refresh room state and retry';
  end if;

  update public.meeting_room_sessions as room_sessions
  set last_heartbeat_at = timezone('utc', now())
  where room_sessions.id = requested_session_id
    and room_sessions.member_id = requested_member_id
    and room_sessions.room_id = target_room.id;

  update public.meeting_rooms
  set
    updated_at = timezone('utc', now()),
    last_active_at = timezone('utc', now())
  where id = target_room.id;

  update public.meeting_room_members
  set
    status = 'online',
    last_active_at = timezone('utc', now()),
    left_at = null
  where id = requested_member_id;

  perform public.reconcile_room_presence(target_room.id);

  select room_snapshot.members, room_snapshot.online_count
  into room_members, room_online_count
  from public.get_room_members_snapshot(target_room.id) as room_snapshot;

  select public.get_room_active_motion_snapshot(target_room.id)
  into room_active_motion;

  return query
  select
    state_snapshot.room_id,
    state_snapshot.version,
    state_snapshot.shared_payload,
    state_snapshot.updated_at,
    room_members,
    room_online_count,
    room_active_motion
  from public.meeting_room_state as state_snapshot
  where state_snapshot.room_id = target_room.id;
end;
$$;

revoke execute on function public.validate_room_host_member() from public;
revoke execute on function public.get_active_session_window_seconds() from public;
revoke execute on function public.get_heartbeat_interval_seconds() from public;
revoke execute on function public.is_room_session_active(timestamptz) from public;
revoke execute on function public.normalize_member_name(text) from public;
revoke execute on function public.get_pgcrypto_schema() from public;
revoke execute on function public.generate_collaboration_uuid() from public;
revoke execute on function public.issue_collaboration_member_token() from public;
revoke execute on function public.hash_collaboration_access_code(text) from public;
revoke execute on function public.verify_collaboration_access_code(text, text) from public;
revoke execute on function public.sha256_hex(text) from public;
revoke execute on function public.get_collaboration_access_code_secret() from public;
revoke execute on function public.encrypt_collaboration_access_code(text) from public;
revoke execute on function public.decrypt_collaboration_access_code(bytea) from public;
revoke execute on function public.reconcile_room_presence(uuid) from public;
revoke execute on function public.get_room_members_snapshot(uuid) from public;
revoke execute on function public.get_room_active_motion_snapshot(uuid) from public;
revoke execute on function public.assert_active_member_session(uuid, uuid, text) from public;
revoke execute on function public.create_collaboration_room(text, text, text, jsonb, text) from public;
revoke execute on function public.join_collaboration_room(text, text, text, text, text) from public;
revoke execute on function public.get_collaboration_room_state(text, uuid, text) from public;
revoke execute on function public.get_collaboration_room_access_code(text, uuid, uuid, text) from public;
revoke execute on function public.heartbeat_collaboration_member(uuid, uuid, text) from public;
revoke execute on function public.set_collaboration_motion_processing(text, uuid, uuid, text, text) from public;
revoke execute on function public.leave_collaboration_member(uuid, uuid, text, text) from public;
revoke execute on function public.apply_collaboration_state_update(text, uuid, uuid, text, bigint, jsonb) from public;
revoke execute on function public.finish_collaboration_motion(text, uuid, uuid, text, text, bigint, jsonb) from public;

grant execute on function public.create_collaboration_room(text, text, text, jsonb, text) to anon;
grant execute on function public.join_collaboration_room(text, text, text, text, text) to anon;
grant execute on function public.get_collaboration_room_state(text, uuid, text) to anon;
grant execute on function public.get_collaboration_room_access_code(text, uuid, uuid, text) to anon;
grant execute on function public.heartbeat_collaboration_member(uuid, uuid, text) to anon;
grant execute on function public.set_collaboration_motion_processing(text, uuid, uuid, text, text) to anon;
grant execute on function public.leave_collaboration_member(uuid, uuid, text, text) to anon;
grant execute on function public.apply_collaboration_state_update(text, uuid, uuid, text, bigint, jsonb) to anon;
grant execute on function public.finish_collaboration_motion(text, uuid, uuid, text, text, bigint, jsonb) to anon;

notify pgrst, 'reload schema';
