import React, { useState } from 'react';
import { useMeetingStore } from '../../store/useMeetingStore';
import { Textarea, Input } from '../../components/Input';
import { Button } from '../../components/Button';

export const DelegatesStep: React.FC = () => {
  const delegates = useMeetingStore((state) => state.rollCall.delegates);
  const role = useMeetingStore((state) => state.role);
  const addDelegate = useMeetingStore((state) => state.addDelegate);
  const removeDelegate = useMeetingStore((state) => state.removeDelegate);
  const bulkAddDelegates = useMeetingStore((state) => state.bulkAddDelegates);
  const setCurrentStep = useMeetingStore((state) => state.setCurrentStep);

  const [bulkInput, setBulkInput] = useState('');
  const [singleInput, setSingleInput] = useState('');

  const handleBulkAdd = () => {
    // Split by newlines, commas, semicolons, or multiple spaces
    const names = bulkInput
      .split(/[\n,;]+|\s{2,}/)
      .map(n => n.trim())
      .filter(n => n);
    if (names.length > 0) {
      bulkAddDelegates(names);
      setBulkInput('');
    }
  };

  const handleSingleAdd = () => {
    if (singleInput.trim()) {
      addDelegate(singleInput.trim());
      setSingleInput('');
    }
  };

  const handleNext = () => {
    setCurrentStep('roll_call');
  };

  if (role === 'chair') {
    return (
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-gray-900">Waiting for Host Setup</h3>

        <p className="text-base text-gray-700">
          Delegates are managed by the host. This page will update automatically when setup is
          complete.
        </p>

        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          {delegates.length > 0
            ? `${delegates.length} delegate${delegates.length === 1 ? '' : 's'} have been added by the host.`
            : 'No delegates have been shared by the host yet.'}
        </div>

        <div className="flex justify-start pt-4">
          <Button variant="secondary" onClick={() => setCurrentStep('meeting_info')}>
            ← Back to Preferences
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-gray-900">Add Delegates</h3>

      <p className="text-base text-gray-700">
        You can paste a list (separated by commas, semicolons, or new lines) or add individually.
      </p>

      {/* Bulk Input */}
      <div>
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 text-sm font-bold text-amber-900">
              ?
            </div>
            <div className="space-y-1 text-sm text-amber-900">
              <p className="font-semibold">Bulk input tip</p>
              <p>
                Separate delegates with commas, semicolons, line breaks, or two or more spaces.
              </p>
              <p>
                After pasting, click anywhere outside the box to confirm and move the names into
                the list below.
              </p>
            </div>
          </div>
        </div>
        <Textarea
          label="Bulk Input"
          value={bulkInput}
          onChange={(e) => setBulkInput(e.target.value)}
          placeholder="United States of America, China, Russian Federation, United Kingdom, France..."
          onBlur={handleBulkAdd}
        />
      </div>

      {/* Single Add */}
      <div>
        <p className="text-base font-semibold text-gray-700 mb-2">
          Or add one by one:
        </p>
        <div className="flex gap-2">
          <Input
            value={singleInput}
            onChange={(e) => setSingleInput(e.target.value)}
            placeholder="Enter delegate name"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSingleAdd();
              }
            }}
          />
          <Button onClick={handleSingleAdd} className="whitespace-nowrap">
            Add Delegate
          </Button>
        </div>
      </div>

      {/* Delegates List */}
      <div>
        <p className="text-lg font-bold text-gray-900 mb-2">
          Delegates Added ({delegates.length})
        </p>
        {delegates.length === 0 ? (
          <p className="text-base text-gray-500 text-center py-8">
            No delegates added yet
          </p>
        ) : (
          <div className="border border-gray-200 rounded-lg max-h-[300px] overflow-y-auto">
            {delegates.map((delegate, index) => (
              <div
                key={delegate.id}
                className="flex items-center justify-between p-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50"
              >
                <span className="text-base text-gray-900">
                  {index + 1}. {delegate.name}
                </span>
                <button
                  onClick={() => removeDelegate(delegate.id)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-error hover:bg-error-light rounded transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="secondary" onClick={() => setCurrentStep('meeting_info')}>
          ← Back
        </Button>
        <Button onClick={handleNext}>Next →</Button>
      </div>
    </div>
  );
};
