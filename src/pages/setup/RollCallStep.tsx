import React, { useState } from 'react';
import { useMeetingStore } from '../../store/useMeetingStore';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ConfirmDialog } from '../../components/Modal';

export const RollCallStep: React.FC = () => {
  const delegates = useMeetingStore((state) => state.rollCall.delegates);
  const rollCall = useMeetingStore((state) => state.rollCall);
  const role = useMeetingStore((state) => state.role);
  const markAttendance = useMeetingStore((state) => state.markAttendance);
  const markAllPresent = useMeetingStore((state) => state.markAllPresent);
  const markAllPresentAndVoting = useMeetingStore((state) => state.markAllPresentAndVoting);
  const completeRollCall = useMeetingStore((state) => state.completeRollCall);
  const setCurrentStep = useMeetingStore((state) => state.setCurrentStep);

  const [showConfirm, setShowConfirm] = useState(false);

  const unmarkedCount = delegates.filter((d) => d.attendance === 'unmarked').length;

  const handleComplete = () => {
    if (unmarkedCount > 0) {
      setShowConfirm(true);
    } else {
      completeRollCall();
    }
  };

  const handleConfirmComplete = () => {
    setShowConfirm(false);
    completeRollCall();
  };

  if (role === 'chair') {
    return (
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-gray-900">Waiting for Roll Call</h3>

        <p className="text-base text-gray-700">
          Roll call is managed by the host. You will enter the session automatically when setup is
          complete.
        </p>

        <Card>
          <h4 className="text-lg font-bold text-gray-900 mb-3">Current Shared Setup</h4>
          <div className="grid grid-cols-2 gap-3 text-base">
            <div>
              <span className="text-gray-700">Delegates:</span>{' '}
              <span className="font-semibold">{rollCall.totalDelegates}</span>
            </div>
            <div>
              <span className="text-gray-700">Marked:</span>{' '}
              <span className="font-semibold">
                {rollCall.totalDelegates - unmarkedCount}
              </span>
            </div>
          </div>
        </Card>

        <div className="flex justify-start pt-4">
          <Button variant="secondary" onClick={() => setCurrentStep('meeting_info')}>
            ← Back to Preferences
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-gray-900">Roll Call</h3>

      <p className="text-base text-gray-700">
        Mark attendance status for each delegate.
      </p>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={markAllPresent}>
          Mark All Present
        </Button>
        <Button variant="secondary" onClick={markAllPresentAndVoting}>
          Mark All Present and Voting
        </Button>
      </div>

      {/* Delegates List */}
      <div className="border border-gray-200 rounded-lg max-h-[400px] overflow-y-auto">
        <div className="p-4 bg-gray-50 border-b border-gray-200 font-semibold text-base">
          Delegates ({delegates.length})
        </div>
        {delegates.map((delegate) => (
          <div
            key={delegate.id}
            className="flex items-center justify-between p-3 border-b border-gray-200 last:border-b-0"
          >
            <span className="text-base text-gray-900 flex-1">{delegate.name}</span>
            <div className="flex gap-2">
              {(['present_and_voting', 'present', 'absent'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => markAttendance(delegate.id, status)}
                  className={`px-4 py-2 rounded font-semibold text-sm transition-colors ${
                    delegate.attendance === status
                      ? status === 'present'
                        ? 'bg-primary text-white'
                        : status === 'present_and_voting'
                        ? 'bg-success text-white'
                        : 'bg-gray-500 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {status === 'present'
                    ? 'P'
                    : status === 'present_and_voting'
                    ? 'PV'
                    : 'A'}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <Card>
        <h4 className="text-lg font-bold text-gray-900 mb-3">Summary</h4>
        <div className="grid grid-cols-2 gap-3 text-base">
          <div>
            <span className="text-gray-700">Total:</span>{' '}
            <span className="font-semibold">{rollCall.totalDelegates}</span>
          </div>
          <div>
            <span className="text-gray-700">Present:</span>{' '}
            <span className="font-semibold">{rollCall.presentCount}</span>
          </div>
          <div>
            <span className="text-gray-700">Present and Voting:</span>{' '}
            <span className="font-semibold">{rollCall.presentAndVotingCount}</span>
          </div>
          <div>
            <span className="text-gray-700">Absent:</span>{' '}
            <span className="font-semibold">{rollCall.absentCount}</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-700">Not Marked:</span>{' '}
            <span className={`font-semibold ${unmarkedCount > 0 ? 'text-warning' : ''}`}>
              {unmarkedCount}
            </span>
          </div>
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="secondary" onClick={() => setCurrentStep('delegates')}>
          ← Back
        </Button>
        <Button onClick={handleComplete}>Complete Roll Call →</Button>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmComplete}
        title="Confirm Roll Call"
        message={`${unmarkedCount} delegate${
          unmarkedCount > 1 ? 's' : ''
        } not marked. Continue anyway?`}
      />
    </div>
  );
};
