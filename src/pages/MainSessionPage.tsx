import {ResolutionVotingPage} from './session/ResolutionVotingPage';
import React, { useState } from 'react';
import { HeaderBar } from './session/HeaderBar';
import { MotionsPanel } from './session/MotionsPanel';
import { MotionDetailPage } from './session/MotionDetailPage';
import { PaperPresentationPage } from './session/PaperPresentationPage';
import { UnmodDetailPage } from './session/UnmodDetailPage';
import { VotingPage } from './session/VotingPage';
import { GroupDetailPage } from './session/GroupDetailPage';
import { StatusBar } from '../components/StatusBar';
import { ActiveMotionBanner } from '../components/session/ActiveMotionBanner';
import { useMeetingStore } from '../store/useMeetingStore';
import '../styles/session-refinement.css';

export const MainSessionPage: React.FC = () => {
  const motions = useMeetingStore((state) => state.motions);
  const motionGroups = useMeetingStore((state) => state.motionGroups);
  const [selectedMotionId, setSelectedMotionId] = useState<string | null>(null);
  const [votingGroupId, setVotingGroupId] = useState<string | null>(null);
  const [groupDetailId, setGroupDetailId] = useState<string | null>(null);

  const [resolutionVoting,setResolutionVoting]=useState<string|null>(null);
  if(resolutionVoting)return <ResolutionVotingPage sourceMotionId={resolutionVoting} onBack={()=>setResolutionVoting(null)}/>;

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
        onResolutionVoting={(id) => { setVotingGroupId(null); setResolutionVoting(id); }}
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
        onResolutionVoting={id=>{setGroupDetailId(null);setResolutionVoting(id);}}
      />
    );
  }

  // If a motion is selected, show its detail page (mod or unmod)
  if (selectedMotionId && selectedMotion) {
    if (selectedMotion.type === 'paper_presentation') {
      return <PaperPresentationPage motionId={selectedMotionId} onBack={() => setSelectedMotionId(null)} />;
    }
    if (selectedMotion.type === 'moderated_caucus' || selectedMotion.type === 'round_robin' || selectedMotion.type === 'speaker_list' || selectedMotion.type === 'extend_moderated') {
      return (
        <MotionDetailPage
          motionId={selectedMotionId}
          onBack={() => setSelectedMotionId(null)}
        />
      );
    } else if (selectedMotion.type === 'unmoderated_caucus' || selectedMotion.type === 'extend_unmoderated') {
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
    <div className="session-page session-refined min-h-screen flex flex-col">
      <HeaderBar />

      <div className="session-layout flex flex-1">
        {/* Left: Status Bar */}
        <StatusBar onGroupClick={setGroupDetailId} />

        {/* Right: Main Content */}
        <main className="session-workspace flex-1 min-w-0">
          <div className="session-agenda-content">
            <ActiveMotionBanner />
            <MotionsPanel
              onMotionClick={setSelectedMotionId}
              onStartVoting={setVotingGroupId}
            />
          </div>
        </main>
      </div>
    </div>
  );
};
