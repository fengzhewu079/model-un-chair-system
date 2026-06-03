import React from 'react';
import { useMeetingStore } from '../store/useMeetingStore';
import { Card } from './Card';
import { Button } from './Button';
import type { MotionType } from '../types';

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

interface StatusBarProps {
  onGroupClick?: (groupId: string) => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({ onGroupClick }) => {
  const motionGroups = useMeetingStore((state) => state.motionGroups);

  // Show only truly completed groups (passed or failed, not executing)
  const completedGroups = motionGroups.filter(g => g.status === 'passed' || g.status === 'failed');

  return (
    <div className="w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Completed Groups</h3>

      {completedGroups.length === 0 ? (
        <div className="text-sm text-gray-500 text-center py-8">
          No completed groups yet
        </div>
      ) : (
        <div className="space-y-3">
          {completedGroups.map((group) => {
            const hasPassedMotion = group.motions.some(m => m.status === 'passed');
            const passedCount = group.motions.filter(m => m.status === 'passed').length;
            const failedCount = group.motions.filter(m => m.status === 'failed').length;

            return (
              <Card key={group.id} className="p-3">
                <div className="space-y-3">
                  {/* Group Status */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        hasPassedMotion
                          ? 'bg-success-light text-success'
                          : 'bg-error-light text-error'
                      }`}>
                        {hasPassedMotion ? '✓ Passed' : '✗ All Failed'}
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-gray-900 mb-1">
                      Motion Group ({group.motions.length} motions)
                    </div>

                    {hasPassedMotion ? (
                      <div className="text-xs text-gray-600">
                        {passedCount} passed, {failedCount} failed
                      </div>
                    ) : (
                      <div className="text-xs text-gray-600">
                        All {group.motions.length} motions were rejected
                      </div>
                    )}
                  </div>

                  {/* Show passed motions summary */}
                  {hasPassedMotion && (
                    <div className="border-t border-gray-200 pt-2">
                      <div className="text-xs font-semibold text-gray-700 mb-1">Passed Motions:</div>
                      <div className="space-y-1">
                        {group.motions
                          .filter(m => m.status === 'passed')
                          .slice(0, 2)
                          .map((motion) => {
                            const motionLabel = motionTypeLabels[motion.type];
                            const topicSuffix = motion.type === 'moderated_caucus' && motion.parameters.topic
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
