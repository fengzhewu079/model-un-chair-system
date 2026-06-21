import React, { useEffect } from 'react';
import { MainSessionPage } from './MainSessionPage';
import { useMeetingStore } from '../store/useMeetingStore';

interface DemoCommitteePageProps {
  onExit: () => void;
  onCreateRoom: () => void;
}

export const DemoCommitteePage: React.FC<DemoCommitteePageProps> = ({
  onExit,
  onCreateRoom,
}) => {
  const isDemoMode = useMeetingStore((state) => state.isDemoMode);
  const startDemoSession = useMeetingStore((state) => state.startDemoSession);
  const resetDemoSession = useMeetingStore((state) => state.resetDemoSession);

  useEffect(() => {
    if (!isDemoMode) {
      startDemoSession();
    }
  }, [isDemoMode, startDemoSession]);

  if (!isDemoMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm font-semibold text-gray-600">
        Preparing demo session...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-40 border-b border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-amber-200 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-amber-900">
                Demo Mode
              </span>
              <p className="text-sm font-semibold text-amber-950">Sample data · No Supabase room</p>
            </div>
            <p className="mt-1 text-xs text-amber-800">
              Try the real session tools. Changes disappear when you leave or refresh.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={resetDemoSession}
              className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-bold text-amber-900 hover:bg-amber-100"
            >
              Reset Demo
            </button>
            <button
              type="button"
              onClick={onExit}
              className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-bold text-amber-900 hover:bg-amber-100"
            >
              Exit Demo
            </button>
            <button
              type="button"
              onClick={onCreateRoom}
              className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-bold text-white hover:bg-blue-800"
            >
              Create Real Room
            </button>
          </div>
        </div>
      </div>
      <MainSessionPage />
    </div>
  );
};
