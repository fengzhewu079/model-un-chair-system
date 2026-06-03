import type {
  CollaborationMember,
  CollaborationMemberStatus,
  CollaborationRole,
} from '../features/collaboration/types';

export const formatCollaborationRole = (role: CollaborationRole | null) => {
  if (role === 'host') return 'Host';
  if (role === 'chair') return 'Chair';
  return 'Unknown';
};

export const formatCollaborationMemberStatus = (
  status: CollaborationMemberStatus | null
) => {
  if (status === 'offline') return 'Offline';
  if (status === 'online') return 'Online';
  return 'Unknown';
};

export const sortCollaborationMembers = (
  members: CollaborationMember[],
  currentMemberId: string | null
) => {
  const originalOrder = new Map(
    members.map((member, index) => [member.memberId, index] as const)
  );

  return [...members].sort((left, right) => {
    const leftRoleWeight = left.role === 'host' ? 0 : 1;
    const rightRoleWeight = right.role === 'host' ? 0 : 1;
    if (leftRoleWeight !== rightRoleWeight) {
      return leftRoleWeight - rightRoleWeight;
    }

    const leftStatusWeight = left.status === 'online' ? 0 : 1;
    const rightStatusWeight = right.status === 'online' ? 0 : 1;
    if (leftStatusWeight !== rightStatusWeight) {
      return leftStatusWeight - rightStatusWeight;
    }

    const leftSelfWeight = left.memberId === currentMemberId ? 0 : 1;
    const rightSelfWeight = right.memberId === currentMemberId ? 0 : 1;
    if (leftSelfWeight !== rightSelfWeight) {
      return leftSelfWeight - rightSelfWeight;
    }

    return (
      (originalOrder.get(left.memberId) ?? Number.MAX_SAFE_INTEGER) -
      (originalOrder.get(right.memberId) ?? Number.MAX_SAFE_INTEGER)
    );
  });
};
