import React, { useState, useEffect } from 'react';
import { useMeetingStore } from '../../store/useMeetingStore';
import { MeetingStatus } from '../../types';
import { SettingsModal } from '../../components/SettingsModal';
import { NotesWindow } from '../../components/NotesWindow';
import { CountdownModal } from '../../components/CountdownModal';
import { Tooltip } from '../../components/Tooltip';
import { initAudioContext, playBeep } from '../../utils/audio';

const stateLabels: Record<MeetingStatus, string> = {
  setup: 'Setup',
  roll_call: 'Roll Call',
  GSL: 'General Speakers List',
  Moderated: 'Moderated Caucus',
  Unmoderated: 'Unmoderated Caucus',
  Voting: 'Voting in Progress',
  Suspension: 'Meeting Suspended',
};

const stateColors: Record<MeetingStatus, string> = {
  setup: 'bg-gray-500',
  roll_call: 'bg-gray-500',
  GSL: 'bg-state-gsl',
  Moderated: 'bg-state-moderated',
  Unmoderated: 'bg-state-unmoderated',
  Voting: 'bg-state-voting',
  Suspension: 'bg-state-suspension',
};

export const HeaderBar: React.FC = () => {
  const name = useMeetingStore((state) => state.name);
  const committeeName = useMeetingStore((state) => state.committeeName);
  const chairName = useMeetingStore((state) => state.chairName);
  const meetingState = useMeetingStore((state) => state.meetingState);
  const isMuted = useMeetingStore((state) => state.isMuted);
  const toggleMute = useMeetingStore((state) => state.toggleMute);
  const volume = useMeetingStore((state) => state.volume);

  const [showSettings, setShowSettings] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);

  // Initialize audio context on mount
  useEffect(() => {
    initAudioContext();
  }, []);

  const handleToggleMute = () => {
    // Initialize audio context on first interaction
    initAudioContext();
    toggleMute();
    // Play test sound when unmuting
    if (isMuted) {
      setTimeout(() => playBeep(volume, 1200, 0.2), 100);
    }
  };

  const handleSettings = () => {
    setShowSettings(true);
  };

  const handleNotes = () => {
    setShowNotes(true);
  };

  const handleCountdown = () => {
    setShowCountdown(true);
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Meeting Info */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">{name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
            <span>{committeeName}</span>
            <span className="text-gray-400">•</span>
            <span>Chair: {chairName}</span>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-3">
          {/* Countdown Timer Button */}
          <Tooltip content="Countdown Timer" position="bottom">
            <button
              onClick={handleCountdown}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <svg
                className="w-5 h-5 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          </Tooltip>

          {/* Notes Button */}
          <Tooltip content="Notes" position="bottom">
            <button
              onClick={handleNotes}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <svg
                className="w-5 h-5 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          </Tooltip>

          {/* Mute Toggle */}
          <Tooltip content={isMuted ? 'Enable Sound' : 'Mute Sound'} position="bottom">
            <button
              onClick={handleToggleMute}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              {isMuted ? (
                <svg
                  className="w-5 h-5 text-gray-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-gray-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                </svg>
              )}
            </button>
          </Tooltip>

          {/* Settings Button */}
          <Tooltip content="Settings" position="bottom">
            <button
              onClick={handleSettings}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <svg
                className="w-5 h-5 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Countdown Modal */}
      <CountdownModal isOpen={showCountdown} onClose={() => setShowCountdown(false)} />

      {/* Notes Window */}
      <NotesWindow isOpen={showNotes} onClose={() => setShowNotes(false)} />
    </div>
  );
};
