import React, { useState } from 'react';
import { useMeetingStore } from '../../store/useMeetingStore';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';

export const MeetingInfoStep: React.FC = () => {
  const meetingName = useMeetingStore((state) => state.name);
  const chairName = useMeetingStore((state) => state.chairName);
  const committeeName = useMeetingStore((state) => state.committeeName);
  const soundAlerts = useMeetingStore((state) => state.soundAlerts);

  const setMeetingName = useMeetingStore((state) => state.setMeetingName);
  const setChairName = useMeetingStore((state) => state.setChairName);
  const setCommitteeName = useMeetingStore((state) => state.setCommitteeName);
  const setSoundAlerts = useMeetingStore((state) => state.setSoundAlerts);
  const setCurrentStep = useMeetingStore((state) => state.setCurrentStep);

  const [errors, setErrors] = useState<{ name?: string; chair?: string; committee?: string }>({});
  const [customTime, setCustomTime] = useState<string>('');

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

  const handleNext = () => {
    const newErrors: { name?: string; chair?: string; committee?: string } = {};

    if (!meetingName.trim()) {
      newErrors.name = 'Meeting name is required';
    }

    if (!chairName.trim()) {
      newErrors.chair = 'Chair name is required';
    }

    if (!committeeName.trim()) {
      newErrors.committee = 'Committee name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setCurrentStep('delegates');
  };

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-gray-900">Meeting Information</h3>

      <Input
        label="Meeting Name *"
        value={meetingName}
        onChange={(e) => setMeetingName(e.target.value)}
        error={errors.name}
        placeholder="e.g., Spring Conference 2024"
      />

      <Input
        label="Committee Name *"
        value={committeeName}
        onChange={(e) => setCommitteeName(e.target.value)}
        error={errors.committee}
        placeholder="e.g., United Nations Security Council"
      />

      <Input
        label="Chair Name *"
        value={chairName}
        onChange={(e) => setChairName(e.target.value)}
        error={errors.chair}
        placeholder="e.g., John Smith"
      />

      {/* Sound Alert Settings */}
      <div>
        <label className="block text-base font-semibold text-gray-700 mb-3">
          Sound Alerts (Timer Warnings)
        </label>
        <p className="text-sm text-gray-600 mb-3">
          Select when you want to hear sound alerts during timers:
        </p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { value: 30, label: '30 seconds' },
            { value: 15, label: '15 seconds' },
            { value: 10, label: '10 seconds' },
            { value: 0, label: 'Time up' },
          ].map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary transition-colors"
            >
              <input
                type="checkbox"
                checked={soundAlerts.includes(option.value)}
                onChange={() => toggleSoundAlert(option.value)}
                className="w-5 h-5 text-primary focus:ring-2 focus:ring-primary"
              />
              <span className="text-base text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>

        {/* Custom Time Input */}
        <div className="border-t border-gray-200 pt-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
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
              placeholder="Enter seconds (e.g., 20)"
              className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={addCustomTime}
              className="px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* Custom Alerts List */}
        {customAlerts.length > 0 && (
          <div className="mt-3">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Custom Alerts:
            </label>
            <div className="flex flex-wrap gap-2">
              {customAlerts.map((seconds) => (
                <div
                  key={seconds}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg"
                >
                  <span className="text-sm font-medium">{seconds}s</span>
                  <button
                    type="button"
                    onClick={() => removeCustomAlert(seconds)}
                    className="text-blue-700 hover:text-blue-900"
                  >
                    <svg
                      className="w-4 h-4"
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

      <div className="flex justify-end pt-4">
        <Button onClick={handleNext}>Next →</Button>
      </div>
    </div>
  );
};
