import React, { useState, useRef } from 'react';
import { useMeetingStore } from '../../store/useMeetingStore';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Timer } from '../../components/Timer';
import { SearchInput } from '../../components/SearchInput';

interface MotionDetailPageProps {
  motionId: string;
  onBack: () => void;
}

export const MotionDetailPage: React.FC<MotionDetailPageProps> = ({ motionId, onBack }) => {
  const rollCall = useMeetingStore((state) => state.rollCall);
  const motion = useMeetingStore((state) => state.motions.find(m => m.id === motionId));
  const addSpeakerToMotion = useMeetingStore((state) => state.addSpeakerToMotion);
  const removeSpeakerFromMotion = useMeetingStore((state) => state.removeSpeakerFromMotion);
  const startMotionSpeaking = useMeetingStore((state) => state.startMotionSpeaking);
  const nextMotionSpeaker = useMeetingStore((state) => state.nextMotionSpeaker);
  const pauseMotionTimer = useMeetingStore((state) => state.pauseMotionTimer);
  const resumeMotionTimer = useMeetingStore((state) => state.resumeMotionTimer);
  const resetMotion = useMeetingStore((state) => state.resetMotion);
  const completeMotionExecution = useMeetingStore((state) => state.completeMotionExecution);

  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  if (!motion) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card>
          <p className="text-center text-gray-500 py-8">Motion not found</p>
          <div className="flex justify-center mt-4">
            <Button onClick={onBack}>← Back to Motions</Button>
          </div>
        </Card>
      </div>
    );
  }

  const speakers = motion.speakers || [];
  const currentSpeakerIndex = motion.currentSpeakerIndex ?? -1;
  const currentSpeaker = currentSpeakerIndex >= 0 ? speakers[currentSpeakerIndex] : null;
  const phase = motion.speakingPhase || 'adding';
  const isRunning = currentSpeaker?.status === 'speaking';
  const isLastSpeaker = currentSpeakerIndex === speakers.length - 1;

  // Get present delegates for search suggestions
  const presentDelegates = rollCall.delegates
    .filter((d) => d.attendance === 'present' || d.attendance === 'present_and_voting')
    .map((d) => d.name);

  const handleAddSpeaker = (name: string) => {
    if (name.trim()) {
      addSpeakerToMotion(motionId, name.trim());
      setInputValue('');
      // Focus back to input
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    }
  };

  const handleStartSpeaking = () => {
    if (speakers.length === 0) {
      alert('Please add at least one speaker first');
      return;
    }
    startMotionSpeaking(motionId);
  };

  const handleNextSpeaker = () => {
    nextMotionSpeaker(motionId);
  };

  const handlePause = () => {
    pauseMotionTimer(motionId);
  };

  const handleResume = () => {
    resumeMotionTimer(motionId);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset this motion? All speakers will be removed.')) {
      resetMotion(motionId);
    }
  };

  const handleFinishMotion = () => {
    completeMotionExecution(motionId);
    onBack();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="secondary" onClick={onBack}>
              ← Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Moderated Caucus</h1>
              {motion.parameters.topic && (
                <p className="text-gray-600 mt-1">Topic: {motion.parameters.topic}</p>
              )}
              {motion.parameters.totalTime && (
                <p className="text-sm text-gray-500">
                  Total: {motion.parameters.totalTime}s | Speaking: {motion.parameters.speakingTime}s
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Phase: Adding Speakers */}
        {phase === 'adding' && (
          <>
            {/* Add Speaker Section */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Add Speakers</h3>
              <Card>
                <div className="space-y-4">
                  <SearchInput
                    ref={inputRef}
                    placeholder="Type delegate name and press Enter"
                    suggestions={presentDelegates}
                    onSelect={handleAddSpeaker}
                    value={inputValue}
                    onChange={setInputValue}
                    clearOnSelect={true}
                  />
                  <p className="text-sm text-gray-500">
                    Add all speakers who want to speak, then click "Start First Speaker" below.
                  </p>
                </div>
              </Card>
            </div>

            {/* Speaker List */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Speakers List ({speakers.length})
              </h3>
              {speakers.length === 0 ? (
                <Card>
                  <p className="text-center text-gray-500 py-8">
                    No speakers added yet
                  </p>
                </Card>
              ) : (
                <Card>
                  <div className="space-y-2">
                    {speakers.map((speaker, index) => (
                      <div
                        key={speaker.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-gray-500 w-8">
                            {index + 1}.
                          </span>
                          <span className="text-lg text-gray-900">{speaker.name}</span>
                          <span className="text-sm text-gray-500">
                            ({speaker.speakingTime}s)
                          </span>
                        </div>
                        <button
                          onClick={() => removeSpeakerFromMotion(motionId, speaker.id)}
                          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-error hover:bg-error-light rounded transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center mt-6">
                    <Button onClick={handleStartSpeaking} size="lg">
                      Start First Speaker
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </>
        )}

        {/* Phase: In Progress */}
        {phase === 'in_progress' && currentSpeaker && (
          <>
            {/* Current Speaker */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Current Speaker</h3>
              <Card variant="highlight">
                <div className="space-y-4">
                  {/* Speaker Name */}
                  <div className="text-2xl font-bold text-gray-900">
                    {currentSpeaker.name}
                  </div>

                  {/* Timer */}
                  <Timer
                    key={currentSpeaker.id}
                    initialTime={currentSpeaker.remainingTime}
                    isRunning={isRunning}
                    onPause={handlePause}
                    onResume={handleResume}
                  />

                  {/* Control Buttons */}
                  <div className="flex justify-between items-center">
                    {!isRunning ? (
                      <Button onClick={handleResume}>
                        ▶ Start
                      </Button>
                    ) : (
                      <Button variant="secondary" onClick={handlePause}>
                        ⏸ Pause
                      </Button>
                    )}
                    {isLastSpeaker ? (
                      <Button onClick={handleFinishMotion}>
                        Finish
                      </Button>
                    ) : (
                      <Button onClick={handleNextSpeaker}>
                        Next Speaker →
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Waiting Queue */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Waiting Queue ({speakers.length - currentSpeakerIndex - 1})
              </h3>
              {currentSpeakerIndex >= speakers.length - 1 ? (
                <Card>
                  <p className="text-center text-gray-500 py-8">
                    No more speakers in queue
                  </p>
                </Card>
              ) : (
                <div className="border border-gray-200 rounded-lg max-h-[400px] overflow-y-auto">
                  {speakers.slice(currentSpeakerIndex + 1).map((speaker, index) => (
                    <div
                      key={speaker.id}
                      className="flex items-center justify-between p-4 border-b border-gray-200 last:border-b-0 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-gray-500 w-8">
                          {index + 1}.
                        </span>
                        <span className="text-lg text-gray-900">{speaker.name}</span>
                        <span className="text-sm text-gray-500">
                          ({speaker.speakingTime}s)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Phase: Completed */}
        {phase === 'completed' && (
          <Card variant="highlight">
            <div className="text-center py-12 space-y-6">
              <div className="text-3xl font-bold text-success">
                ✓ All Speakers Have Finished
              </div>
              <p className="text-gray-600 text-lg">
                All {speakers.length} speaker(s) in this moderated caucus have completed their speaking time.
              </p>
              <p className="text-gray-700 font-semibold">
                Click "Finish Motion" to complete this motion and move it to the status bar.
              </p>
              <div className="flex justify-center gap-4">
                <Button onClick={handleFinishMotion} size="lg">
                  Finish Motion
                </Button>
                <Button variant="secondary" onClick={handleReset}>
                  Reset Motion
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
