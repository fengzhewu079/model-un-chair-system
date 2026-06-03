import type { SharedMeetingState } from '../../utils/sharedMeetingState';

export type CollaborationRole = 'host' | 'chair';
export type CollaborationMemberStatus = 'online' | 'offline';

export interface CollaborationMember {
  memberId: string;
  name: string;
  role: CollaborationRole;
  status: CollaborationMemberStatus;
  lastActiveAt: string | null;
}

export interface CollaborationActiveMotion {
  motionId: string;
  operatorMemberId: string;
  operatorName: string;
  operatorRole: CollaborationRole;
  startedAt: string | null;
}

export interface CollaborationBootstrapState {
  roomId: string;
  publicMeetingId: string;
  memberId: string;
  role: CollaborationRole;
  memberToken: string;
  sessionId: string;
  sharedPayload: SharedMeetingState;
  version: number;
  members: CollaborationMember[];
  onlineCount: number;
  activeMotion: CollaborationActiveMotion | null;
  heartbeatIntervalSeconds: number;
  sessionTimeoutSeconds: number;
}

export interface CollaborationRoomState {
  roomId: string;
  publicMeetingId: string;
  memberId: string;
  role: CollaborationRole;
  sessionId: string;
  sharedPayload: SharedMeetingState;
  version: number;
  members: CollaborationMember[];
  onlineCount: number;
  activeMotion: CollaborationActiveMotion | null;
  heartbeatIntervalSeconds: number;
  sessionTimeoutSeconds: number;
}

export interface CollaborationPresenceSnapshot {
  members: CollaborationMember[];
  onlineCount: number;
  activeMotion: CollaborationActiveMotion | null;
  heartbeatIntervalSeconds?: number;
  sessionTimeoutSeconds?: number;
}

export interface CollaborationUpdateResult {
  roomId: string;
  version: number;
  updatedAt: string;
  members: CollaborationMember[];
  onlineCount: number;
  activeMotion: CollaborationActiveMotion | null;
}

export interface CollaborationMotionProcessingResult {
  roomId: string;
  activeMotion: CollaborationActiveMotion | null;
  members: CollaborationMember[];
  onlineCount: number;
}

export interface CollaborationFinishMotionResult {
  roomId: string;
  version: number;
  sharedPayload: SharedMeetingState;
  updatedAt: string;
  members: CollaborationMember[];
  onlineCount: number;
  activeMotion: CollaborationActiveMotion | null;
}

export interface CollaborationRoomAccessCode {
  roomId: string;
  publicMeetingId: string;
  accessCode: string;
}

export interface StoredCollaborationSession {
  roomId?: string;
  publicMeetingId: string;
  memberId: string;
  sessionId: string;
  memberToken: string;
  role: CollaborationRole;
  displayName: string;
  clientInstanceId: string;
}

export interface StoredCollaborationIdentity {
  publicMeetingId: string;
  memberId: string;
  memberToken: string;
  role: CollaborationRole;
  displayName: string;
  clientInstanceId: string;
}
