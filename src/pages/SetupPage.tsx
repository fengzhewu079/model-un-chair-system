import React from 'react';
import { useMeetingStore } from '../store/useMeetingStore';
import { MeetingInfoStep } from './setup/MeetingInfoStep';
import { DelegatesStep } from './setup/DelegatesStep';
import { RollCallStep } from './setup/RollCallStep';
import type { EntryMode } from '../utils/appNavigation';

const steps = [
  { id: 'meeting_info', label: 'Meeting Info' },
  { id: 'delegates', label: 'Delegates' },
  { id: 'roll_call', label: 'Roll Call' },
] as const;

interface SetupPageProps {
  initialEntryMode?: EntryMode | null;
  onBackToHome?: () => void;
}

export const SetupPage: React.FC<SetupPageProps> = ({ initialEntryMode, onBackToHome }) => {
  const currentStep = useMeetingStore((state) => state.currentStep);
  const hasCollaborationRoom = useMeetingStore((state) => state.hasCollaborationRoom);
  const collaborationStatus = useMeetingStore((state) => state.collaborationStatus);
  const collaborationError = useMeetingStore((state) => state.collaborationError);
  const publicMeetingId = useMeetingStore((state) => state.publicMeetingId);

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const renderStep = () => {
    switch (currentStep) {
      case 'meeting_info':
        return <MeetingInfoStep initialMode={initialEntryMode} />;
      case 'delegates':
        return <DelegatesStep />;
      case 'roll_call':
        return <RollCallStep />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white py-5 sm:py-8">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <header className="mb-6 flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
          {!hasCollaborationRoom && currentStep === 'meeting_info' && onBackToHome ? (
            <button type="button" onClick={onBackToHome} className="text-sm font-semibold text-slate-600 hover:text-primary">← MUN Chair</button>
          ) : <span className="text-sm font-semibold text-slate-600">MUN Chair</span>}
          {hasCollaborationRoom && publicMeetingId && <span className="text-xs text-slate-500">Meeting <span className="font-mono">{publicMeetingId}</span></span>}
        </header>
        {hasCollaborationRoom && (
          <ol aria-label="Meeting setup" className="mb-7 flex flex-wrap gap-x-6 gap-y-2 border-b border-slate-200 pb-4 text-sm">
            {steps.map((step, index) => <li key={step.id} aria-current={index === currentStepIndex ? 'step' : undefined} className={index === currentStepIndex ? 'font-semibold text-primary' : 'text-slate-500'}><span className="mr-2 font-mono text-xs">{index < currentStepIndex ? '✓' : index + 1}</span>{step.label}</li>)}
          </ol>
        )}
        {collaborationError && currentStep !== 'meeting_info' && <div role="alert" className="mb-5 border-l-2 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-700">{collaborationError}</div>}
        {!collaborationError && collaborationStatus === 'syncing' && <p role="status" className="mb-5 text-sm text-blue-700">Saving meeting changes…</p>}
        <main>{renderStep()}</main>
      </div>
    </div>
  );
};
