import React, { useState } from 'react';
import { useMeetingStore } from '../store/useMeetingStore';
import { CollaborationSettingsSection } from './settings/CollaborationSettingsSection';
import { playBeep } from '../utils/audio';
import { downloadMeetingRecord } from '../utils/exportMeeting';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const fontSize = useMeetingStore((state) => state.fontSize);
  const setFontSize = useMeetingStore((state) => state.setFontSize);
  const volume = useMeetingStore((state) => state.volume);
  const setVolume = useMeetingStore((state) => state.setVolume);
  const isMuted = useMeetingStore((state) => state.isMuted);
  const soundAlerts = useMeetingStore((state) => state.soundAlerts);
  const setSoundAlerts = useMeetingStore((state) => state.setSoundAlerts);
  const resetMeeting = useMeetingStore((state) => state.resetMeeting);
  const meetingState = useMeetingStore((state) => state);

  const [customTime, setCustomTime] = useState<string>('');

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const handleTestSound = () => {
    if (!isMuted) {
      playBeep(volume, 1200, 0.2);
    }
  };

  const toggleSoundAlert = (seconds: number) => {
    if (soundAlerts.includes(seconds)) {
      setSoundAlerts(soundAlerts.filter(s => s !== seconds));
    } else {
      setSoundAlerts([...soundAlerts, seconds].sort((a, b) => b - a));
    }
  };

  const addCustomTime = () => {
    const seconds = parseInt(customTime);
    if (isNaN(seconds) || seconds < 0) {
      alert('Please enter a valid number of seconds (0 or greater)');
      return;
    }
    if (soundAlerts.includes(seconds)) {
      alert(`${seconds} seconds is already in the list`);
      return;
    }
    setSoundAlerts([...soundAlerts, seconds].sort((a, b) => b - a));
    setCustomTime('');
  };

  const removeCustomAlert = (seconds: number) => {
    setSoundAlerts(soundAlerts.filter(s => s !== seconds));
  };

  const presetOptions = [30, 15, 10, 0];
  const customAlerts = soundAlerts.filter(s => !presetOptions.includes(s));

  const handleExport = () => {
    try {
      downloadMeetingRecord(meetingState);
      alert('Meeting record exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export meeting record. Please try again.');
    }
  };

  const handleResetMeeting = () => {
    if (window.confirm('Are you sure you want to exit and reset the meeting? All data will be cleared.')) {
      resetMeeting();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <CollaborationSettingsSection isOpen={isOpen} />

        {/* Font Size Setting */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Font Size
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setFontSize('small')}
              className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                fontSize === 'small'
                  ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              Small
            </button>
            <button
              onClick={() => setFontSize('medium')}
              className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                fontSize === 'medium'
                  ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              Medium
            </button>
            <button
              onClick={() => setFontSize('large')}
              className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                fontSize === 'large'
                  ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              Large
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Adjust the font size for better readability
          </p>
        </div>

        {/* Volume Setting */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-semibold text-gray-700">
              Alert Volume
            </label>
            <span className="text-sm font-semibold text-blue-600">
              {Math.round(volume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between mt-2">
            <button
              onClick={handleTestSound}
              className="text-sm px-4 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
              disabled={isMuted}
            >
              Test Sound
            </button>
            <p className="text-xs text-gray-500 self-center">
              {isMuted ? 'Sound is muted' : 'Drag to adjust'}
            </p>
          </div>
        </div>

        {/* Sound Alert Time Points */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Sound Alert Time Points
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Choose when to hear alerts during speaking timers
          </p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { value: 30, label: '30 seconds' },
              { value: 15, label: '15 seconds' },
              { value: 10, label: '10 seconds' },
              { value: 0, label: 'Time up' },
            ].map((option) => (
              <label
                key={option.value}
                className={`flex items-center gap-2 p-2.5 border-2 rounded-lg cursor-pointer transition-all ${
                  soundAlerts.includes(option.value)
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={soundAlerts.includes(option.value)}
                  onChange={() => toggleSoundAlert(option.value)}
                  className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>

          {/* Custom Time Input */}
          <div className="border-t border-gray-200 pt-3">
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Add Custom Alert Time
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomTime();
                  }
                }}
                placeholder="Enter seconds"
                className="flex-1 px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={addCustomTime}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Custom Alerts List */}
          {customAlerts.length > 0 && (
            <div className="mt-3">
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Custom Alerts:
              </label>
              <div className="flex flex-wrap gap-2">
                {customAlerts.map((seconds) => (
                  <div
                    key={seconds}
                    className="flex items-center gap-2 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg"
                  >
                    <span className="text-sm font-medium">{seconds}s</span>
                    <button
                      type="button"
                      onClick={() => removeCustomAlert(seconds)}
                      className="text-blue-700 hover:text-blue-900"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-6"></div>

        {/* Meeting Control */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Meeting Control
          </label>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="w-full py-3 px-4 mb-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export Meeting Record
          </button>
          <p className="mb-4 text-xs text-gray-500">
            Download a text file with complete meeting records
          </p>

          {/* Reset Button */}
          <button
            onClick={handleResetMeeting}
            className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
          >
            Exit and Reset Meeting
          </button>
          <p className="mt-2 text-xs text-gray-500">
            This will clear all meeting data and return to setup
          </p>
        </div>
      </div>
    </div>
  );
};
