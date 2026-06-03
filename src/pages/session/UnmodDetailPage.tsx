import React, { useEffect, useRef, useState } from 'react';
import { useMeetingStore } from '../../store/useMeetingStore';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { playCompletionSound, playWarningBeeps } from '../../utils/audio';
import { findMotionById } from '../../utils/motionCollaboration';

interface UnmodDetailPageProps {
  motionId: string;
  onBack: () => void;
}

export const UnmodDetailPage: React.FC<UnmodDetailPageProps> = ({ motionId, onBack }) => {
  const motion = useMeetingStore((state) =>
    findMotionById(state.motions, state.motionGroups, motionId).motion
  );
  const beginMotionProcessing = useMeetingStore((state) => state.beginMotionProcessing);
  const releaseMotionProcessing = useMeetingStore((state) => state.releaseMotionProcessing);
  const finishMotionProcessing = useMeetingStore((state) => state.finishMotionProcessing);
  const motionProcessingError = useMeetingStore((state) => state.motionProcessingError);
  const motionProcessingState = useMeetingStore((state) => state.motionProcessingState);
  const clearMotionProcessingError = useMeetingStore(
    (state) => state.clearMotionProcessingError
  );
  const isMuted = useMeetingStore((state) => state.isMuted);
  const soundAlerts = useMeetingStore((state) => state.soundAlerts);
  const volume = useMeetingStore((state) => state.volume);

  const [claimReady, setClaimReady] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number>(motion?.parameters.totalTime || 0);
  const [isRunning, setIsRunning] = useState(false);
  const exitHandledRef = useRef(false);
  const playedAlertsRef = useRef<Set<number>>(new Set());
  const isBlocked = !claimReady && motionProcessingState !== 'claiming';

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

  useEffect(() => {
    if (!motion) return;
    setRemainingTime(motion.parameters.totalTime || 0);
    setIsRunning(false);
    playedAlertsRef.current.clear();
  }, [motion]);

  useEffect(() => {
    if (!claimReady) return;
    if (!isRunning || remainingTime <= 0) return;

    const timer = window.setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [claimReady, isRunning, remainingTime]);

  useEffect(() => {
    if (!claimReady || !isRunning || isMuted) return;

    if (soundAlerts.includes(remainingTime) && !playedAlertsRef.current.has(remainingTime)) {
      if (remainingTime === 0) {
        playCompletionSound(volume);
      } else {
        playWarningBeeps(volume);
      }
      playedAlertsRef.current.add(remainingTime);
    }
  }, [claimReady, isMuted, isRunning, remainingTime, soundAlerts, volume]);

  if (!motion) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card>
          <p className="text-center text-gray-500 py-8">Motion not found</p>
          <div className="mt-4 flex justify-center">
            <Button onClick={onBack}>← Back</Button>
          </div>
        </Card>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBack = async () => {
    exitHandledRef.current = true;
    await releaseMotionProcessing({ motionId, silent: true });
    onBack();
  };

  const handleFinish = async () => {
    const success = await finishMotionProcessing(motionId);
    if (success) {
      exitHandledRef.current = true;
      onBack();
    }
  };

  const isCompleted = remainingTime === 0;
  const isClaiming = motionProcessingState === 'claiming' && !claimReady;

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
              <h1 className="text-2xl font-bold text-gray-900">Unmoderated Caucus</h1>
              <p className="mt-1 text-gray-600">
                Total Time: {Math.floor((motion.parameters.totalTime || 0) / 60)} minutes
              </p>
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
            Other members only receive the completed group result after Finish Motion.
          </p>
        </Card>

        {motionProcessingError && (
          <Card variant="warning" className="p-4">
            <p className="text-sm text-amber-900">{motionProcessingError}</p>
          </Card>
        )}

        {!isCompleted ? (
          <Card variant="highlight">
            <div className="space-y-6 py-12 text-center">
              <div className="font-mono text-8xl font-bold text-gray-900">
                {formatTime(remainingTime)}
              </div>
              <div className="text-xl text-gray-600">{isRunning ? 'Running...' : 'Paused'}</div>
              <div className="flex justify-center gap-4">
                {!isRunning ? (
                  <Button onClick={() => setIsRunning(true)} size="lg">
                    ▶ Start
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => setIsRunning(false)} size="lg">
                    ⏸ Pause
                  </Button>
                )}
                <Button variant="secondary" onClick={() => void handleFinish()} size="lg">
                  Finish Early
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card variant="highlight">
            <div className="space-y-6 py-12 text-center">
              <div className="text-3xl font-bold text-success">✓ Time&apos;s Up!</div>
              <p className="text-lg text-gray-600">
                The unmoderated caucus has ended.
              </p>
              <p className="font-semibold text-gray-700">
                Click Finish Motion to sync the final official result to the room.
              </p>
              <div className="flex justify-center gap-4">
                <Button onClick={() => void handleFinish()} size="lg">
                  Finish Motion
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
