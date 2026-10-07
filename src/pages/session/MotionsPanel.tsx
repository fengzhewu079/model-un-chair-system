import { EditMotionMenu } from '../../components/EditMotionMenu';
import { paperSummary } from '../../utils/paperPresentation';
import { formatDuration } from '../../utils/duration';
import React, { useState } from 'react';
import { useMeetingStore } from '../../store/useMeetingStore';
import { Button } from '../../components/Button';
import { RecordMotionGroupModal } from '../../components/RecordMotionGroupModal';
import { MotionProcessingBadge } from '../../components/session/MotionProcessingBadge';
import type { Motion, MotionType } from '../../types';

const motionTypeLabels: Record<MotionType, string> = {
  paper_presentation: 'Paper Presentation',
  moderated_caucus: 'Moderated Caucus',
  unmoderated_caucus: 'Unmoderated Caucus',
  speaker_list: 'Speaker List',
  round_robin: 'Round Robin',
  extend_moderated: 'Extend Moderated Caucus',
  extend_unmoderated: 'Extend Unmoderated Caucus',
  close_debate: 'Close Debate',
  resume_debate: 'Resume Debate',
  adjourn_meeting: 'Adjourn Meeting',
};

const motionStatusLabels = {
  pending: 'Pending',
  voting: 'Voting',
  executing: 'Executing',
  passed: 'Passed',
  failed: 'Failed',
};

interface MotionsPanelProps {
  onMotionClick?: (motionId: string) => void;
  onStartVoting?: (groupId: string) => void;
}

