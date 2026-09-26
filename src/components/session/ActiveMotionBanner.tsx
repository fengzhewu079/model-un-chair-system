import React from 'react';
import { useMeetingStore } from '../../store/useMeetingStore';

export const ActiveMotionBanner: React.FC = () => {
  const active = useMeetingStore(s => s.activeMotion);
  const memberId = useMeetingStore(s => s.memberId);
  const error = useMeetingStore(s => s.collaborationError);
  const draft = useMeetingStore(s => s.motionProcessingDraft);
  if (!active && !draft) return null;
  return <div role="status" className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
    {active && active.operatorMemberId !== memberId
      ? `${active.operatorName} is processing a motion. Its completed result will appear after Finish Motion.`
      : 'Your local motion draft is available. Open the motion to continue; after a refresh, confirm the remaining time and press Start.'}
    {error && <p className="mt-1">Connection interrupted; this may be the last known room status.</p>}
  </div>;
};
