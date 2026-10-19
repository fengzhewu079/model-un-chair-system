import test from 'node:test';
import assert from 'node:assert/strict';
import { useMeetingStore as store } from '../../src/store/useMeetingStore';

const memory = new Map();
(globalThis as any).window = {localStorage: {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => memory.set(k, v),
  removeItem: (k: string) => memory.delete(k),
}};
const base = store.getState();
let calls: string[] = [];
const response = () => ({
  room_id: 'room', public_meeting_id: 'test-room', member_id: 'member',
  session_id: 'session', role: 'host', version: 2,
  shared_payload: {...base, rollCall: {...base.rollCall, completed: true}},
  members: [], online_count: 2, active_motion: null,
  heartbeat_interval_seconds: 15, session_timeout_seconds: 420,
});
function reset(handler = async () => ({data: [response()], error: null})) {
  memory.clear(); calls = [];
  store.setState({...base, roomId:'room', publicMeetingId:'test-room',
    memberId:'member', sessionId:'session', memberToken:'token',
    role:'host', hasCollaborationRoom:true, version:1}, true);
  (globalThis as any).testRpc = async (name: string) => {calls.push(name); return handler();};
}
test('one RPC renews heartbeat and refreshes shared state at the existing interval', async () => {
  reset();
  assert.equal(await store.getState().heartbeatCollaborationMember(), true);
  assert.deepEqual(calls, ['get_collaboration_room_state']);
  assert.equal(store.getState().version, 2);
  assert.equal(store.getState().onlineCount, 2);
  assert.equal(store.getState().heartbeatIntervalSeconds, 15);
  assert.equal(store.getState().rollCall.completed, true);
});
test('failed room refresh is not reported as a successful heartbeat', async () => {
  reset(async () => ({data: null, error: {message: 'Failed to fetch'}}) as any);
  assert.equal(await store.getState().heartbeatCollaborationMember(), false);
  assert.ok(store.getState().collaborationError);
  assert.equal(store.getState().hasCollaborationRoom, true);
});
test('late response cannot rejoin a room after leaving it', async () => {
  let release!: (value: any) => void;
  reset(() => calls.length === 1 ? new Promise(resolve => {release = resolve;}) : Promise.resolve({data:[response()], error:null}));
  const pending = store.getState().heartbeatCollaborationMember();
  store.getState().clearCollaborationSession({resetMeeting:true});
  release({data:[response()], error:null});
  assert.equal(await pending, false);
  assert.equal(store.getState().hasCollaborationRoom, false);
});
test('overlapping polls make only one request and preserve local progress changed during fetch', async () => {
  let release!: (value: any) => void;
  reset(() => calls.length === 1 ? new Promise(resolve => {release = resolve;}) : Promise.resolve({data:[response()], error:null}));
  const pending = store.getState().heartbeatCollaborationMember();
  await store.getState().heartbeatCollaborationMember();
  const draft = {motionId:'motion', groupId:'group', motionType:'unmoderated_caucus' as const,
    speakers:[], speakingPhase:'adding' as const, timePool:27};
  store.setState({motionProcessingDraft:draft, timePool:27});
  release({data:[response()], error:null});
  assert.equal(await pending, true);
  assert.equal(calls.length, 1);
  assert.deepEqual(store.getState().motionProcessingDraft, draft);
  assert.equal(store.getState().timePool, 27);
});
test('a stale failure cannot put a different room into error state', async () => {
  let release!: (value: any) => void;
  reset(() => calls.length === 1 ? new Promise(resolve => {release = resolve;}) : Promise.resolve({data:[response()], error:null}));
  const pending = store.getState().heartbeatCollaborationMember();
  store.setState({publicMeetingId:'new-room', sessionId:'new-session', collaborationError:null});
  release({data:null, error:{message:'member session is invalid or expired'}});
  assert.equal(await pending, false);
  assert.equal(store.getState().publicMeetingId, 'new-room');
  assert.equal(store.getState().collaborationError, null);
});
test('invalid session is rejected without leaving a false connected state', async () => {
  reset(async () => ({data:null, error:{message:'member session is invalid or expired'}}) as any);
  assert.equal(await store.getState().heartbeatCollaborationMember(), false);
  assert.equal(store.getState().hasCollaborationRoom, false);
  assert.ok(store.getState().collaborationError);
});
test('older shared response cannot overwrite a newer version already saved', async () => {
  let release!: (value:any) => void;
  reset(() => new Promise(resolve => {release=resolve;}));
  const pending = store.getState().heartbeatCollaborationMember();
  store.setState({version:5});
  release({data:[response()],error:null});
  assert.equal(await pending,true);
  assert.equal(store.getState().version,5);
});
