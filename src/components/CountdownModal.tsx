import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { useMeetingStore } from '../store/useMeetingStore';
import { playWarningBeeps, playCompletionSound } from '../utils/audio';

interface CountdownModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CountdownModal: React.FC<CountdownModalProps> = ({ isOpen, onClose }) => {
  const isMuted = useMeetingStore((state) => state.isMuted);
  const soundAlerts = useMeetingStore((state) => state.soundAlerts);
  const volume = useMeetingStore((state) => state.volume);
  const [minutes, setMinutes] = useState<string>('5');
  const [seconds, setSeconds] = useState<string>('0');
  const [totalSeconds, setTotalSeconds] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isRunning, setIsRunning] = useState(false);
  const playedAlertsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!isRunning || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, remainingSeconds]);

  // Play sound alerts based on settings
  useEffect(() => {
    if (!isRunning || isMuted) return;

    // Check if we should play an alert for current time
    if (soundAlerts.includes(remainingSeconds) && !playedAlertsRef.current.has(remainingSeconds)) {
      if (remainingSeconds === 0) {
        playCompletionSound(volume);
      } else {
        playWarningBeeps(volume);
      }
      playedAlertsRef.current.add(remainingSeconds);
    }
  }, [remainingSeconds, isRunning, isMuted, soundAlerts, volume]);

  const handleStart = () => {
    const mins = parseInt(minutes) || 0;
    const secs = parseInt(seconds) || 0;
    const total = mins * 60 + secs;

    if (total > 0) {
      setTotalSeconds(total);
      setRemainingSeconds(total);
      setIsRunning(true);
      playedAlertsRef.current.clear();
    }
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleResume = () => {
    if (remainingSeconds > 0) {
      setIsRunning(true);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setRemainingSeconds(totalSeconds);
    playedAlertsRef.current.clear();
  };

  const handleClear = () => {
    setIsRunning(false);
    setRemainingSeconds(0);
    setTotalSeconds(0);
    setMinutes('5');
    setSeconds('0');
    playedAlertsRef.current.clear();
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isTimerSet = totalSeconds > 0;
  const isCompleted = isTimerSet && remainingSeconds === 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Countdown Timer</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {!isTimerSet ? (
            /* Setup View */
            <>
              <div className="space-y-6">
                <p className="text-base text-gray-600">Set your countdown time:</p>
                <div className="flex items-center justify-center gap-6">
                  <div className="flex-1">
                    <label className="block text-base font-semibold text-gray-700 mb-3">
                      Minutes
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value)}
                      className="w-full h-16 px-4 text-3xl font-bold text-center border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <span className="text-4xl font-bold text-gray-400 mt-10">:</span>
                  <div className="flex-1">
                    <label className="block text-base font-semibold text-gray-700 mb-3">
                      Seconds
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={seconds}
                      onChange={(e) => setSeconds(e.target.value)}
                      className="w-full h-16 px-4 text-3xl font-bold text-center border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button onClick={handleStart} className="w-full" size="lg">
                  Start Timer
                </Button>
              </div>
            </>
          ) : (
            /* Timer View */
            <div className="space-y-8">
              {/* Timer Display */}
              <div className="text-center py-6">
                <div
                  className={`text-8xl font-bold font-mono ${
                    isCompleted
                      ? 'text-error'
                      : remainingSeconds <= 10
                      ? 'text-warning'
                      : 'text-gray-900'
                  }`}
                >
                  {formatTime(remainingSeconds)}
                </div>
                {isCompleted && (
                  <div className="text-2xl font-semibold text-error mt-6">
                    ⏰ Time's Up!
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    isCompleted
                      ? 'bg-error'
                      : remainingSeconds <= 10
                      ? 'bg-warning'
                      : 'bg-primary'
                  }`}
                  style={{
                    width: `${(remainingSeconds / totalSeconds) * 100}%`,
                  }}
                />
              </div>

              {/* Controls */}
              <div className="flex flex-col gap-3">
                <div className="flex gap-3">
                  {!isRunning && !isCompleted ? (
                    <Button onClick={handleResume} className="flex-1" size="lg">
                      ▶ Resume
                    </Button>
                  ) : !isCompleted ? (
                    <Button onClick={handlePause} variant="secondary" className="flex-1" size="lg">
                      ⏸ Pause
                    </Button>
                  ) : null}

                  {!isCompleted && (
                    <Button onClick={handleReset} variant="secondary" className="flex-1" size="lg">
                      Reset
                    </Button>
                  )}
                </div>

                <Button onClick={handleClear} variant="secondary" className="w-full" size="lg">
                  {isCompleted ? 'Close' : 'New Timer'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
