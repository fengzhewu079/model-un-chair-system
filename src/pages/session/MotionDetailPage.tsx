import React, { useEffect, useRef, useState } from 'react';
import { useMeetingStore } from '../../store/useMeetingStore';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { SearchInput } from '../../components/SearchInput';
import { Timer } from '../../components/Timer';
import {
  applyMotionProcessingDraft,
  findMotionById,
  getMotionTypeLabel,
} from '../../utils/motionCollaboration';

interface MotionDetailPageProps {
  motionId: string;
  onBack: () => void;
}

export const MotionDetailPage: React.FC<MotionDetailPageProps> = ({ motionId, onBack }) => {
  const rollCall = useMeetingStore((state) => state.rollCall);
  const motion = useMeetingStore((state) => {
    const { motion: officialMotion } = findMotionById(state.motions, state.motionGroups, motionId);
    const draft =
      state.motionProcessingDraft?.motionId === motionId ? state.motionProcessingDraft : null;

    return officialMotion ? applyMotionProcessingDraft(officialMotion, draft) : null;
  });
  const timePool = useMeetingStore((state) =>
    state.motionProcessingDraft?.motionId === motionId
      ? state.motionProcessingDraft.timePool
      : state.timePool
  );
  const addSpeakerToMotion = useMeetingStore((state) => state.addSpeakerToMotion);
  const removeSpeakerFromMotion = useMeetingStore((state) => state.removeSpeakerFromMotion);
  const startMotionSpeaking = useMeetingStore((state) => state.startMotionSpeaking);
  const nextMotionSpeaker = useMeetingStore((state) => state.nextMotionSpeaker);
  const pauseMotionTimer = useMeetingStore((state) => state.pauseMotionTimer);
  const resumeMotionTimer = useMeetingStore((state) => state.resumeMotionTimer);
  const updateMotionSpeakerTime = useMeetingStore((state) => state.updateMotionSpeakerTime);
  const resetMotion = useMeetingStore((state) => state.resetMotion);
  const yieldMotionTimeToChair = useMeetingStore((state) => state.yieldMotionTimeToChair);
  const continueMotionWithTimePool = useMeetingStore((state) => state.continueMotionWithTimePool);
  const addSpeakerFromTimePoolToMotion = useMeetingStore(
    (state) => state.addSpeakerFromTimePoolToMotion
  );
  const beginMotionProcessing = useMeetingStore((state) => state.beginMotionProcessing);
  const releaseMotionProcessing = useMeetingStore((state) => state.releaseMotionProcessing);
  const finishMotionProcessing = useMeetingStore((state) => state.finishMotionProcessing);
  const motionProcessingError = useMeetingStore((state) => state.motionProcessingError);
  const motionProcessingState = useMeetingStore((state) => state.motionProcessingState);
  const clearMotionProcessingError = useMeetingStore(
    (state) => state.clearMotionProcessingError
  );

  const [claimReady, setClaimReady] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showAddMoreSpeakers, setShowAddMoreSpeakers] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const exitHandledRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    clearMotionProcessingError();
    setClaimReady(false);

    const claimMotion = async () => {
      const success = await beginMotionProcessing(motionId);
      if (!cancelled) {
        setClaimReady(success);
      }
    };

    void claimMotion();

    return () => {
      cancelled = true;
      if (exitHandledRef.current) {
        return;
      }

      void useMeetingStore.getState().releaseMotionProcessing({
        motionId,
        silent: true,
      });
    };
  }, [beginMotionProcessing, clearMotionProcessingError, motionId]);

  if (!motion) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card>
          <p className="py-8 text-center text-gray-500">Motion not found</p>
          <div className="mt-4 flex justify-center">
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
  const speakingTime = motion.parameters.speakingTime || 60;
  const possibleSpeakers = Math.floor(timePool / speakingTime);
  const presentDelegates = rollCall.delegates
    .filter((delegate) => delegate.attendance === 'present' || delegate.attendance === 'present_and_voting')
    .map((delegate) => delegate.name);
  const initialSpeakerLimit =
    typeof motion.parameters.totalSpeakers === 'number' &&
    motion.parameters.totalSpeakers > 0
      ? motion.parameters.totalSpeakers
      : null;
  const initialSpeakersCount = speakers.length;
  const remainingInitialSpeakers =
    initialSpeakerLimit === null ? null : Math.max(initialSpeakerLimit - initialSpeakersCount, 0);
  const hasReachedInitialSpeakerLimit =
    initialSpeakerLimit !== null && remainingInitialSpeakers === 0;
  const initialSpeakerHint =
    initialSpeakerLimit === null
      ? 'Add all speakers who want to speak, then click Start First Speaker below.'
      : hasReachedInitialSpeakerLimit
        ? 'Speaker limit reached.'
        : `You can add ${remainingInitialSpeakers} more ${
            remainingInitialSpeakers === 1 ? 'speaker' : 'speakers'
          }.`;

  const handleBack = async () => {
    exitHandledRef.current = true;
    await releaseMotionProcessing({ motionId, silent: true });
    onBack();
  };

  const handleFinishMotion = async () => {
    const success = await finishMotionProcessing(motionId);
    if (success) {
      exitHandledRef.current = true;
      onBack();
    }
  };

  const handleAddSpeaker = (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName || hasReachedInitialSpeakerLimit) return;

    addSpeakerToMotion(motionId, trimmedName);
    setInputValue('');
    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset this motion? All speakers will be removed.')) {
      resetMotion(motionId);
      setShowAddMoreSpeakers(false);
    }
  };

  const handleAddSpeakerFromPool = (name: string, time: number) => {
    const trimmedName = name.trim();
    if (!trimmedName || time <= 0 || time > timePool) return;

    addSpeakerFromTimePoolToMotion(motionId, trimmedName, time);
    setInputValue('');
    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isClaiming = motionProcessingState === 'claiming' && !claimReady;
  const isBlocked = !claimReady && motionProcessingState !== 'claiming';

  if (isClaiming) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card>
          <p className="py-8 text-center text-gray-600">Claiming motion processing...</p>
        </Card>
      </div>
    );
  }

  if (!claimReady || isBlocked) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card variant="warning">
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-gray-900">Motion is currently unavailable</h1>
            <p className="text-sm text-gray-700">
              {motionProcessingError || 'The local processing draft could not be prepared.'}
            </p>
            <div className="flex justify-end">
              <Button onClick={onBack}>Back to Motions</Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="secondary" onClick={() => void handleBack()}>
              ← Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{getMotionTypeLabel(motion.type)}</h1>
              {motion.parameters.topic && (
                <p className="mt-1 text-gray-600">Topic: {motion.parameters.topic}</p>
              )}
              {motion.parameters.totalSpeakers && (
                <p className="text-sm text-gray-500">
                  Speakers: {motion.parameters.totalSpeakers} | Speaking Time:{' '}
                  {motion.parameters.speakingTime}s
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <Card variant="highlight" className="p-4">
          <p className="text-sm font-semibold text-gray-800">
            Processing stays local on this device until you click Finish Motion.
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Speaker queue changes, timer progress, and pool usage are not shared. Only the completed
            group result is synced after Finish Motion.
          </p>
        </Card>

        {motionProcessingError && (
          <Card variant="warning" className="p-4">
            <p className="text-sm text-amber-900">{motionProcessingError}</p>
          </Card>
        )}

        {phase === 'adding' && (
          <>
            <div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">Add Speakers</h3>
              <Card>
                <div className="space-y-4">
                  {!hasReachedInitialSpeakerLimit && (
                    <SearchInput
                      ref={inputRef}
                      placeholder="Type delegate name and press Enter"
                      suggestions={presentDelegates}
                      onSelect={handleAddSpeaker}
                      value={inputValue}
                      onChange={setInputValue}
                      clearOnSelect={true}
                    />
                  )}
                  <p className="text-sm text-gray-500">{initialSpeakerHint}</p>
                </div>
              </Card>
            </div>

            <div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">
                Speakers List ({speakers.length})
              </h3>
              {speakers.length === 0 ? (
                <Card>
                  <p className="py-8 text-center text-gray-500">No speakers added yet</p>
                </Card>
              ) : (
                <Card>
                  <div className="space-y-2">
                    {speakers.map((speaker, index) => (
                      <div
                        key={speaker.id}
                        className="flex items-center justify-between rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 text-lg font-bold text-gray-500">{index + 1}.</span>
                          <span className="text-lg text-gray-900">{speaker.name}</span>
                          <span className="text-sm text-gray-500">({speaker.speakingTime}s)</span>
                        </div>
                        <button
                          onClick={() => removeSpeakerFromMotion(motionId, speaker.id)}
                          className="flex h-8 w-8 items-center justify-center rounded text-gray-400 transition-colors hover:bg-error-light hover:text-error"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex justify-center">
                    <Button
                      onClick={() => {
                        if (speakers.length === 0) {
                          window.alert('Please add at least one speaker first');
                          return;
                        }
                        startMotionSpeaking(motionId);
                      }}
                      size="lg"
                    >
                      Start First Speaker
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </>
        )}

        {phase === 'in_progress' && currentSpeaker && (
          <>
            <div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">Current Speaker</h3>
              <Card variant="highlight">
                <div className="space-y-4">
                  <div className="text-2xl font-bold text-gray-900">{currentSpeaker.name}</div>
                  <Timer
                    key={currentSpeaker.id}
                    initialTime={currentSpeaker.remainingTime}
                    isRunning={isRunning}
                    onPause={() => pauseMotionTimer(motionId)}
                    onResume={() => resumeMotionTimer(motionId)}
                    onTimeChange={(time) => updateMotionSpeakerTime(motionId, time)}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-2">
                      {!isRunning ? (
                        <Button onClick={() => resumeMotionTimer(motionId)}>▶ Start</Button>
                      ) : (
                        <Button variant="secondary" onClick={() => pauseMotionTimer(motionId)}>
                          ⏸ Pause
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        onClick={() => yieldMotionTimeToChair(motionId)}
                      >
                        Yield to Chair
                      </Button>
                    </div>
                    {isLastSpeaker ? (
                      <Button onClick={() => nextMotionSpeaker(motionId)}>Complete Speaker</Button>
                    ) : (
                      <Button onClick={() => nextMotionSpeaker(motionId)}>Next Speaker →</Button>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            <div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">
                Waiting Queue ({speakers.length - currentSpeakerIndex - 1})
              </h3>
              {currentSpeakerIndex >= speakers.length - 1 ? (
                <Card>
                  <p className="py-8 text-center text-gray-500">No more speakers in queue</p>
                </Card>
              ) : (
                <div className="max-h-[400px] overflow-y-auto rounded-lg border border-gray-200">
                  {speakers.slice(currentSpeakerIndex + 1).map((speaker, index) => (
                    <div
                      key={speaker.id}
                      className="flex items-center justify-between border-b border-gray-200 p-4 last:border-b-0 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 text-lg font-bold text-gray-500">{index + 1}.</span>
                        <span className="text-lg text-gray-900">{speaker.name}</span>
                        <span className="text-sm text-gray-500">({speaker.speakingTime}s)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {phase === 'completed' && !showAddMoreSpeakers && (
          <Card variant="highlight">
            <div className="space-y-6 py-12 text-center">
              <div className="text-3xl font-bold text-success">✓ All Speakers Have Finished</div>
              <p className="text-lg text-gray-600">
                All {speakers.length} speaker(s) in this motion have completed their speaking time.
              </p>

              {timePool > 0 && (
                <div className="mx-auto max-w-xl rounded-lg border-2 border-blue-200 bg-blue-50 p-6">
                  <div className="space-y-3">
                    <div className="text-lg font-semibold text-gray-700">Time Pool Available</div>
                    <div className="text-4xl font-bold text-primary">{formatTime(timePool)}</div>
                    <div className="text-sm text-gray-600">
                      You can add approximately{' '}
                      <span className="font-bold text-primary">{possibleSpeakers}</span> more
                      speaker(s) based on {speakingTime}s each.
                    </div>
                    <div className="pt-4">
                      <Button onClick={() => setShowAddMoreSpeakers(true)} size="lg">
                        Add More Speakers from Time Pool
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <p className="font-semibold text-gray-700">
                Click Finish Motion to sync the final official result to the room.
              </p>
              <div className="flex justify-center gap-4">
                <Button onClick={() => void handleFinishMotion()} size="lg">
                  Finish Motion
                </Button>
                <Button variant="secondary" onClick={handleReset}>
                  Reset Motion
                </Button>
              </div>
            </div>
          </Card>
        )}

        {phase === 'completed' && showAddMoreSpeakers && (
          <div className="space-y-6">
            <Card variant="highlight">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-sm text-gray-600">Time Pool Available</p>
                  <p className="text-3xl font-bold text-primary">{formatTime(timePool)}</p>
                </div>
                <div className="text-right">
                  <p className="mb-1 text-sm text-gray-600">Can add</p>
                  <p className="text-2xl font-bold text-gray-900">~{possibleSpeakers} speakers</p>
                </div>
              </div>
            </Card>

            <div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">
                Add Speakers from Time Pool
              </h3>
              <Card>
                <div className="space-y-4">
                  <SearchInput
                    ref={inputRef}
                    placeholder="Type delegate name and press Enter"
                    suggestions={presentDelegates}
                    onSelect={(name) => handleAddSpeakerFromPool(name, speakingTime)}
                    value={inputValue}
                    onChange={setInputValue}
                    clearOnSelect={true}
                  />
                  <p className="text-sm text-gray-500">
                    Each speaker will use {speakingTime}s from the time pool. Add speakers, then
                    continue the motion locally.
                  </p>
                </div>
              </Card>
            </div>

            <div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">All Speakers ({speakers.length})</h3>
              <Card>
                <div className="space-y-2">
                  {speakers.map((speaker, index) => (
                    <div
                      key={speaker.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 text-lg font-bold text-gray-500">{index + 1}.</span>
                        <span className="text-lg text-gray-900">{speaker.name}</span>
                        <span className="text-sm text-gray-500">({speaker.speakingTime}s)</span>
                        {index < currentSpeakerIndex + 1 && (
                          <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">
                            Completed
                          </span>
                        )}
                      </div>
                      {index > currentSpeakerIndex && (
                        <button
                          onClick={() => removeSpeakerFromMotion(motionId, speaker.id)}
                          className="flex h-8 w-8 items-center justify-center rounded text-gray-400 transition-colors hover:bg-error-light hover:text-error"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setShowAddMoreSpeakers(false)}>
                ← Back
              </Button>
              <div className="flex gap-3">
                <Button onClick={() => continueMotionWithTimePool(motionId)} size="lg">
                  Continue Speaking →
                </Button>
                <Button onClick={() => void handleFinishMotion()}>Finish Motion</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
