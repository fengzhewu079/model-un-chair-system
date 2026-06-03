import type { PostgrestError } from '@supabase/supabase-js';
import {
  isSupabaseConfigured,
  supabase,
  supabaseConfigMessage,
  supabasePublicKey,
  supabaseUrl,
} from '../../lib/supabase';
import type { SharedMeetingState } from '../../utils/sharedMeetingState';
import type {
  CollaborationActiveMotion,
  CollaborationBootstrapState,
  CollaborationFinishMotionResult,
  CollaborationMember,
  CollaborationMotionProcessingResult,
  CollaborationPresenceSnapshot,
  CollaborationRoomAccessCode,
  CollaborationRoomState,
  CollaborationUpdateResult,
} from './types';

type CollaborationRpcName =
  | 'create_collaboration_room'
  | 'join_collaboration_room'
  | 'get_collaboration_room_state'
  | 'get_collaboration_room_access_code'
  | 'heartbeat_collaboration_member'
  | 'leave_collaboration_member'
  | 'apply_collaboration_state_update'
  | 'set_collaboration_motion_processing'
  | 'finish_collaboration_motion';

type CollaborationErrorCode =
  | 'unconfigured'
  | 'network'
  | 'validation'
  | 'notFound'
  | 'accessDenied'
  | 'sessionExpired'
  | 'nameInUse'
  | 'versionConflict'
  | 'activeMotionBlocked'
  | 'activeMotionConflict'
  | 'motionFinishConflict'
  | 'unknown';

export class CollaborationRpcError extends Error {
  code: CollaborationErrorCode;
  userMessage: string;
  rawMessage: string;
  shouldClearSession: boolean;
  isVersionConflict: boolean;

  constructor(options: {
    code: CollaborationErrorCode;
    userMessage: string;
    rawMessage: string;
    shouldClearSession?: boolean;
    isVersionConflict?: boolean;
  }) {
    super(options.userMessage);
    this.name = 'CollaborationRpcError';
    this.code = options.code;
    this.userMessage = options.userMessage;
    this.rawMessage = options.rawMessage;
    this.shouldClearSession = options.shouldClearSession ?? false;
    this.isVersionConflict = options.isVersionConflict ?? false;
  }
}

type CreateRoomParams = {
  publicMeetingId: string;
  accessCode: string;
  hostName: string;
  initialSharedPayload: SharedMeetingState;
  clientInstanceId: string;
};

type JoinRoomParams = {
  publicMeetingId: string;
  accessCode: string;
  displayName: string;
  clientInstanceId: string;
  memberToken?: string;
};

type RestoreRoomParams = {
  publicMeetingId: string;
  sessionId: string;
  memberToken: string;
};

type AuthenticatedCollaborationParams = {
  memberId: string;
  sessionId: string;
  memberToken: string;
};

type ApplySharedUpdateParams = AuthenticatedCollaborationParams & {
  publicMeetingId: string;
  baseVersion: number;
  nextSharedPayload: SharedMeetingState;
};

type SetMotionProcessingParams = AuthenticatedCollaborationParams & {
  publicMeetingId: string;
  motionId: string | null;
};

type FinishMotionParams = AuthenticatedCollaborationParams & {
  publicMeetingId: string;
  requestedMotionId: string;
  baseVersion: number;
  nextSharedPayload: SharedMeetingState;
};

type RevealAccessCodeParams = AuthenticatedCollaborationParams & {
  publicMeetingId: string;
};

type CreateOrJoinRoomResponseRow = {
  room_id: string;
  public_meeting_id: string;
  member_id: string;
  role: 'host' | 'chair';
  member_token: string;
  session_id: string;
  shared_payload: SharedMeetingState;
  version: number;
  members: unknown;
  online_count: number;
  active_motion: unknown;
  heartbeat_interval_seconds: number;
  session_timeout_seconds: number;
};

type RestoreRoomResponseRow = Omit<CreateOrJoinRoomResponseRow, 'member_token'>;