export const MotionsPanel: React.FC<MotionsPanelProps> = ({ onMotionClick, onStartVoting }) => {
  const motionGroups = useMeetingStore((state) => state.motionGroups);
  const addMotionGroup = useMeetingStore((state) => state.addMotionGroup);
  const editPendingMotionGroup = useMeetingStore(state => state.editPendingMotionGroup);
  const [editingGroupId,setEditingGroupId] = useState<string|null>(null);
  const startGroupVote = useMeetingStore((state) => state.startGroupVote);
  const motionProcessingError = useMeetingStore((state) => state.motionProcessingError);

  const [showRecordModal, setShowRecordModal] = useState(false);

  // Only show incomplete groups (pending, voting, or executing)
  const incompleteGroups = motionGroups.filter(g =>
    g.status === 'pending' || g.status === 'voting' || g.status === 'executing'
  );

  // Get present delegates for proposer suggestions
  const rollCall = useMeetingStore((state) => state.rollCall);
  const presentDelegates = rollCall.delegates
    .filter((d) => d.attendance === 'present' || d.attendance === 'present_and_voting')
    .map((d) => d.name);

  const handleStartVoting = async (groupId: string) => {
    const success = await startGroupVote(groupId);
    if (success && onStartVoting) {
      onStartVoting(groupId);
    }
  };

  const handleContinueVoting = (groupId: string) => {
    if (onStartVoting) {
      onStartVoting(groupId);
    }
  };

  const handleMotionAction = (motion: Motion) => {
    if (motion.type === 'moderated_caucus' || motion.type === 'round_robin' || motion.type === 'speaker_list' || motion.type === 'unmoderated_caucus' || motion.type === 'extend_moderated' || motion.type === 'extend_unmoderated' || motion.type === 'paper_presentation') {
      // For mod, speaker_list, and unmod, enter the detail page
      if (onMotionClick) {
        onMotionClick(motion.id);
      }
    }
  };

  return (
    <section className="motion-agenda" aria-labelledby="motion-agenda-title">
      {motionProcessingError && (
        <div role="alert" className="agenda-warning">
          {motionProcessingError}
        </div>
      )}

      <div className="agenda-toolbar">
        <div className="agenda-heading">
          <h2 id="motion-agenda-title">On the floor</h2>
          {incompleteGroups.length > 0 && (
            <span className="agenda-count">
              {incompleteGroups.length} {incompleteGroups.length === 1 ? 'group' : 'groups'}
            </span>
          )}
        </div>
        <Button
          variant={incompleteGroups.length > 0 ? 'secondary' : 'primary'}
          className="agenda-record-button"
          onClick={() => { setEditingGroupId(null); setShowRecordModal(true); }}
        >
          <span aria-hidden="true">+</span> Record a motion
        </Button>
      </div>

      {incompleteGroups.length === 0 ? (
        <div className="agenda-empty">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8M8 11h8M8 15h5M6 3h12a1 1 0 0 1 1 1v16l-3-2-4 2-4-2-3 2V4a1 1 0 0 1 1-1Z" />
          </svg>
          <div>
            <h3>Ready for the next motion</h3>
            <p>Record a proposal, then open voting.</p>
          </div>
        </div>
      ) : (
        <div className="agenda-groups">
          {incompleteGroups.map((group) => (
            <section key={group.id} className="agenda-group" aria-label="Motion group">
              <div className="agenda-group-header">
                <div className="agenda-group-label">
                  <h3>Motion group <span>· {group.motions.length} {group.motions.length === 1 ? 'motion' : 'motions'}</span></h3>
                  <span className={`agenda-status agenda-status--${group.status}`}>
                    {motionStatusLabels[group.status]}
                  </span>
                </div>
              </div>

              <div className="agenda-group-body">
                <div className="agenda-group-actions">
                  {group.status === 'pending' && (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => { setEditingGroupId(group.id); setShowRecordModal(true); }}>
                        Edit / add motions
                      </Button>
                      <Button size="sm" onClick={() => void handleStartVoting(group.id)}>
                        Start Voting
                      </Button>
                    </>
                  )}
                  {group.status === 'voting' && (
                    <Button size="sm" onClick={() => handleContinueVoting(group.id)}>
                      Continue Voting
                    </Button>
                  )}
                </div>

              <ol className="agenda-motion-list">
                {group.motions.map((motion, index) => (
                  <li key={motion.id} className="agenda-motion-row">
                    <span className="agenda-motion-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                    <div className="agenda-motion-content">
                      <div className="agenda-motion-title">
                        <h4>{motionTypeLabels[motion.type]}</h4>
                        <MotionProcessingBadge motionId={motion.id} />
                        {motion.status && (
                          <span className={`agenda-status agenda-status--${motion.status}`}>
                            {motionStatusLabels[motion.status]}
                          </span>
                        )}
                      </div>
                      {motion.type==='paper_presentation'&&motion.parameters.papers&&<p className="text-sm text-gray-600">{paperSummary(motion)}</p>}
                      {motion.parameters.topic && (
                        <p className="agenda-motion-topic">{motion.type === 'paper_presentation' ? 'Paper' : 'Topic'}: {motion.parameters.topic}</p>
                      )}
                      <div className="agenda-motion-meta">
                        {motion.proposer && <span>by {motion.proposer}</span>}
                        {motion.parameters.totalSpeakers && (
                          <span>{motion.parameters.totalSpeakers} speakers · {motion.parameters.speakingTime}s each</span>
                        )}
                        {motion.parameters.totalTime && <span>{formatDuration(motion.parameters.totalTime)}</span>}
                        {motion.voteResult && (
                          <span>For: {motion.voteResult.for} · Against: {motion.voteResult.against} · Abstain: {motion.voteResult.abstain}</span>
                        )}
                      </div>
                    </div>
                    <EditMotionMenu motion={motion} />
                    {group.status === 'executing' && motion.status === 'passed' && (
                      <Button size="sm" className="agenda-enter-button" onClick={() => handleMotionAction(motion)}>
                        {(motion.type === 'moderated_caucus' || motion.type === 'extend_moderated')
                          ? 'Enter Mod'
                          : motion.type === 'round_robin' ? 'Enter Round Robin' : motion.type === 'speaker_list'
                          ? 'Enter Speaker List'
                          : motion.type === 'paper_presentation' ? 'Enter Presentation' : 'Enter Unmod'}
                      </Button>
                    )}
                  </li>
                ))}
              </ol>
              </div>
            </section>
          ))}
        </div>
      )}

      {showRecordModal && <RecordMotionGroupModal
        isOpen={showRecordModal}
        onClose={() => setShowRecordModal(false)}
        initialMotions={editingGroupId ? motionGroups.find(g=>g.id===editingGroupId)?.motions : undefined}
        onSubmit={editingGroupId ? entries=>editPendingMotionGroup(editingGroupId,entries) : addMotionGroup}
        presentDelegates={presentDelegates}
      />}
    </section>
  );
};
