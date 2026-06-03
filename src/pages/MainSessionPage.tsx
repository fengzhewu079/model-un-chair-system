import React, { useState } from 'react';
import { HeaderBar } from './session/HeaderBar';
import { MotionsPanel } from './session/MotionsPanel';
import { MotionDetailPage } from './session/MotionDetailPage';
import { UnmodDetailPage } from './session/UnmodDetailPage';
import { VotingPage } from './session/VotingPage';
import { GroupDetailPage } from './session/GroupDetailPage';
import { StatusBar } from '../components/StatusBar';
import { ActiveMotionBanner } from '../components/session/ActiveMotionBanner';
import { useMeetingStore } from '../store/useMeetingStore';

export const MainSessionPage: React.FC = () => {
  const motions = useMeetingStore((state) => state.motions);
  const motionGroups = useMeetingStore((state) => state.motionGroups);
  const [selectedMotionId, setSelectedMotionId] = useState<string | null>(null);
  const [votingGroupId, setVotingGroupId] = useState<string | null>(null);
  const [groupDetailId, setGroupDetailId] = useState<string | null>(null);

  // Find the motion type to determine which detail page to show
  // Search in both motions array and motionGroups
  const selectedMotion = selectedMotionId
    ? motions.find(m => m.id === selectedMotionId) ||
      motionGroups.flatMap(g => g.motions).find(m => m.id === selectedMotionId)
    : null;

  // If voting on a group, show voting page
  if (votingGroupId) {
    return (
      <VotingPage
        groupId={votingGroupId}
        onBack={() => setVotingGroupId(null)}
      />
    );
  }

  // If viewing group details, show group detail page
  if (groupDetailId) {
    return (
      <GroupDetailPage
        groupId={groupDetailId}
        onBack={() => setGroupDetailId(null)}
        onMotionClick={setSelectedMotionId}
      />
    );
  }

  // If a motion is selected, show its detail page (mod or unmod)
  if (selectedMotionId && selectedMotion) {
    if (selectedMotion.type === 'moderated_caucus' || selectedMotion.type === 'speaker_list') {
      return (
        <MotionDetailPage
          motionId={selectedMotionId}
          onBack={() => setSelectedMotionId(null)}
        />
      );
    } else if (selectedMotion.type === 'unmoderated_caucus') {
      return (
        <UnmodDetailPage
          motionId={selectedMotionId}
          onBack={() => setSelectedMotionId(null)}
        />
      );
    }
  }

  // Otherwise, show the main session view
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <HeaderBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Status Bar */}
        <StatusBar onGroupClick={setGroupDetailId} />

        {/* Right: Main Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-5xl mx-auto">
            <ActiveMotionBanner />
            <MotionsPanel
              onMotionClick={setSelectedMotionId}
              onStartVoting={setVotingGroupId}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