type PresenceResponseRow = {
  members: unknown;
  online_count: number;
  active_motion: unknown;
  heartbeat_interval_seconds?: number;
  session_timeout_seconds?: number;
};

type ApplySharedUpdateResponseRow = {
  room_id: string;
  version: number;
  updated_at: string;
  members: unknown;
  online_count: number;
  active_motion: unknown;
};

type MotionProcessingResponseRow = {
  room_id: string;
  active_motion: unknown;
  members: unknown;
  online_count: number;
};

type FinishMotionResponseRow = {
  room_id: string;
  version: number;
  shared_payload: SharedMeetingState;
  updated_at: string;
  members: unknown;
  online_count: number;
  active_motion: unknown;
};

type RevealAccessCodeResponseRow = {
  room_id: string;
  public_meeting_id: string;
  access_code: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeMember = (value: unknown): CollaborationMember | null => {
  if (!isRecord(value)) return null;

  const memberId = typeof value.memberId === 'string' ? value.memberId : '';
  const name = typeof value.name === 'string' ? value.name : '';
  const role = value.role === 'host' ? 'host' : value.role === 'chair' ? 'chair' : null;
  const status = value.status === 'offline' ? 'offline' : 'online';
  const lastActiveAt =
    typeof value.lastActiveAt === 'string' ? value.lastActiveAt : null;

  if (!memberId || !name || !role) {
    return null;
  }

  return {
    memberId,
    name,
    role,
    status,
    lastActiveAt,
  };
};

const normalizeMembers = (value: unknown): CollaborationMember[] =>
  Array.isArray(value)
    ? value
        .map((member) => normalizeMember(member))
        .filter((member): member is CollaborationMember => Boolean(member))
    : [];

const normalizeActiveMotion = (value: unknown): CollaborationActiveMotion | null => {
  if (!isRecord(value)) return null;

  const motionId = typeof value.motionId === 'string' ? value.motionId : '';
  const operatorMemberId =
    typeof value.operatorMemberId === 'string' ? value.operatorMemberId : '';
  const operatorName = typeof value.operatorName === 'string' ? value.operatorName : '';
  const operatorRole =
    value.operatorRole === 'host' ? 'host' : value.operatorRole === 'chair' ? 'chair' : null;
  const startedAt = typeof value.startedAt === 'string' ? value.startedAt : null;

  if (!motionId || !operatorMemberId || !operatorName || !operatorRole) {
    return null;
  }

  return {
    motionId,
    operatorMemberId,
    operatorName,
    operatorRole,
    startedAt,
  };
};

const requireSupabase = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new CollaborationRpcError({
      code: 'unconfigured',
      userMessage: `Collaboration is not configured yet. ${supabaseConfigMessage}`,
      rawMessage: supabaseConfigMessage,
    });
  }

  return supabase;
};

