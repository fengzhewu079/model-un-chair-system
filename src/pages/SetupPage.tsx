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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-6">
        {!hasCollaborationRoom && currentStep === 'meeting_info' && onBackToHome && (
          <button
            type="button"
            onClick={onBackToHome}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-primary"
          >
            <span aria-hidden="true">←</span>
            Back to MUN Chair home
          </button>
        )}
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Model UN Chair System
          </h1>
          <h2 className="text-3xl font-bold text-gray-900">
            {hasCollaborationRoom ? 'Continue Collaborative Setup' : 'Create or Join a Collaboration Room'}
          </h2>
          {hasCollaborationRoom && publicMeetingId && (
            <p className="mt-3 text-sm text-gray-600">
              Connected to meeting <span className="font-mono font-semibold">{publicMeetingId}</span>
            </p>
          )}
        </div>

        {collaborationError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {collaborationError}
          </div>
        )}

        {!collaborationError && collaborationStatus === 'syncing' && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Syncing shared meeting state...
          </div>
        )}

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-12">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-4 h-4 rounded-full ${
                    index < currentStepIndex
                      ? 'bg-success'
                      : index === currentStepIndex
                      ? 'bg-primary'
                      : 'bg-gray-300'
                  }`}
                >
                  {index < currentStepIndex && (
                    <div className="w-4 h-4 flex items-center justify-center text-white text-xs">
                      ✓
                    </div>
                  )}
                </div>
                <span
                  className={`mt-2 text-sm ${
                    index === currentStepIndex
                      ? 'font-semibold text-gray-900'
                      : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-24 h-0.5 mx-4 ${
                    index < currentStepIndex ? 'bg-success' : 'bg-gray-300'
                  }`}
                  style={{ marginTop: '-20px' }}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};
