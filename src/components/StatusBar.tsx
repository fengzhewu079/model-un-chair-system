import {recordedVoteCount} from '../utils/motionTally';
import React, { useState } from 'react';
import { useMeetingStore } from '../store/useMeetingStore';
import { Card } from './Card';
import { Button } from './Button';
import { downloadMeetingRecord } from '../utils/exportMeeting';
import type { MotionType } from '../types';

const motionTypeLabels: Record<MotionType, string> = {
  resolution_vote: 'Resolution vote',
  paper_presentation: 'Paper Presentation',
  moderated_caucus: 'Moderated Caucus',
  unmoderated_caucus: 'Unmoderated Caucus',
  speaker_list: 'Speaker List',
  round_robin: 'Round Robin',
  extend_moderated: 'Extend Moderated Caucus',
  extend_unmoderated: 'Extend Unmoderated Caucus',
  close_debate: 'Close Debate',
  enter_voting: 'Enter Voting',
  resume_debate: 'Resume Debate',
  adjourn_meeting: 'Adjourn Meeting',
};

interface StatusBarProps {
  onGroupClick?: (groupId: string) => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({ onGroupClick }) => {
  const motionGroups = useMeetingStore((state) => state.motionGroups);

  const [exportMessage, setExportMessage] = useState('');
  const handleExport = () => {
    try {
      downloadMeetingRecord(useMeetingStore.getState());
      setExportMessage('Download started. Check your browser downloads.');
    } catch (error) {
      console.error('Export failed:', error);
      setExportMessage('Export failed. Please try again.');
    }
  };

  // Show only truly completed groups (passed or failed, not executing)
  const completedGroups = motionGroups.filter(g => g.status === 'passed' || g.status === 'failed');

  return (
    <div className="session-history bg-white border-r border-gray-200 p-4">
      <h3 className="text-lg font-bold text-gray-900 mb-3">Completed Groups</h3>
      <div className="mb-4">
        <Button variant="secondary" onClick={handleExport} className="w-full text-sm">
          Export meeting record
        </Button>
        <p className="mt-2 text-xs text-gray-500">Complete meeting · Text file</p>
        <p role="status" className="mt-2 text-xs text-gray-600">{exportMessage}</p>
      </div>

      {completedGroups.length === 0 ? (
        <div className="text-sm text-gray-500 text-center py-8">
          Completed motions will appear here.
        </div>
      ) : (
        <div className="space-y-3">
          {completedGroups.map((group) => {
            const resolution=group.motions.length===1&&group.motions[0].type==='resolution_vote'?group.motions[0]:null;
            const hasPassedMotion = group.motions.some(m => m.status === 'passed');
            const passedCount = group.motions.filter(m => m.status === 'passed').length;
            const failedCount = group.motions.filter(m => m.status === 'failed').length;

            return (
              <Card key={group.id} className="history-entry p-3">
                <div className="space-y-3">
                  {/* Group Status */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        hasPassedMotion
                          ? 'bg-success-light text-success'
                          : 'bg-error-light text-error'
                      }`}>
                        {resolution?(hasPassedMotion?'Adopted':'Not adopted'):hasPassedMotion ? '✓ Passed' : '✗ All Failed'}
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-gray-900 mb-1">
                      {resolution?resolution.parameters.topic:<>Motion Group ({group.motions.length} {group.motions.length === 1 ? 'motion' : 'motions'})</>}
                    </div>

                    {resolution ? <p className="text-xs text-slate-600">Yes {recordedVoteCount(resolution.voteResult,'for')} · No {recordedVoteCount(resolution.voteResult,'against')} · Abstain {recordedVoteCount(resolution.voteResult,'abstain')}{resolution.resolutionVote?.method==='rollcall'&&<><br/>{resolution.voteResult?.total} of {resolution.resolutionVote.roster.length} votes recorded</>}</p> : hasPassedMotion ? (
                      <div className="text-xs text-gray-600">
                        {passedCount} passed, {failedCount} failed
                      </div>
                    ) : (
                      <div className="text-xs text-gray-600">
                        {group.motions.length === 1 ? 'The motion was rejected' : `All ${group.motions.length} motions were rejected`}
                      </div>
                    )}
                  </div>

                  {/* Show passed motions summary */}
                  {hasPassedMotion && !resolution && (
                    <div className="border-t border-gray-200 pt-2">
                      <div className="text-xs font-semibold text-gray-700 mb-1">Passed Motions:</div>
                      <div className="space-y-1">
                        {group.motions
                          .filter(m => m.status === 'passed')
                          .slice(0, 2)
                          .map((motion) => {
                            const motionLabel = motionTypeLabels[motion.type];
                            const topicSuffix = (motion.type === 'round_robin' || motion.type === 'moderated_caucus' || motion.type === 'extend_moderated' || motion.type === 'paper_presentation') && motion.parameters.topic
                              ? `: ${motion.parameters.topic}`
                              : '';
                            return (
                              <div key={motion.id} className="text-xs text-gray-700">
                                • {motionLabel}{topicSuffix}
                              </div>
                            );
                          })}
                        {passedCount > 2 && (
                          <div className="text-xs text-gray-500 italic">
                            +{passedCount - 2} more...
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* View Details Button */}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onGroupClick && onGroupClick(group.id)}
                    className="w-full"
                  >
                    View Details
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
