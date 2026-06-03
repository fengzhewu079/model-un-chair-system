import React, { useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { SearchInput } from './SearchInput';
import { useMeetingStore } from '../store/useMeetingStore';
import type { MotionType, Motion } from '../types';

interface RecordMotionGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    motions: Omit<Motion, 'id' | 'timestamp' | 'speakers' | 'currentSpeakerIndex' | 'speakingPhase'>[]
  ) => Promise<boolean>;
  presentDelegates: string[];
}

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

export const RecordMotionGroupModal: React.FC<RecordMotionGroupModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  presentDelegates,
}) => {
  const [motions, setMotions] = useState<Omit<Motion, 'id' | 'timestamp' | 'speakers' | 'currentSpeakerIndex' | 'speakingPhase'>[]>([]);
  const [currentMotion, setCurrentMotion] = useState<{
    type: MotionType;
    proposer: string;
    totalTime: string;
    totalSpeakers: string;
    speakingTime: string;
    topic: string;
  }>({
    type: 'moderated_caucus',
    proposer: '',
    totalTime: '',
    totalSpeakers: '',
    speakingTime: '',
    topic: '',
  });

  // For merged time input: "minutes/seconds"
  const [timeInput, setTimeInput] = useState('');
  const [showTimeConfirmation, setShowTimeConfirmation] = useState(false);
  const [calculatedTime, setCalculatedTime] = useState<{
    totalMinutes: number;
    speakingSeconds: number;
    totalSpeakers: number;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTimeInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCalculateTime();
    }
  };

  const handleCalculateTime = () => {
    const parts = timeInput.split('/');
    if (parts.length !== 2) {
      alert('Please use format: minutes/seconds, e.g., 10/60');
      return;
    }

    const totalMinutes = Number(parts[0].trim());
    const speakingSeconds = Number(parts[1].trim());

    if (isNaN(totalMinutes) || isNaN(speakingSeconds) || totalMinutes <= 0 || speakingSeconds <= 0) {
      alert('Please enter valid numbers');
      return;
    }

    const totalSeconds = totalMinutes * 60;
    const totalSpeakers = Math.floor(totalSeconds / speakingSeconds);

    setCalculatedTime({
      totalMinutes,
      speakingSeconds,
      totalSpeakers,
    });
    setShowTimeConfirmation(true);
  };

  const handleConfirmTime = () => {
    if (calculatedTime) {
      setCurrentMotion({
        ...currentMotion,
        totalSpeakers: String(calculatedTime.totalSpeakers),
        speakingTime: String(calculatedTime.speakingSeconds),
      });
      setShowTimeConfirmation(false);
      setTimeInput('');
      setCalculatedTime(null);
    }
  };

  const handleCorrectTime = () => {
    setShowTimeConfirmation(false);
    setCalculatedTime(null);
    // Keep timeInput so user can edit
  };

  const handleAddMotion = () => {
    // Validation
    if (needsTotalSpeakers(currentMotion.type) && !currentMotion.totalSpeakers) {
      alert('Please enter and confirm duration and speaking time first');
      return;
    }

    if (needsTopic(currentMotion.type) && !currentMotion.topic) {
      alert('Please enter a topic');
      return;
    }

    if (needsTotalTime(currentMotion.type) && !currentMotion.totalTime) {
      alert('Please enter total time');
      return;
    }

    const parameters: any = {};

    if (currentMotion.type === 'moderated_caucus') {
      parameters.totalSpeakers = Number(currentMotion.totalSpeakers);
      parameters.speakingTime = Number(currentMotion.speakingTime);
      parameters.topic = currentMotion.topic;
    }

    if (currentMotion.type === 'speaker_list') {
      parameters.totalSpeakers = Number(currentMotion.totalSpeakers);
      parameters.speakingTime = Number(currentMotion.speakingTime);
      // No topic for speaker list
    }

    if (currentMotion.type === 'extend_moderated') {
      parameters.totalSpeakers = Number(currentMotion.totalSpeakers);
      parameters.speakingTime = Number(currentMotion.speakingTime);
      // No topic for extend moderated
    }

    if (
      currentMotion.type === 'unmoderated_caucus' ||
      currentMotion.type === 'extend_unmoderated'
    ) {
      // Convert minutes to seconds for storage
      parameters.totalTime = Number(currentMotion.totalTime) * 60;
    }

    setMotions([
      ...motions,
      {
        type: currentMotion.type,
        proposer: currentMotion.proposer || undefined,
        parameters,
        status: 'pending',
      },
    ]);

    // Reset form
    setCurrentMotion({
      type: 'moderated_caucus',
      proposer: '',
      totalTime: '',
      totalSpeakers: '',
      speakingTime: '',
      topic: '',
    });
    setTimeInput('');
    setShowTimeConfirmation(false);
    setCalculatedTime(null);
  };

  const handleRemoveMotion = (index: number) => {
    setMotions(motions.filter((_, i) => i !== index));
  };

  const resetModalState = () => {
    setMotions([]);
    setCurrentMotion({
      type: 'moderated_caucus',
      proposer: '',
      totalTime: '',
      totalSpeakers: '',
      speakingTime: '',
      topic: '',
    });
    setTimeInput('');
    setShowTimeConfirmation(false);
    setCalculatedTime(null);
    setSubmitError(null);
    setIsSubmitting(false);
  };

  const handleSubmit = async () => {
    if (motions.length === 0) {
      alert('Please add at least one motion');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    const success = await onSubmit(motions);
    if (success) {
      resetModalState();
      onClose();
      return;
    }

    setIsSubmitting(false);
    const latestState = useMeetingStore.getState();
    setSubmitError(
      latestState.motionProcessingError ||
        latestState.collaborationError ||
        'Unable to submit the motion group right now.'
    );
  };

  const handleClose = () => {
    resetModalState();
    onClose();
  };

  const needsTotalTime = (type: MotionType) =>
    ['unmoderated_caucus', 'extend_unmoderated'].includes(type);

  const needsTotalSpeakers = (type: MotionType) =>
    type === 'moderated_caucus' || type === 'speaker_list' || type === 'extend_moderated';

  const needsSpeakingTime = (type: MotionType) =>
    type === 'moderated_caucus' || type === 'speaker_list' || type === 'extend_moderated';

  const needsTopic = (type: MotionType) => type === 'moderated_caucus';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Record Motion Group</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Add 1-4 motions. All motions will be voted on together.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {submitError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          {/* Added Motions List */}
          {motions.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                Motions in Group ({motions.length})
              </h3>
              <div className="space-y-2">
                {motions.map((motion, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between p-4 border-2 border-primary bg-blue-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {index + 1}. {motionTypeLabels[motion.type]}
                      </div>
                      {motion.proposer && (
                        <div className="text-sm text-gray-600">by {motion.proposer}</div>
                      )}
                      {motion.parameters.topic && (
                        <div className="text-sm text-gray-700">Topic: {motion.parameters.topic}</div>
                      )}
                      {motion.parameters.totalSpeakers && (
                        <div className="text-sm text-gray-600">
                          {motion.parameters.totalSpeakers} speakers, {motion.parameters.speakingTime}s each
                        </div>
                      )}
                      {motion.parameters.totalTime && (
                        <div className="text-sm text-gray-600">{Math.floor(motion.parameters.totalTime / 60)} minutes</div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveMotion(index)}
                      className="text-error hover:text-red-700 font-bold text-xl"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Motion Form */}
          {motions.length < 4 && (
            <div className="border-2 border-gray-300 rounded-lg p-6 space-y-4">
              <h3 className="text-lg font-bold text-gray-900">
                Add Motion {motions.length > 0 ? `(${motions.length + 1})` : ''}
              </h3>

              {/* Motion Type */}
              <div>
                <label className="block text-base font-semibold text-gray-700 mb-2">
                  Motion Type *
                </label>
                <select
                  value={currentMotion.type}
                  onChange={(e) => {
                    setCurrentMotion({ ...currentMotion, type: e.target.value as MotionType });
                    // Reset time-related states when changing type
                    setTimeInput('');
                    setShowTimeConfirmation(false);
                    setCalculatedTime(null);
                  }}
                  className="w-full h-12 px-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:border-2 focus:border-primary focus:ring-2 focus:ring-primary/10"
                >
                  {Object.entries(motionTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Proposer */}
              <div>
                <label className="block text-base font-semibold text-gray-700 mb-2">
                  Proposer (Optional)
                </label>
                <SearchInput
                  placeholder="Type delegate name"
                  suggestions={presentDelegates}
                  onSelect={(value) => setCurrentMotion({ ...currentMotion, proposer: value })}
                  value={currentMotion.proposer}
                  onChange={(value) => setCurrentMotion({ ...currentMotion, proposer: value })}
                />
              </div>

              {/* Dynamic Fields */}
              {(needsTotalSpeakers(currentMotion.type) || needsSpeakingTime(currentMotion.type)) && (
                <div>
                  {/* Only show input if not yet confirmed */}
                  {!currentMotion.totalSpeakers && !currentMotion.speakingTime && (
                    <>
                      <label className="block text-base font-semibold text-gray-700 mb-2">
                        Duration & Speaking Time (minutes/seconds) *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={timeInput}
                          onChange={(e) => setTimeInput(e.target.value)}
                          onKeyDown={handleTimeInputKeyDown}
                          className="flex-1 h-12 px-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:border-2 focus:border-primary focus:ring-2 focus:ring-primary/10"
                          placeholder="e.g., 10/60 (10 minutes total, 60 seconds each)"
                          disabled={showTimeConfirmation}
                        />
                        <button
                          onClick={handleCalculateTime}
                          disabled={!timeInput.trim() || showTimeConfirmation}
                          className="h-12 px-4 text-sm font-semibold rounded-lg transition-colors
                            disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed
                            enabled:bg-primary enabled:text-white enabled:hover:opacity-90"
                        >
                          Confirm
                        </button>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Format: Total duration (minutes) / Speaking time per person (seconds)
                      </p>
                    </>
                  )}

                  {/* Confirmation Display */}
                  {showTimeConfirmation && calculatedTime && (
                    <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                      <h4 className="font-bold text-gray-900 mb-3">Please confirm the following:</h4>
                      <div className="space-y-2 text-base">
                        <div className="flex justify-between">
                          <span className="text-gray-700">Total Time:</span>
                          <span className="font-semibold">{calculatedTime.totalMinutes} minutes ({calculatedTime.totalMinutes * 60} seconds)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Speaking Time Each:</span>
                          <span className="font-semibold">{calculatedTime.speakingSeconds} seconds</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Total Speakers:</span>
                          <span className="font-semibold text-primary">{calculatedTime.totalSpeakers} speakers</span>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-4">
                        <Button
                          onClick={handleCorrectTime}
                          variant="secondary"
                          className="flex-1"
                        >
                          Correct
                        </Button>
                        <Button
                          onClick={handleConfirmTime}
                          className="flex-1"
                        >
                          Confirm
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Show confirmed values - only this box after confirmation */}
                  {!showTimeConfirmation && currentMotion.totalSpeakers && currentMotion.speakingTime && (
                    <div className="p-4 bg-green-50 border-2 border-success rounded-lg">
                      <h4 className="font-bold text-success mb-2">✓ Time Settings Confirmed</h4>
                      <div className="space-y-1 text-sm text-gray-700">
                        <div className="flex justify-between">
                          <span>Total Time:</span>
                          <span className="font-semibold">{Math.floor((Number(currentMotion.totalSpeakers) * Number(currentMotion.speakingTime)) / 60)} minutes</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Speaking Time Each:</span>
                          <span className="font-semibold">{currentMotion.speakingTime} seconds</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Speakers:</span>
                          <span className="font-semibold">{currentMotion.totalSpeakers} speakers</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {needsTotalTime(currentMotion.type) && (
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">
                    Total Time (minutes) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={currentMotion.totalTime}
                    onChange={(e) =>
                      setCurrentMotion({ ...currentMotion, totalTime: e.target.value })
                    }
                    className="w-full h-12 px-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:border-2 focus:border-primary focus:ring-2 focus:ring-primary/10"
                    placeholder="Enter minutes"
                  />
                </div>
              )}

              {needsTopic(currentMotion.type) && (
                <Input
                  label="Topic *"
                  value={currentMotion.topic}
                  onChange={(e) => setCurrentMotion({ ...currentMotion, topic: e.target.value })}
                  placeholder="Enter topic"
                />
              )}

              <div className="flex justify-end">
                <Button onClick={handleAddMotion} variant="secondary">
                  Add to Group
                </Button>
              </div>
            </div>
          )}

          {motions.length >= 4 && (
            <div className="text-center text-sm text-gray-500 py-4">
              Maximum 4 motions reached
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {motions.length} motion(s) added
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={motions.length === 0 || isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Group for Voting'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
