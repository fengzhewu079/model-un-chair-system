import React, { useState } from 'react';
import { useMeetingStore } from '../../store/useMeetingStore';
import { Card } from '../../components/Card';
import { Timer } from '../../components/Timer';
import { SearchInput } from '../../components/SearchInput';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';

export const SpeakerQueue: React.FC = () => {
  const rollCall = useMeetingStore((state) => state.rollCall);
  const speakerQueue = useMeetingStore((state) => state.speakerQueue);
  const currentSpeaker = useMeetingStore((state) => state.currentSpeaker);
  const timerState = useMeetingStore((state) => state.timerState);
  const timePool = useMeetingStore((state) => state.timePool);

  const addSpeaker = useMeetingStore((state) => state.addSpeaker);
  const removeSpeaker = useMeetingStore((state) => state.removeSpeaker);
  const startSpeaking = useMeetingStore((state) => state.startSpeaking);
  const nextSpeaker = useMeetingStore((state) => state.nextSpeaker);
  const pauseTimer = useMeetingStore((state) => state.pauseTimer);
  const resumeTimer = useMeetingStore((state) => state.resumeTimer);
  const updateRemainingTime = useMeetingStore((state) => state.updateRemainingTime);
  const yieldTimeToChair = useMeetingStore((state) => state.yieldTimeToChair);
  const addSpeakerFromTimePool = useMeetingStore((state) => state.addSpeakerFromTimePool);

  const [showPoolModal, setShowPoolModal] = useState(false);
  const [poolSpeakerName, setPoolSpeakerName] = useState('');
  const [poolTime, setPoolTime] = useState(0);

  // Get present delegates for search suggestions
  const presentDelegates = rollCall.delegates
    .filter((d) => d.attendance === 'present' || d.attendance === 'present_and_voting')
    .map((d) => d.name);

  const handleAddSpeaker = (name: string) => {
    addSpeaker(name);
  };

  const handleNextSpeaker = () => {
    nextSpeaker();
  };

  const handleYieldToChair = () => {
    if (currentSpeaker) {
      yieldTimeToChair();
    }
  };

  const handleUsePoolTime = () => {
    if (poolSpeakerName && poolTime > 0 && poolTime <= timePool) {
      addSpeakerFromTimePool(poolSpeakerName, poolTime);
      setShowPoolModal(false);
      setPoolSpeakerName('');
      setPoolTime(0);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Current Speaker */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-3">Current Speaker</h3>
        {currentSpeaker ? (
          <Card variant="highlight">
            <div className="space-y-4">
              {/* Speaker Name */}
              <div className="text-2xl font-bold text-gray-900">
                {currentSpeaker.name}
              </div>

              {/* Timer */}
              <Timer
                initialTime={currentSpeaker.remainingTime}
                isRunning={timerState.isRunning}
                onPause={pauseTimer}
                onResume={resumeTimer}
                onTimeChange={updateRemainingTime}
              />

              {/* Control Buttons */}
              <div className="flex justify-between items-center gap-2">
                <div className="flex gap-2">
                  {!timerState.isRunning ? (
                    <Button onClick={resumeTimer}>
                      ▶ Start
                    </Button>
                  ) : (
                    <Button variant="secondary" onClick={pauseTimer}>
                      ⏸ Pause
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={handleYieldToChair}
                  >
                    🏛️ Yield to Chair
                  </Button>
                </div>
                <Button onClick={handleNextSpeaker}>
                  Next Speaker →
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <p className="text-center text-gray-500 py-8">
              No speaker currently speaking
            </p>
            {speakerQueue.length > 0 && (
              <div className="flex justify-center mt-4">
                <Button onClick={startSpeaking}>Start First Speaker</Button>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Add Speaker */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-3">Add Speaker</h3>
        <SearchInput
          placeholder="Type delegate name (2+ letters for suggestions)"
          suggestions={presentDelegates}
          onSelect={handleAddSpeaker}
        />
      </div>

      {/* Time Pool */}
      {timePool > 0 && (
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">Time Pool</h3>
          <Card variant="highlight">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Available Time</p>
                <p className="text-3xl font-bold text-primary">
                  {formatTime(timePool)}
                </p>
              </div>
              <Button onClick={() => setShowPoolModal(true)}>
                Use Pool Time
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Waiting Queue */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-3">
          Waiting Queue ({speakerQueue.length})
        </h3>
        {speakerQueue.length === 0 ? (
          <Card>
            <p className="text-center text-gray-500 py-8">
              No speakers in queue
            </p>
          </Card>
        ) : (
          <div className="border border-gray-200 rounded-lg max-h-[400px] overflow-y-auto">
            {speakerQueue.map((speaker, index) => (
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
                <button
                  onClick={() => removeSpeaker(speaker.id)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-error hover:bg-error-light rounded transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Use Pool Time Modal */}
      <Modal
        isOpen={showPoolModal}
        onClose={() => setShowPoolModal(false)}
        title="Use Time Pool"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowPoolModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUsePoolTime}
              disabled={!poolSpeakerName || poolTime <= 0 || poolTime > timePool}
            >
              Add Speaker
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Delegate
            </label>
            <SearchInput
              placeholder="Type delegate name (2+ letters)"
              suggestions={presentDelegates}
              onSelect={(name) => setPoolSpeakerName(name)}
              value={poolSpeakerName}
              onChange={(value) => setPoolSpeakerName(value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Speaking Time (seconds)
            </label>
            <Input
              type="number"
              value={poolTime}
              onChange={(e) => setPoolTime(Number(e.target.value))}
              min={1}
              max={timePool}
              placeholder={`Max: ${timePool}s`}
            />
            <p className="text-sm text-gray-500 mt-1">
              Available in pool: {formatTime(timePool)}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
