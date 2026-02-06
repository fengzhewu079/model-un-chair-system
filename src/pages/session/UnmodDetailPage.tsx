import React, { useState, useEffect, useRef } from 'react';
import { useMeetingStore } from '../../store/useMeetingStore';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { playWarningBeeps, playCompletionSound } from '../../utils/audio';

interface UnmodDetailPageProps {
  motionId: string;
  onBack: () => void;
}

export const UnmodDetailPage: React.FC<UnmodDetailPageProps> = ({ motionId, onBack }) => {
  const motion = useMeetingStore((state) => state.motions.find(m => m.id === motionId));
  const completeMotionExecution = useMeetingStore((state) => state.completeMotionExecution);
  const isMuted = useMeetingStore((state) => state.isMuted);
  const soundAlerts = useMeetingStore((state) => state.soundAlerts);
  const volume = useMeetingStore((state) => state.volume);

  const [remainingTime, setRemainingTime] = useState<number>(motion?.parameters.totalTime || 0);
  const [isRunning, setIsRunning] = useState(false);
  const playedAlertsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!motion) return;
    setRemainingTime(motion.parameters.totalTime || 0);
    playedAlertsRef.current.clear();
  }, [motion]);

  useEffect(() => {
    if (!isRunning || remainingTime <= 0) return;

    const timer = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, remainingTime]);

  // Play sound alerts based on settings
  useEffect(() => {
    if (!isRunning || isMuted) return;

    // Check if we should play an alert for current time
    if (soundAlerts.includes(remainingTime) && !playedAlertsRef.current.has(remainingTime)) {
      if (remainingTime === 0) {
        playCompletionSound(volume);
      } else {
        playWarningBeeps(volume);
      }
      playedAlertsRef.current.add(remainingTime);
    }
  }, [remainingTime, isRunning, isMuted, soundAlerts, volume]);

  if (!motion) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card>
          <p className="text-center text-gray-500 py-8">Motion not found</p>
          <div className="flex justify-center mt-4">
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

  const handleStart = () => setIsRunning(true);
  const handlePause = () => setIsRunning(false);

  const handleFinish = () => {
    completeMotionExecution(motionId);
    onBack();
  };

  const isCompleted = remainingTime === 0;

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
              <h1 className="text-2xl font-bold text-gray-900">Unmoderated Caucus</h1>
              <p className="text-gray-600 mt-1">
                Total Time: {Math.floor((motion.parameters.totalTime || 0) / 60)} minutes
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {!isCompleted ? (
          <Card variant="highlight">
            <div className="text-center py-12 space-y-6">
              {/* Timer Display */}
              <div className="text-8xl font-bold text-gray-900 font-mono">
                {formatTime(remainingTime)}
              </div>

              {/* Status */}
              <div className="text-xl text-gray-600">
                {isRunning ? 'Running...' : 'Paused'}
              </div>

              {/* Control Buttons */}
              <div className="flex justify-center gap-4">
                {!isRunning ? (
                  <Button onClick={handleStart} size="lg">
                    ▶ Start
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={handlePause} size="lg">
                    ⏸ Pause
                  </Button>
                )}
                <Button variant="secondary" onClick={handleFinish} size="lg">
                  Finish Early
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card variant="highlight">
            <div className="text-center py-12 space-y-6">
              <div className="text-3xl font-bold text-success">
                ✓ Time's Up!
              </div>
              <p className="text-gray-600 text-lg">
                The unmoderated caucus has ended.
              </p>
              <p className="text-gray-700 font-semibold">
                Click "Finish Motion" to complete this motion and move it to the status bar.
              </p>
              <div className="flex justify-center gap-4">
                <Button onClick={handleFinish} size="lg">
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
