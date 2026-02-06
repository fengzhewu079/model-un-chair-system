import React, { useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { SearchInput } from './SearchInput';
import type { MotionType, Motion } from '../types';

interface RecordMotionGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (motions: Omit<Motion, 'id' | 'timestamp' | 'speakers' | 'currentSpeakerIndex' | 'speakingPhase'>[]) => void;
  presentDelegates: string[];
}

const motionTypeLabels: Record<MotionType, string> = {
  moderated_caucus: 'Moderated Caucus',
  unmoderated_caucus: 'Unmoderated Caucus',
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

  const handleAddMotion = () => {
    const parameters: any = {};

    if (currentMotion.type === 'moderated_caucus') {
      parameters.totalSpeakers = Number(currentMotion.totalSpeakers);
      parameters.speakingTime = Number(currentMotion.speakingTime);
      parameters.topic = currentMotion.topic;
    }

    if (
      currentMotion.type === 'extend_moderated' ||
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
  };

  const handleRemoveMotion = (index: number) => {
    setMotions(motions.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (motions.length === 0) {
      alert('Please add at least one motion');
      return;
    }
    onSubmit(motions);
    setMotions([]);
    onClose();
  };

  const needsTotalTime = (type: MotionType) =>
    ['unmoderated_caucus', 'extend_moderated', 'extend_unmoderated'].includes(type);

  const needsTotalSpeakers = (type: MotionType) => type === 'moderated_caucus';

  const needsSpeakingTime = (type: MotionType) => type === 'moderated_caucus';

  const needsTopic = (type: MotionType) => type === 'moderated_caucus';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Record Motion Group</h2>
            <button
              onClick={onClose}
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
                  onChange={(e) =>
                    setCurrentMotion({ ...currentMotion, type: e.target.value as MotionType })
                  }
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
              {needsTotalSpeakers(currentMotion.type) && (
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">
                    Total Speakers *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={currentMotion.totalSpeakers}
                    onChange={(e) =>
                      setCurrentMotion({ ...currentMotion, totalSpeakers: e.target.value })
                    }
                    className="w-full h-12 px-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:border-2 focus:border-primary focus:ring-2 focus:ring-primary/10"
                    placeholder="Enter number of speakers"
                  />
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

              {needsSpeakingTime(currentMotion.type) && (
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">
                    Speaking Time (seconds) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={currentMotion.speakingTime}
                    onChange={(e) =>
                      setCurrentMotion({ ...currentMotion, speakingTime: e.target.value })
                    }
                    className="w-full h-12 px-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:border-2 focus:border-primary focus:ring-2 focus:ring-primary/10"
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
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={motions.length === 0}>
              Submit Group for Voting
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