const getRawErrorMessage = (error: unknown) => {
  if (!error) return 'unknown collaboration error';

  if (typeof error === 'string') return error;

  if (isRecord(error) && typeof error.message === 'string') {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'unknown collaboration error';
};

const mapCollaborationError = (
  error: unknown,
  rpcName: CollaborationRpcName
): CollaborationRpcError => {
  if (error instanceof CollaborationRpcError) {
    return error;
  }

  const rawMessage = getRawErrorMessage(error);
  const message = rawMessage.toLowerCase();

  if (message.includes('failed to fetch') || message.includes('network')) {
    return new CollaborationRpcError({
      code: 'network',
      userMessage: 'Unable to reach the collaboration service. Please check the network and Supabase configuration.',
      rawMessage,
    });
  }

  if (message.includes('member session is invalid or expired')) {
    return new CollaborationRpcError({
      code: 'sessionExpired',
      userMessage:
        'This browser was away long enough to appear offline. Reconnecting automatically if possible; re-enter the PIN only if reconnect fails.',
      rawMessage,
      shouldClearSession: true,
    });
  }

  if (message.includes('state version conflict')) {
    return new CollaborationRpcError({
      code: 'versionConflict',
      userMessage: 'The shared state was updated by another member. Please refresh to the latest state and try again.',
      rawMessage,
      isVersionConflict: true,
    });
  }

  if (
    message.includes('column reference "room_id" is ambiguous') ||
    message.includes('column reference "version" is ambiguous')
  ) {
    return new CollaborationRpcError({
      code: 'unknown',
      userMessage:
        'The collaboration backend is running an older SQL function definition. Re-apply the latest Supabase collaboration SQL or the room-id ambiguity hotfix.',
      rawMessage,
    });
  }

  if (message.includes('shared state updates are blocked while a motion is being processed')) {
    return new CollaborationRpcError({
      code: 'activeMotionBlocked',
      userMessage: 'A motion is currently being processed, so shared meeting updates are temporarily blocked.',
      rawMessage,
    });
  }

  if (
    message.includes('another member is currently processing a motion') ||
    message.includes('another member is currently processing this motion')
  ) {
    return new CollaborationRpcError({
      code: 'activeMotionConflict',
      userMessage: 'Another member is already processing a motion. Please wait until they finish or leave that flow.',
      rawMessage,
    });
  }

  if (
    message.includes('requested motion is not the active motion') ||
    message.includes('no motion is currently being processed') ||
    message.includes('motion finish conflict')
  ) {
    return new CollaborationRpcError({
      code: 'motionFinishConflict',
      userMessage: 'The motion processing state has changed. Refresh the latest room state and try again.',
      rawMessage,
    });
  }

  if (message.includes('room not found or access code is invalid')) {
    return new CollaborationRpcError({
      code: 'accessDenied',
      userMessage: 'The meeting could not be found, or the PIN is incorrect.',
      rawMessage,
    });
  }

  if (message.includes('room not found')) {
    return new CollaborationRpcError({
      code: 'notFound',
      userMessage:
        rpcName === 'get_collaboration_room_state'
          ? 'The collaboration room no longer exists or is no longer valid. Please join again.'
          : 'The meeting could not be found.',
      rawMessage,
      shouldClearSession: rpcName === 'get_collaboration_room_state',
    });
  }

  if (message.includes('member does not belong to requested room')) {
    return new CollaborationRpcError({
      code: 'accessDenied',
      userMessage: 'Your current collaboration identity does not belong to this meeting. Please rejoin the room and try again.',
      rawMessage,
    });
  }

  if (message.includes('only host can reveal the access code')) {
    return new CollaborationRpcError({
      code: 'accessDenied',
      userMessage: 'Only the host can reveal the current meeting PIN.',
      rawMessage,
    });
  }

  if (
    message.includes(
      'access code reveal is unavailable for this legacy room until someone rejoins with the code once'
    )
  ) {
    return new CollaborationRpcError({
      code: 'accessDenied',
      userMessage: 'This room cannot reveal the PIN yet. Rejoin once with the original PIN and try again.',
      rawMessage,
    });
  }

  if (message.includes('collaboration_access_code_secret must be configured')) {
    return new CollaborationRpcError({
      code: 'unknown',
      userMessage: 'PIN reveal is not configured yet for this collaboration backend.',
      rawMessage,
    });
  }

  if (message.includes('could not find the function public.get_collaboration_room_access_code')) {
    return new CollaborationRpcError({
      code: 'unknown',
      userMessage: 'PIN reveal is not available yet because the collaboration backend is only partially deployed.',
      rawMessage,
    });
  }

  if (
    message.includes('duplicate key value violates unique constraint') &&
    message.includes('public_meeting_id')
  ) {
    return new CollaborationRpcError({
      code: 'validation',
      userMessage:
        'This Meeting ID already exists. Join the existing room or use a different Meeting ID.',
      rawMessage,
    });
  }

  if (
    message.includes('display name is already in use by an online member') ||
    message.includes('display name is already in use by another member')
  ) {
    return new CollaborationRpcError({
      code: 'nameInUse',
      userMessage: 'That name is already being used by another member in the room. Please choose a different name.',
      rawMessage,
    });
  }

  if (message.includes('display name already exists; use the original member token to rejoin')) {
    return new CollaborationRpcError({
      code: 'nameInUse',
      userMessage: 'That name has already joined this meeting before. This browser does not have the original identity token, so please use a different name.',
      rawMessage,
    });
  }

  if (message.includes('public_meeting_id is required')) {
    return new CollaborationRpcError({
      code: 'validation',
      userMessage: 'Please enter a Meeting ID.',
      rawMessage,
    });
  }

  if (message.includes('access_code is required')) {
    return new CollaborationRpcError({
      code: 'validation',
      userMessage: 'Please enter a PIN.',
      rawMessage,
    });
  }

  if (message.includes('host_name is required')) {
    return new CollaborationRpcError({
      code: 'validation',
      userMessage: 'Please enter the host name.',
      rawMessage,
    });
  }

  if (message.includes('display_name is required')) {
    return new CollaborationRpcError({
      code: 'validation',
      userMessage: 'Please enter your name.',
      rawMessage,
    });
  }

  if (message.includes('next_shared_payload is required')) {
    return new CollaborationRpcError({
      code: 'validation',
      userMessage: 'The shared state update is missing the required shared payload.',
      rawMessage,
    });
  }

  if (message.includes('next_shared_payload must be a json object')) {
    return new CollaborationRpcError({
      code: 'validation',
      userMessage: 'The shared state payload must be a JSON object.',
      rawMessage,
    });
  }

  return new CollaborationRpcError({
    code: 'unknown',
    userMessage: `Collaboration request failed: ${rawMessage}`,
    rawMessage,
  });
};

const unwrapSingleRow = <TRow>(data: TRow[] | null, rpcName: CollaborationRpcName): TRow => {
  if (!data || data.length === 0) {
    throw new CollaborationRpcError({
      code: 'unknown',
      userMessage: `The collaboration service returned an empty response for ${rpcName}.`,
      rawMessage: `empty response from ${rpcName}`,
    });
  }

  return data[0];
};

const callCollaborationRpc = async <TRow>(
  rpcName: CollaborationRpcName,
  params: Record<string, unknown>
): Promise<TRow> => {
  const client = requireSupabase();
  const { data, error } = await client.rpc(rpcName, params);

  if (error) {
    throw mapCollaborationError(error as PostgrestError, rpcName);
  }

  return unwrapSingleRow(data as TRow[] | null, rpcName);
};

const normalizeBootstrapState = (
  row: CreateOrJoinRoomResponseRow
): CollaborationBootstrapState => ({
  roomId: row.room_id,
  publicMeetingId: row.public_meeting_id,
  memberId: row.member_id,
  role: row.role,
  memberToken: row.member_token,
  sessionId: row.session_id,
  sharedPayload: row.shared_payload,
  version: row.version,
  members: normalizeMembers(row.members),
  onlineCount: row.online_count,
  activeMotion: normalizeActiveMotion(row.active_motion),
  heartbeatIntervalSeconds: row.heartbeat_interval_seconds,
  sessionTimeoutSeconds: row.session_timeout_seconds,
});

const normalizeRoomState = (row: RestoreRoomResponseRow): CollaborationRoomState => ({
  roomId: row.room_id,
  publicMeetingId: row.public_meeting_id,
  memberId: row.member_id,
  role: row.role,
  sessionId: row.session_id,
  sharedPayload: row.shared_payload,
  version: row.version,
  members: normalizeMembers(row.members),
  onlineCount: row.online_count,
  activeMotion: normalizeActiveMotion(row.active_motion),
  heartbeatIntervalSeconds: row.heartbeat_interval_seconds,
  sessionTimeoutSeconds: row.session_timeout_seconds,
});

const normalizePresenceSnapshot = (
  row: PresenceResponseRow
): CollaborationPresenceSnapshot => ({
  members: normalizeMembers(row.members),
  onlineCount: row.online_count,
  activeMotion: normalizeActiveMotion(row.active_motion),
  heartbeatIntervalSeconds: row.heartbeat_interval_seconds,
  sessionTimeoutSeconds: row.session_timeout_seconds,
});

const normalizeUpdateResult = (
  row: ApplySharedUpdateResponseRow
): CollaborationUpdateResult => ({
  roomId: row.room_id,
  version: row.version,
  updatedAt: row.updated_at,
  members: normalizeMembers(row.members),
  onlineCount: row.online_count,
  activeMotion: normalizeActiveMotion(row.active_motion),
});

const normalizeMotionProcessingResult = (
  row: MotionProcessingResponseRow
): CollaborationMotionProcessingResult => ({
  roomId: row.room_id,
  activeMotion: normalizeActiveMotion(row.active_motion),
  members: normalizeMembers(row.members),
  onlineCount: row.online_count,
});

const normalizeFinishMotionResult = (
  row: FinishMotionResponseRow
): CollaborationFinishMotionResult => ({
  roomId: row.room_id,
  version: row.version,
  sharedPayload: row.shared_payload,
  updatedAt: row.updated_at,
  members: normalizeMembers(row.members),
  onlineCount: row.online_count,
  activeMotion: normalizeActiveMotion(row.active_motion),
});

const normalizeRoomAccessCode = (
  row: RevealAccessCodeResponseRow
): CollaborationRoomAccessCode => ({
  roomId: row.room_id,
  publicMeetingId: row.public_meeting_id,
  accessCode: row.access_code,
});

export const createCollaborationRoomRpc = async (
  params: CreateRoomParams
): Promise<CollaborationBootstrapState> => {
  const row = await callCollaborationRpc<CreateOrJoinRoomResponseRow>('create_collaboration_room', {
    requested_public_meeting_id: params.publicMeetingId,
    requested_access_code: params.accessCode,
    requested_host_name: params.hostName,
    initial_shared_payload: params.initialSharedPayload,
    requested_client_instance_id: params.clientInstanceId,
  });

  return normalizeBootstrapState(row);
};

export const joinCollaborationRoomRpc = async (
  params: JoinRoomParams
): Promise<CollaborationBootstrapState> => {
  const row = await callCollaborationRpc<CreateOrJoinRoomResponseRow>('join_collaboration_room', {
    requested_public_meeting_id: params.publicMeetingId,
    requested_access_code: params.accessCode,
    requested_display_name: params.displayName,
    requested_client_instance_id: params.clientInstanceId,
    supplied_member_token: params.memberToken ?? null,
  });

  return normalizeBootstrapState(row);
};

export const getCollaborationRoomStateRpc = async (
  params: RestoreRoomParams
): Promise<CollaborationRoomState> => {
  const row = await callCollaborationRpc<RestoreRoomResponseRow>('get_collaboration_room_state', {
    requested_public_meeting_id: params.publicMeetingId,
    requested_session_id: params.sessionId,
    supplied_member_token: params.memberToken,
  });

  return normalizeRoomState(row);
};

export const getCollaborationRoomAccessCodeRpc = async (
  params: RevealAccessCodeParams
): Promise<CollaborationRoomAccessCode> => {
  const row = await callCollaborationRpc<RevealAccessCodeResponseRow>(
    'get_collaboration_room_access_code',
    {
      requested_public_meeting_id: params.publicMeetingId,
      requested_member_id: params.memberId,
      requested_session_id: params.sessionId,
      supplied_member_token: params.memberToken,
    }
  );

  return normalizeRoomAccessCode(row);
};

export const heartbeatCollaborationMemberRpc = async (
  params: AuthenticatedCollaborationParams
): Promise<CollaborationPresenceSnapshot> => {
  const row = await callCollaborationRpc<PresenceResponseRow>('heartbeat_collaboration_member', {
    requested_member_id: params.memberId,
    requested_session_id: params.sessionId,
    supplied_member_token: params.memberToken,
  });

  return normalizePresenceSnapshot(row);
};

export const leaveCollaborationMemberRpc = async (
  params: AuthenticatedCollaborationParams & { disconnectReason?: string }
): Promise<CollaborationPresenceSnapshot> => {
  const row = await callCollaborationRpc<PresenceResponseRow>('leave_collaboration_member', {
    requested_member_id: params.memberId,
    requested_session_id: params.sessionId,
    supplied_member_token: params.memberToken,
    requested_disconnect_reason: params.disconnectReason ?? 'manual_leave',
  });

  return normalizePresenceSnapshot(row);
};

export const leaveCollaborationMemberKeepaliveRpc = (
  params: AuthenticatedCollaborationParams & { disconnectReason?: string }
) => {
  requireSupabase();

  if (!supabaseUrl || !supabasePublicKey) {
    throw new CollaborationRpcError({
      code: 'unconfigured',
      userMessage: `Collaboration is not configured yet. ${supabaseConfigMessage}`,
      rawMessage: supabaseConfigMessage,
    });
  }

  return fetch(`${supabaseUrl}/rest/v1/rpc/leave_collaboration_member`, {
    method: 'POST',
    keepalive: true,
    headers: {
      'Content-Type': 'application/json',
      apikey: supabasePublicKey,
      Authorization: `Bearer ${supabasePublicKey}`,
    },
    body: JSON.stringify({
      requested_member_id: params.memberId,
      requested_session_id: params.sessionId,
      supplied_member_token: params.memberToken,
      requested_disconnect_reason: params.disconnectReason ?? 'page_leave',
    }),
  }).catch((error) => {
    throw mapCollaborationError(error, 'leave_collaboration_member');
  });
};

export const applyCollaborationStateUpdateRpc = async (
  params: ApplySharedUpdateParams
): Promise<CollaborationUpdateResult> => {
  const row = await callCollaborationRpc<ApplySharedUpdateResponseRow>('apply_collaboration_state_update', {
    requested_public_meeting_id: params.publicMeetingId,
    requested_member_id: params.memberId,
    requested_session_id: params.sessionId,
    supplied_member_token: params.memberToken,
    base_version: params.baseVersion,
    next_shared_payload: params.nextSharedPayload,
  });

  return normalizeUpdateResult(row);
};

export const setCollaborationMotionProcessingRpc = async (
  params: SetMotionProcessingParams
): Promise<CollaborationMotionProcessingResult> => {
  const row = await callCollaborationRpc<MotionProcessingResponseRow>(
    'set_collaboration_motion_processing',
    {
      requested_public_meeting_id: params.publicMeetingId,
      requested_member_id: params.memberId,
      requested_session_id: params.sessionId,
      supplied_member_token: params.memberToken,
      requested_motion_id: params.motionId,
    }
  );

  return normalizeMotionProcessingResult(row);
};

export const finishCollaborationMotionRpc = async (
  params: FinishMotionParams
): Promise<CollaborationFinishMotionResult> => {
  const row = await callCollaborationRpc<FinishMotionResponseRow>(
    'finish_collaboration_motion',
    {
      requested_public_meeting_id: params.publicMeetingId,
      requested_member_id: params.memberId,
      requested_session_id: params.sessionId,
      supplied_member_token: params.memberToken,
      requested_motion_id: params.requestedMotionId,
      base_version: params.baseVersion,
      next_shared_payload: params.nextSharedPayload,
    }
  );

  return normalizeFinishMotionResult(row);
};

export const toCollaborationRpcError = (
  error: unknown,
  rpcName: CollaborationRpcName
): CollaborationRpcError => mapCollaborationError(error, rpcName);
