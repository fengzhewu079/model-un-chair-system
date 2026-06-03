import React from 'react';
import { useMeetingStore } from '../../store/useMeetingStore';
import { Button } from '../Button';
import { Modal } from '../Modal';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const attendanceOptions = [
  {
    value: 'present_and_voting',
    shortLabel: 'PV',
    activeClassName: 'border-emerald-600 bg-emerald-600 text-white',
  },
  {
    value: 'present',
    shortLabel: 'P',
    activeClassName: 'border-blue-600 bg-blue-600 text-white',
  },
  {
    value: 'absent',
    shortLabel: 'A',
    activeClassName: 'border-gray-600 bg-gray-600 text-white',
  },
] as const;

const statusBadgeClassNames: Record<string, string> = {
  present_and_voting: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  present: 'border border-blue-200 bg-blue-50 text-blue-700',
  absent: 'border border-gray-200 bg-gray-100 text-gray-700',
  unmarked: 'border border-amber-200 bg-amber-50 text-amber-700',
};

const statusLabels: Record<string, string> = {
  present_and_voting: 'Present and Voting',
  present: 'Present',
  absent: 'Absent',
  unmarked: 'Unmarked',
};

export const AttendanceModal: React.FC<AttendanceModalProps> = ({ isOpen, onClose }) => {
  const rollCall = useMeetingStore((state) => state.rollCall);
  const markAttendance = useMeetingStore((state) => state.markAttendance);

  const votingBase = rollCall.presentCount + rollCall.presentAndVotingCount;
  const unmarkedCount = rollCall.delegates.filter(
    (delegate) => delegate.attendance === 'unmarked'
  ).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Attendance"
      maxWidth="max-w-4xl"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Update delegate attendance for late arrivals or corrections. Changes here update the
          current voting base immediately.
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{rollCall.totalDelegates}</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Present</p>
            <p className="mt-1 text-2xl font-bold text-blue-900">{rollCall.presentCount}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
              Present &amp; Voting
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">
              {rollCall.presentAndVotingCount}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Absent</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{rollCall.absentCount}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              Voting Base
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-900">{votingBase}</p>
          </div>
        </div>

        {unmarkedCount > 0 && (
          <p className="text-sm text-amber-700">
            {unmarkedCount} delegate{unmarkedCount === 1 ? '' : 's'} still unmarked from roll
            call.
          </p>
        )}

        {rollCall.delegates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 px-6 py-10 text-center text-gray-500">
            No delegates available yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-600">
              <span>Delegate</span>
              <span>Status</span>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {rollCall.delegates.map((delegate) => (
                <div
                  key={delegate.id}
                  className="border-b border-gray-100 px-4 py-3 last:border-b-0"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-gray-900">
                        {delegate.name}
                      </p>
                      <span
                        className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          statusBadgeClassNames[delegate.attendance]
                        }`}
                      >
                        {statusLabels[delegate.attendance]}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {attendanceOptions.map((option) => {
                        const isActive = delegate.attendance === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => markAttendance(delegate.id, option.value)}
                            className={`min-w-[64px] rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                              isActive
                                ? option.activeClassName
                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {option.shortLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
