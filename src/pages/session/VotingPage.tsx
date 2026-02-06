import React, { useState, useEffect } from 'react';
import { useMeetingStore } from '../../store/useMeetingStore';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import type { MotionType, Motion } from '../../types';

const motionTypeLabels: Record<MotionType, string> = {
  moderated_caucus: 'Moderated Caucus',
  unmoderated_caucus: 'Unmoderated Caucus',
  extend_moderated: 'Extend Moderated Caucus',
  extend_unmoderated: 'Extend Unmoderated Caucus',
  close_debate: 'Close Debate',
  resume_debate: 'Resume Debate',
  adjourn_meeting: 'Adjourn Meeting',
};

interface VotingPageProps {
  groupId: string;
  onBack: () => void;
}

export const VotingPage: React.FC<VotingPageProps> = ({ groupId, onBack }) => {
  const rollCall = useMeetingStore((state) => state.rollCall);
  const motionGroups = useMeetingStore((state) => state.motionGroups);
  const updateMotionGroupStatus = useMeetingStore((state) => state.updateMotionGroupStatus);

  // Always get the latest group data from store
  const group = motionGroups.find(g => g.id === groupId);

  // Track votes for each motion
  const [votes, setVotes] = useState<Record<string, { for: number; against: number; abstain: number }>>({});

  // Initialize votes when group loads
  useEffect(() => {
    if (group) {
      const initialVotes: Record<string, { for: number; against: number; abstain: number }> = {};
      group.motions.forEach(motion => {
        initialVotes[motion.id] = { for: 0, against: 0, abstain: 0 };
      });
      setVotes(initialVotes);
    }
  }, [group?.id]);

  // Check if any motion passed - auto end voting
  useEffect(() => {
    if (group) {
      const hasPassedMotion = group.motions.some(m => m.status === 'passed');
      if (hasPassedMotion) {
        // Auto finish voting after a short delay
        const timer = setTimeout(() => {
          // Check if any passed motion needs execution (mod/unmod)
          const needsExecution = group.motions.some(
            m => m.status === 'passed' &&
            (m.type === 'moderated_caucus' || m.type === 'unmoderated_caucus')
          );

          // If needs execution, set to 'executing', otherwise 'passed'
          updateMotionGroupStatus(groupId, needsExecution ? 'executing' : 'passed');
          onBack();
        }, 2000); // 2 second delay to show success message
        return () => clearTimeout(timer);
      }
    }
  }, [group?.motions, groupId, updateMotionGroupStatus, onBack]);

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card>
          <p className="text-center text-gray-500 py-8">Motion group not found</p>
          <div className="flex justify-center mt-4">
            <Button onClick={onBack}>← Back</Button>
          </div>
        </Card>
      </div>
    );
  }

  // Calculate voting thresholds
  const votingBase = rollCall.presentCount + rollCall.presentAndVotingCount;
  const simpleMajority = Math.floor(votingBase / 2) + 1;
  const absoluteMajority = Math.ceil(votingBase * (2 / 3));

  const handleVoteChange = (motionId: string, type: 'for' | 'against' | 'abstain', value: number) => {
    setVotes({
      ...votes,
      [motionId]: {
        ...votes[motionId],
        [type]: Math.max(0, value),
      },
    });
  };

  const handleConfirmMotion = (motion: Motion, result: 'pass' | 'fail') => {
    const vote = votes[motion.id] || { for: 0, against: 0, abstain: 0 };
    const voteResult = {
      for: vote.for,
      against: vote.against,
      abstain: vote.abstain,
      total: vote.for + vote.against + vote.abstain,
      votingBase,
      result,
      rule: 'Simple Majority',
      timestamp: new Date(),
    };

    // Update motion status in the group using Zustand's set
    useMeetingStore.setState((state) => ({
      motionGroups: state.motionGroups.map(g => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          motions: g.motions.map(m => {
            if (m.id !== motion.id) return m;
            return {
              ...m,
              status: result === 'pass' ? 'passed' as const : 'failed' as const,
              voteResult,
            };
          }),
        };
      }),
    }));

    // If any motion passed, add to motions list for tracking
    if (result === 'pass') {
      useMeetingStore.setState((state) => ({
        motions: [...state.motions, { ...motion, status: 'passed' as const, voteResult }],
      }));

      // If moderated caucus passed, update state
      if (motion.type === 'moderated_caucus') {
        useMeetingStore.setState({
          status: 'Moderated',
          meetingState: 'Moderated',
        });
      }
    }
  };

  const handleFinishVoting = () => {
    // Update group status
    const hasPassedMotion = group.motions.some(m => m.status === 'passed');

    // Check if any passed motion needs execution (mod/unmod)
    const needsExecution = group.motions.some(
      m => m.status === 'passed' &&
      (m.type === 'moderated_caucus' || m.type === 'unmoderated_caucus')
    );

    // If needs execution, set to 'executing', otherwise 'passed' or 'failed'
    if (hasPassedMotion && needsExecution) {
      updateMotionGroupStatus(groupId, 'executing');
    } else {
      updateMotionGroupStatus(groupId, hasPassedMotion ? 'passed' : 'failed');
    }

    onBack();
  };

  // Check if any motion has passed
  const hasPassedMotion = group.motions.some(m => m.status === 'passed');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Voting Session</h1>
            <p className="text-gray-600 mt-1">Motion Group ({group.motions.length} motions)</p>
          </div>
          <Button variant="secondary" onClick={handleFinishVoting}>
            Finish Voting
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Voting Requirements Card */}
        <Card>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Voting Requirements:</p>
            <div className="space-y-1 text-sm text-gray-700">
              <div>
                <span className="font-semibold">Simple Majority:</span> {simpleMajority} votes needed
                <span className="text-gray-500 ml-1">(&gt; 1/2)</span>
              </div>
              <div>
                <span className="font-semibold">Absolute Majority:</span> {absoluteMajority} votes needed
                <span className="text-gray-500 ml-1">(≥ 2/3)</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Success Alert if any motion passed */}
        {hasPassedMotion && (
          <Card>
            <div className="bg-green-50 border-2 border-success rounded-lg p-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✓</span>
                <div className="flex-1">
                  <p className="font-semibold text-success text-lg">Motion Passed!</p>
                  <p className="text-sm text-gray-700 mt-1">
                    Voting will end automatically in 2 seconds, or you can finish now.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Each Motion Voting Card */}
        {group.motions.map((motion, index) => {
          const vote = votes[motion.id] || { for: 0, against: 0, abstain: 0 };
          const isVoted = motion.status && motion.status !== 'pending';

          return (
            <Card key={motion.id}>
              <div className="space-y-4">
                {/* Motion Header */}
                <div className="flex items-start justify-between border-b border-gray-200 pb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-500">{index + 1}.</span>
                      <span className="text-lg font-semibold text-gray-900">
                        {motionTypeLabels[motion.type]}
                      </span>
                      {isVoted && (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            motion.status === 'passed'
                              ? 'bg-success-light text-success'
                              : 'bg-error-light text-error'
                          }`}
                        >
                          {motion.status === 'passed' ? '✓ Passed' : '✗ Failed'}
                        </span>
                      )}
                    </div>
                    {motion.proposer && (
                      <div className="text-sm text-gray-600 ml-7">by {motion.proposer}</div>
                    )}
                    {motion.parameters.topic && (
                      <div className="text-base font-medium text-gray-800 ml-7 mt-2">
                        Topic: {motion.parameters.topic}
                      </div>
                    )}
                    {motion.parameters.totalSpeakers && (
                      <div className="text-base font-medium text-gray-700 ml-7 mt-1">
                        {motion.parameters.totalSpeakers} speakers, {motion.parameters.speakingTime}s each
                      </div>
                    )}
                    {motion.parameters.totalTime && (
                      <div className="text-base font-medium text-gray-700 ml-7 mt-1">{Math.floor(motion.parameters.totalTime / 60)} minutes</div>
                    )}
                  </div>
                </div>

                {/* Vote Counts or Result */}
                {!isVoted ? (
                  <>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-3">
                        You can enter vote counts below or directly click Pass/Fail.
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            For
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={vote.for || ''}
                            onChange={(e) => handleVoteChange(motion.id, 'for', Number(e.target.value))}
                            placeholder="Optional"
                            className="w-full h-12 px-3 text-lg font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-2 focus:border-primary focus:ring-2 focus:ring-primary/10"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Against
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={vote.against || ''}
                            onChange={(e) => handleVoteChange(motion.id, 'against', Number(e.target.value))}
                            placeholder="Optional"
                            className="w-full h-12 px-3 text-lg font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-2 focus:border-primary focus:ring-2 focus:ring-primary/10"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Abstain
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={vote.abstain || ''}
                            onChange={(e) => handleVoteChange(motion.id, 'abstain', Number(e.target.value))}
                            placeholder="Optional"
                            className="w-full h-12 px-3 text-lg font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-2 focus:border-primary focus:ring-2 focus:ring-primary/10"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={() => handleConfirmMotion(motion, 'pass')}
                        className="flex-1"
                      >
                        ✓ Pass
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleConfirmMotion(motion, 'fail')}
                        className="flex-1"
                      >
                        ✗ Fail
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className={`p-4 rounded-lg border-2 ${
                    motion.status === 'passed'
                      ? 'bg-green-50 border-success'
                      : 'bg-red-50 border-error'
                  }`}>
                    <div className={`text-lg font-bold mb-2 ${
                      motion.status === 'passed' ? 'text-success' : 'text-error'
                    }`}>
                      {motion.status === 'passed' ? '✓ PASSED' : '✗ FAILED'}
                    </div>
                    <div className="text-sm text-gray-700">
                      <div className="grid grid-cols-3 gap-2">
                        <div>For: <span className="font-semibold">{motion.voteResult?.for || 0}</span></div>
                        <div>Against: <span className="font-semibold">{motion.voteResult?.against || 0}</span></div>
                        <div>Abstain: <span className="font-semibold">{motion.voteResult?.abstain || 0}</span></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
