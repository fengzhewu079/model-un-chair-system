import React, { useState } from 'react';
import { useMeetingStore } from '../../store/useMeetingStore';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { RecordMotionGroupModal } from '../../components/RecordMotionGroupModal';
import { MotionProcessingBadge } from '../../components/session/MotionProcessingBadge';
import type { Motion, MotionType } from '../../types';

const motionTypeLabels: Record<MotionType, string> = {
  moderated_caucus: 'Moderated Caucus',
  unmoderated_caucus: 'Unmoderated Caucus',
  speaker_list: 'Speaker List',
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
    if (motion.type === 'moderated_caucus' || motion.type === 'speaker_list' || motion.type === 'unmoderated_caucus') {
      // For mod, speaker_list, and unmod, enter the detail page
      if (onMotionClick) {
        onMotionClick(motion.id);
      }
    }
  };

  return (
    <div className="space-y-6">
      {motionProcessingError && (
        <Card variant="warning" className="p-4">
          <p className="text-sm font-semibold text-amber-900">
            {motionProcessingError}
          </p>
        </Card>
      )}

      {/* Motion Groups List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-gray-900">Motion Groups</h3>
          <Button onClick={() => setShowRecordModal(true)}>
            Record Motions
          </Button>
        </div>

        {incompleteGroups.length === 0 ? (
          <Card>
            <p className="text-center text-gray-500 py-8">No incomplete motion groups</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {incompleteGroups.map((group) => (
              <Card key={group.id}>
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-lg font-semibold text-gray-900 mb-2">
                        Motion Group ({group.motions.length} motions)
                      </div>

                      {/* List motions in the group */}
                      <div className="space-y-2 mb-3">
                        {group.motions.map((motion, index) => (
                          <div key={motion.id} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <span className="font-semibold text-gray-500">{index + 1}.</span>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{motionTypeLabels[motion.type]}</span>
                                  <MotionProcessingBadge motionId={motion.id} />
                                  {motion.status && (
                                    <span
                                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                        motion.status === 'passed'
                                          ? 'bg-success-light text-success'
                                          : motion.status === 'failed'
                                          ? 'bg-error-light text-error'
                                          : 'bg-gray-100 text-gray-700'
                                      }`}
                                    >
                                      {motionStatusLabels[motion.status]}
                                    </span>
                                  )}
                                </div>
                                {motion.proposer && <div className="text-sm text-gray-600">by {motion.proposer}</div>}
                                {motion.parameters.topic && (
                                  <div className="text-sm text-gray-600 mt-1">Topic: {motion.parameters.topic}</div>
                                )}
                                {motion.parameters.totalSpeakers && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {motion.parameters.totalSpeakers} speakers, {motion.parameters.speakingTime}s each
                                  </div>
                                )}
                                {motion.parameters.totalTime && (
                                  <div className="text-xs text-gray-500 mt-1">{Math.floor(motion.parameters.totalTime / 60)} minutes</div>
                                )}
                                {motion.voteResult && (
                                  <div className="text-xs text-gray-600 mt-1">
                                    For: {motion.voteResult.for} | Against: {motion.voteResult.against} | Abstain: {motion.voteResult.abstain}
                                  </div>
                                )}
                                {/* Show enter button for passed moderated caucus or speaker list */}
                                {motion.status === 'passed' &&
                                  (motion.type === 'moderated_caucus' ||
                                    motion.type === 'speaker_list' ||
                                    motion.type === 'unmoderated_caucus') &&
                                  onMotionClick && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => onMotionClick(motion.id)}
                                    className="mt-2"
                                  >
                                    {motion.type === 'speaker_list'
                                      ? 'Enter Speaker List'
                                      : motion.type === 'unmoderated_caucus'
                                        ? 'Enter Unmod'
                                        : 'Enter Caucus'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 ml-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          group.status === 'passed'
                            ? 'bg-success-light text-success'
                            : group.status === 'failed'
                            ? 'bg-error-light text-error'
                            : group.status === 'executing'
                            ? 'bg-blue-100 text-blue-700'
                            : group.status === 'voting'
                            ? 'bg-warning-light text-warning'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {motionStatusLabels[group.status]}
                      </span>
                      {group.status === 'pending' && (
                        <Button
                          variant="secondary"
                          onClick={() => void handleStartVoting(group.id)}
                        >
                          Start Voting
                        </Button>
                      )}
                      {group.status === 'voting' && (
                        <Button
                          variant="secondary"
                          onClick={() => handleContinueVoting(group.id)}
                        >
                          Continue Voting
                        </Button>
                      )}
                      {group.status === 'executing' && (
                        <div className="space-y-2">
                          {group.motions
                            .filter(m => m.status === 'passed')
                            .map((motion) => (
                              <Button
                                key={motion.id}
                                variant="secondary"
                                size="sm"
                                onClick={() => handleMotionAction(motion)}
                              >
                                {motion.type === 'moderated_caucus'
                                  ? 'Enter Mod'
                                  : motion.type === 'speaker_list'
                                  ? 'Enter Speaker List'
                                  : 'Enter Unmod'}
                              </Button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Record Motion Group Modal */}
      <RecordMotionGroupModal
        isOpen={showRecordModal}
        onClose={() => setShowRecordModal(false)}
        onSubmit={addMotionGroup}
        presentDelegates={presentDelegates}
      />
    </div>
  );
};
