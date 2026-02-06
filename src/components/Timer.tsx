import React, { useEffect, useRef, useState } from 'react';
import { useMeetingStore } from '../store/useMeetingStore';
import { playWarningBeeps, playCompletionSound } from '../utils/audio';

interface TimerProps {
  size?: 'small' | 'medium' | 'large';
  initialTime: number; // in seconds
  isRunning?: boolean;
  onTimeUp?: () => void;
  onPause?: () => void;
  onResume?: () => void;
}

export const Timer: React.FC<TimerProps> = ({
  size = 'large',
  initialTime,
  isRunning = false,
  onTimeUp,
}) => {
  const [time, setTime] = useState(initialTime);
  const playedAlertsRef = useRef<Set<number>>(new Set());
  const isMuted = useMeetingStore((state) => state.isMuted);
  const soundAlerts = useMeetingStore((state) => state.soundAlerts);
  const volume = useMeetingStore((state) => state.volume);

  // Reset time when initialTime changes
  useEffect(() => {
    setTime(initialTime);
    playedAlertsRef.current.clear();
  }, [initialTime]);

  // Countdown timer
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTime((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  // Play alerts based on settings
  useEffect(() => {
    if (!isRunning || isMuted) return;

    // Check if we should play an alert for current time
    if (soundAlerts.includes(time) && !playedAlertsRef.current.has(time)) {
      if (time === 0) {
        playCompletionSound(volume);
      } else {
        playWarningBeeps(volume);
      }
      playedAlertsRef.current.add(time);
    }

    // Call onTimeUp when time reaches 0
    if (time === 0 && onTimeUp) {
      onTimeUp();
    }
  }, [time, isRunning, isMuted, soundAlerts, volume, onTimeUp]);

  const sizeStyles = {
    small: 'text-2xl',
    medium: 'text-4xl',
    large: 'text-7xl',
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    const sign = seconds < 0 ? '-' : '';
    return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isOvertime = time < 0;

  return (
    <div
      className={`timer-display font-bold ${sizeStyles[size]} ${
        isOvertime ? 'text-error' : 'text-gray-900'
      } text-center`}
    >
      {formatTime(time)}
    </div>
  );
};
