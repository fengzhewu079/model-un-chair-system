import React from 'react';
import { useMeetingStore } from '../../store/useMeetingStore';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { MotionProcessingBadge } from '../../components/session/MotionProcessingBadge';
import type { MotionType } from '../../types';

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

interface GroupDetailPageProps {
  groupId: string;
  onBack: () => void;
  onMotionClick?: (motionId: string) => void;
}

export const GroupDetailPage: React.FC<GroupDetailPageProps> = ({ groupId, onBack, onMotionClick }) => {
  const motionGroups = useMeetingStore((state) => state.motionGroups);
  const group = motionGroups.find(g => g.id === groupId);

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

  const hasPassedMotion = group.motions.some(m => m.status === 'passed');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="secondary" onClick={onBack} className="mb-2">
              ← Back
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Motion Group Details</h1>
            <p className="text-gray-600 mt-1">
              {hasPassedMotion ? 'At least one motion passed' : 'All motions failed'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4 max-w-4xl mx-auto">
        {/* Group Status Card */}
        <Card>
          <div className={`p-4 rounded-lg border-2 ${
            hasPassedMotion
              ? 'bg-green-50 border-success'
              : 'bg-red-50 border-error'
          }`}>
            <div className={`text-xl font-bold mb-2 ${
              hasPassedMotion ? 'text-success' : 'text-error'
            }`}>
              {hasPassedMotion ? '✓ GROUP COMPLETED - MOTION(S) PASSED' : '✗ GROUP COMPLETED - ALL MOTIONS FAILED'}
            </div>
            <div className="text-sm text-gray-700">
              Total Motions: {group.motions.length} |
              Passed: {group.motions.filter(m => m.status === 'passed').length} |
              Failed: {group.motions.filter(m => m.status === 'failed').length}
            </div>
          </div>
        </Card>

        {/* All Motions in Group */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">All Motions in This Group</h3>
          <div className="space-y-3">
            {group.motions.map((motion, index) => (
              <Card key={motion.id}>
                <div className="space-y-3">
                  {/* Motion Header */}
                  <div className="flex items-start justify-between border-b border-gray-200 pb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-500">{index + 1}.</span>
                        <span className="text-lg font-semibold text-gray-900">
                          {motionTypeLabels[motion.type]}
                        </span>
                        <MotionProcessingBadge motionId={motion.id} />
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            motion.status === 'passed'
                              ? 'bg-success-light text-success'
                              : motion.status === 'failed'
                              ? 'bg-error-light text-error'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {motion.status === 'passed' ? '✓ Passed' : motion.status === 'failed' ? '✗ Failed' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Motion Details */}
                  <div className="space-y-2">
                    {motion.proposer && (
                      <div className="text-sm text-gray-600">
                        <span className="font-semibold">Proposer:</span> {motion.proposer}
                      </div>
                    )}

                    {motion.parameters.topic && (
                      <div className="text-base text-gray-800">
                        <span className="font-semibold">Topic:</span> {motion.parameters.topic}
                      </div>
                    )}

                    {motion.parameters.totalSpeakers && (
                      <div className="text-sm text-gray-700">
                        <span className="font-semibold">Speakers:</span> {motion.parameters.totalSpeakers} speakers, {motion.parameters.speakingTime}s each
                      </div>
                    )}

                    {motion.parameters.totalTime && (
                      <div className="text-sm text-gray-700">
                        <span className="font-semibold">Duration:</span> {Math.floor(motion.parameters.totalTime / 60)} minutes
                      </div>
                    )}

                    {motion.voteResult && (
                      <div className="bg-gray-50 rounded p-3 text-sm">
                        <div className="font-semibold text-gray-700 mb-1">Vote Results:</div>
                        <div className="grid grid-cols-3 gap-2 text-gray-700">
                          <div>For: <span className="font-semibold">{motion.voteResult.for}</span></div>
                          <div>Against: <span className="font-semibold">{motion.voteResult.against}</span></div>
                          <div>Abstain: <span className="font-semibold">{motion.voteResult.abstain}</span></div>
                        </div>
                      </div>
                    )}

                    {/* Enter motion processing page for passed execution motions */}
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
                        {motion.type === 'unmoderated_caucus' ? 'Enter Unmod' : 'Enter Caucus'}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
