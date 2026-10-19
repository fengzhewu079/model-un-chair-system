import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const sql = readFileSync('supabase/collaboration_mvp.sql', 'utf8');
function definition(name) {
  const start = sql.indexOf('create or replace function public.' + name + '(');
  assert.ok(start >= 0, name);
  return sql.slice(start, sql.indexOf('\n$$;', start) + 4);
}
const room = '00000000-0000-4000-8000-000000000001';
const member = '00000000-0000-4000-8000-000000000002';
const chair = '00000000-0000-4000-8000-000000000003';
const session = '00000000-0000-4000-8000-000000000004';
const chairSession = '00000000-0000-4000-8000-000000000005';
async function database() {
  const db = new PGlite();
  await db.exec("set timezone = 'UTC'");
  // pgcrypto helpers are replaced only in this isolated test database.
  // Presence, renewal, auth checks and table definitions below come from the real SQL.
  await db.exec(`
    create function public.generate_collaboration_uuid() returns uuid language sql as $$ select gen_random_uuid() $$;
    create function public.sha256_hex(v text) returns text language sql as $$ select encode(sha256(convert_to(v,'UTF8')),'hex') $$;
  `);
  await db.exec(sql.slice(sql.indexOf('create table if not exists public.meeting_rooms'), sql.indexOf('alter table public.meeting_rooms\n  alter column')));
  for (const name of ['get_heartbeat_interval_seconds','get_active_session_window_seconds',
    'is_room_session_active','reconcile_room_presence','get_room_members_snapshot',
    'get_room_active_motion_snapshot','get_collaboration_room_state']) {
    await db.exec(definition(name));
  }
  await db.exec(`
    insert into meeting_rooms(id,public_meeting_id,access_code_hash) values ('${room}','test-room','unused');
    insert into meeting_room_members(id,room_id,display_name,normalized_name,role,rejoin_token_hash) values
      ('${member}','${room}','Host','host','host',sha256_hex('host-token')),
      ('${chair}','${room}','Chair','chair','chair',sha256_hex('chair-token'));
    insert into meeting_room_sessions(id,room_id,member_id) values
      ('${session}','${room}','${member}'), ('${chairSession}','${room}','${chair}');
    insert into meeting_room_state(room_id, shared_payload, version, active_motion_id,active_motion_operator_member_id,active_motion_started_at)
      values ('${room}','{"name":"Committee"}',4,'motion','${chair}',now());
    create table member_writes(member_id uuid);
    create function count_member_write() returns trigger language plpgsql as $$
      begin insert into member_writes values (new.id); return new; end $$;
    create trigger count_writes after update on meeting_room_members for each row execute function count_member_write();
  `);
  return db;
}
test('unchanged presence reconciliation performs zero member writes', async () => {
  const db = await database();
  try {
    await db.query('select reconcile_room_presence($1)', [room]);
    await db.query('select reconcile_room_presence($1)', [room]);
    assert.equal((await db.query('select * from member_writes')).rows.length, 0);
    assert.equal((await db.query('select active_motion_id from meeting_room_state')).rows[0].active_motion_id, 'motion');
  } finally { await db.close(); }
});
test('expired chair is marked offline once and releases motion ownership', async () => {
  const db = await database();
  try {
    await db.query("update meeting_room_sessions set last_heartbeat_at = now() - interval '8 minutes' where id=$1",[chairSession]);
    await db.query('select reconcile_room_presence($1)', [room]);
    await db.query('select reconcile_room_presence($1)', [room]);
    assert.deepEqual((await db.query('select member_id from member_writes')).rows, [{member_id:chair}]);
    assert.equal((await db.query('select active_motion_id from meeting_room_state')).rows[0].active_motion_id, null);
    assert.equal((await db.query('select status from meeting_room_members where id=$1',[chair])).rows[0].status, 'offline');
  } finally { await db.close(); }
});
test('another active session keeps the same chair online', async () => {
  const db = await database();
  try {
    await db.query("update meeting_room_sessions set last_heartbeat_at = now() - interval '8 minutes' where id=$1",[chairSession]);
    await db.query('insert into meeting_room_sessions(room_id,member_id) values ($1,$2)',[room,chair]);
    await db.query('select reconcile_room_presence($1)', [room]);
    assert.equal((await db.query('select * from member_writes')).rows.length,0);
    assert.equal((await db.query('select active_motion_id from meeting_room_state')).rows[0].active_motion_id,'motion');
  } finally { await db.close(); }
});
test('state fetch alone renews presence and returns the shared state without touching other members', async () => {
  const db = await database();
  try {
    await db.query("update meeting_room_sessions set last_heartbeat_at = now() - interval '1 minute' where id=$1",[session]);
    const {rows:[snapshot]} = await db.query('select * from get_collaboration_room_state($1,$2,$3)',['test-room',session,'host-token']);
    assert.equal(snapshot.online_count,2);
    assert.equal(snapshot.heartbeat_interval_seconds,15);
    assert.equal(Number(snapshot.version),4);
    assert.equal(snapshot.shared_payload.name,'Committee');
    assert.deepEqual((await db.query('select member_id from member_writes')).rows,[{member_id:member}]);
    assert.equal((await db.query("select last_heartbeat_at > now() - interval '10 seconds' as renewed from meeting_room_sessions where id=$1",[session])).rows[0].renewed,true);
  } finally { await db.close(); }
});
test('expired valid session can reconnect; invalid credentials cannot renew it', async () => {
  const db = await database();
  try {
    await db.query("update meeting_room_sessions set last_heartbeat_at=now()-interval '8 minutes' where id=$1",[session]);
    await assert.rejects(db.query('select * from get_collaboration_room_state($1,$2,$3)',['test-room',session,'wrong-token']),/invalid or expired/);
    const {rows:[snapshot]} = await db.query('select * from get_collaboration_room_state($1,$2,$3)',['test-room',session,'host-token']);
    assert.equal(snapshot.online_count,2);
    assert.equal((await db.query('select status from meeting_room_sessions where id=$1',[session])).rows[0].status,'online');
  } finally { await db.close(); }
});
test('hotfix is idempotent, matches main SQL and leaves other rooms untouched', async () => {
  const db = await database();
  try {
    const hotfix = readFileSync('supabase/hotfix_presence_noop_writes.sql','utf8');
    assert.ok(hotfix.includes(definition('reconcile_room_presence')));
    await db.exec(hotfix);
    await db.exec(hotfix);
    const otherRoom = '00000000-0000-4000-8000-000000000006';
    await db.query("insert into meeting_rooms(id,public_meeting_id,access_code_hash) values ($1,'other','unused')",[otherRoom]);
    await db.query("insert into meeting_room_members(room_id,display_name,normalized_name,role,rejoin_token_hash) values ($1,'Other','other','host','other-token')",[otherRoom]);
    await db.query('select reconcile_room_presence($1)',[room]);
    assert.equal((await db.query('select * from member_writes')).rows.length,0);
    assert.equal((await db.query('select status from meeting_room_members where room_id=$1',[otherRoom])).rows[0].status,'online');
  } finally { await db.close(); }
});
