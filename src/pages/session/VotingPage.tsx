import React, { useEffect, useState } from 'react';
import { useMeetingStore } from '../../store/useMeetingStore';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { MotionProcessingBadge } from '../../components/session/MotionProcessingBadge';
import type { Motion, MotionType } from '../../types';

const motionTypeLabels: Record<MotionType, string> = {
  moderated_caucus: 'Moderated Caucus',
  unmoderated_caucus: 'Unmoderated Caucus',
  speaker_list: 'Speaker List',
  extend_moderated: 'Extend Moderated Caucus',
  extend_unmoderated: 'Extend Unmoderated Caucus',
  close_debate: 'Close Debate',
  resume_debate: 'Resume Debate',
  adjourn_meeting: 'Adjourn Meeting',
};

type VoteInputField = 'for' | 'abstain';

interface MotionVoteInputs {
  for: string;
  abstain: string;
}

interface DerivedVoteState {
  normalizedFor: number | null;
  normalizedAbstain: number;
  autoCalculatedAgainst: number | null;
  isInputStarted: boolean;
  isInputValid: boolean;
  validationMessage: string | null;
  predictedResult: 'pass' | 'fail' | null;
}

interface VotingPageProps {
  groupId: string;
  onBack: () => void;
}

const createEmptyVoteInputs = (): MotionVoteInputs => ({
  for: '',
  abstain: '',
});

const parseVoteCountInput = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return { value: null as number | null, isValid: true };
  }

  if (!/^\d+$/.test(trimmedValue)) {
    return { value: null as number | null, isValid: false };
  }

  return {
    value: Number(trimmedValue),
    isValid: true,
  };
};

const buildDerivedVoteState = (
  inputs: MotionVoteInputs | undefined,
  votingBase: number,
  simpleMajority: number
): DerivedVoteState => {
  const safeInputs = inputs ?? createEmptyVoteInputs();
  const parsedFor = parseVoteCountInput(safeInputs.for);
  const parsedAbstain = parseVoteCountInput(safeInputs.abstain);
  const isInputStarted = safeInputs.for.trim() !== '';

  if (!parsedFor.isValid || !parsedAbstain.isValid) {
    return {
      normalizedFor: parsedFor.value,
      normalizedAbstain: parsedAbstain.value ?? 0,
      autoCalculatedAgainst: null,
      isInputStarted,
      isInputValid: false,
      validationMessage: 'Vote counts must be whole numbers.',
      predictedResult: null,
    };
  }

  if (!isInputStarted || parsedFor.value === null) {
    return {
      normalizedFor: null,
      normalizedAbstain: parsedAbstain.value ?? 0,
      autoCalculatedAgainst: null,
      isInputStarted: false,
      isInputValid: true,
      validationMessage: null,
      predictedResult: null,
    };
  }

  const normalizedFor = parsedFor.value;
  const normalizedAbstain = parsedAbstain.value ?? 0;

  if (normalizedFor > votingBase) {
    return {
      normalizedFor,
      normalizedAbstain,
      autoCalculatedAgainst: null,
      isInputStarted: true,
      isInputValid: false,
      validationMessage: 'For votes cannot exceed the voting base.',
      predictedResult: null,
    };
  }

  if (normalizedFor + normalizedAbstain > votingBase) {
    return {
      normalizedFor,
      normalizedAbstain,
      autoCalculatedAgainst: null,
      isInputStarted: true,
      isInputValid: false,
      validationMessage: 'For votes plus abstentions cannot exceed the voting base.',
      predictedResult: null,
    };
  }

  const autoCalculatedAgainst = votingBase - normalizedFor - normalizedAbstain;

  return {
    normalizedFor,
    normalizedAbstain,
    autoCalculatedAgainst,
    isInputStarted: true,
    isInputValid: true,
    validationMessage: null,
    predictedResult: normalizedFor >= simpleMajority ? 'pass' : 'fail',
  };
};

export const VotingPage: React.FC<VotingPageProps> = ({ groupId, onBack }) => {
  const rollCall = useMeetingStore((state) => state.rollCall);
  const motionGroups = useMeetingStore((state) => state.motionGroups);
  const motionProcessingError = useMeetingStore((state) => state.motionProcessingError);
  const submitMotionVoteResult = useMeetingStore((state) => state.submitMotionVoteResult);
  const createSpeakerListFallbackMotion = useMeetingStore(
    (state) => state.createSpeakerListFallbackMotion
  );

  const group = motionGroups.find((entry) => entry.id === groupId);
  const [votes, setVotes] = useState<Record<string, MotionVoteInputs>>({});
  const [submittingMotionId, setSubmittingMotionId] = useState<string | null>(null);
  const [showSpeakerListDialog, setShowSpeakerListDialog] = useState(false);
  const [timeInput, setTimeInput] = useState('');
  const [showTimeConfirmation, setShowTimeConfirmation] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [calculatedTime, setCalculatedTime] = useState<{
    totalMinutes: number;
    speakingSeconds: number;
    totalSpeakers: number;
  } | null>(null);

  useEffect(() => {
    if (!group) return;

    const initialVotes: Record<string, MotionVoteInputs> = {};
    group.motions.forEach((motion) => {
      initialVotes[motion.id] = motion.voteResult
        ? {
            for: String(motion.voteResult.for),
            abstain: String(motion.voteResult.abstain),
          }
        : createEmptyVoteInputs();
    });
    setVotes(initialVotes);
    setActionError(null);
  }, [group?.id]);

  useEffect(() => {
    if (!group) return;
    if (actionError) return;

    if (group.status === 'executing' || group.status === 'passed') {
      const timer = window.setTimeout(() => {
        onBack();
      }, 1200);
      return () => window.clearTimeout(timer);
    }

    if (
      group.status === 'failed' &&
      group.motions.every((motion) => motion.status === 'failed')
    ) {
      setShowSpeakerListDialog(true);
    }
  }, [actionError, group, onBack]);

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card>
          <p className="py-8 text-center text-gray-500">Motion group not found</p>
          <div className="mt-4 flex justify-center">
            <Button onClick={onBack}>← Back</Button>
          </div>
        </Card>
      </div>
    );
  }

  const votingBase = rollCall.presentCount + rollCall.presentAndVotingCount;
  const simpleMajority = Math.floor(votingBase / 2) + 1;
  const absoluteMajority = Math.ceil(votingBase * (2 / 3));
  const hasPassedMotion = group.motions.some((motion) => motion.status === 'passed');

  const handleVoteChange = (motionId: string, field: VoteInputField, value: string) => {
    setVotes((currentVotes) => ({
      ...currentVotes,
      [motionId]: {
        ...(currentVotes[motionId] ?? createEmptyVoteInputs()),
        [field]: value,
      },
    }));
    setActionError(null);
  };

  const handleConfirmMotion = async (
    motion: Motion,
    derivedVoteState: DerivedVoteState,
    resultOverride?: 'pass' | 'fail'
  ) => {
    if (!derivedVoteState.isInputValid) {
      return;
    }

    const hasVoteCounts =
      derivedVoteState.normalizedFor !== null &&
      derivedVoteState.autoCalculatedAgainst !== null &&
      derivedVoteState.predictedResult !== null;

    if (!hasVoteCounts && !resultOverride) {
      return;
    }

    const confirmedForVotes = hasVoteCounts ? derivedVoteState.normalizedFor ?? 0 : 0;
    const confirmedAgainstVotes = hasVoteCounts
      ? derivedVoteState.autoCalculatedAgainst ?? 0
      : 0;
    const confirmedAbstainVotes = hasVoteCounts ? derivedVoteState.normalizedAbstain : 0;

    const voteResult = {
      for: confirmedForVotes,
      against: confirmedAgainstVotes,
      abstain: confirmedAbstainVotes,
      total: confirmedForVotes + confirmedAgainstVotes + confirmedAbstainVotes,
      votingBase,
      result: resultOverride ?? derivedVoteState.predictedResult ?? 'fail',
      rule: 'Simple Majority',
      timestamp: new Date(),
    };

    setSubmittingMotionId(motion.id);
    setActionError(null);
    const success = await submitMotionVoteResult(groupId, motion.id, voteResult);
    setSubmittingMotionId(null);

    if (!success) {
      const latestState = useMeetingStore.getState();
      setActionError(
        latestState.motionProcessingError ||
          latestState.collaborationError ||
          'The official vote result was not saved. Please try again.'
      );
    }
  };

  const handleTimeInputKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleCalculateTime();
    }
  };

  const handleCalculateTime = () => {
    const parts = timeInput.split('/');
    if (parts.length !== 2) {
      window.alert('Please use format: minutes/seconds, e.g., 10/60');
      return;
    }

    const totalMinutes = Number(parts[0].trim());
    const speakingSeconds = Number(parts[1].trim());

    if (
      Number.isNaN(totalMinutes) ||
      Number.isNaN(speakingSeconds) ||
      totalMinutes <= 0 ||
      speakingSeconds <= 0
    ) {
      window.alert('Please enter valid numbers');
      return;
    }

    const totalSeconds = totalMinutes * 60;
    const totalSpeakers = Math.floor(totalSeconds / speakingSeconds);

    setCalculatedTime({
      totalMinutes,
      speakingSeconds,
      totalSpeakers,
    });
    setShowTimeConfirmation(true);
  };

  const handleConfirmSpeakerList = async () => {
    if (!calculatedTime) return;

    setActionError(null);
    const success = await createSpeakerListFallbackMotion({
      totalSpeakers: calculatedTime.totalSpeakers,
      speakingTime: calculatedTime.speakingSeconds,
    });

    if (!success) {
      const latestState = useMeetingStore.getState();
      setActionError(
        latestState.motionProcessingError ||
          latestState.collaborationError ||
          'The fallback speaker list was not saved. Please try again.'
      );
      return;
    }

    setShowSpeakerListDialog(false);
    setShowTimeConfirmation(false);
    setTimeInput('');
    setCalculatedTime(null);
    onBack();
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Voting Session</h1>
              <p className="mt-1 text-gray-600">Motion Group ({group.motions.length} motions)</p>
            </div>
            <Button variant="secondary" onClick={onBack}>
              Back to Session
            </Button>
          </div>
        </div>

        <div className="space-y-4 p-6">
          {motionProcessingError && (
            <Card variant="warning">
              <p className="text-sm text-amber-900">{motionProcessingError}</p>
            </Card>
          )}

          {actionError && (
            <Card variant="warning">
              <p className="text-sm text-amber-900">{actionError}</p>
            </Card>
          )}

          <Card>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="mb-2 text-sm font-semibold text-gray-700">Voting Requirements:</p>
              <div className="space-y-1 text-sm text-gray-700">
                <div>
                  <span className="font-semibold">Voting Base:</span> {votingBase}
                </div>
                <div>
                  <span className="font-semibold">Simple Majority:</span> {simpleMajority} votes
                  needed <span className="ml-1 text-gray-500">(&gt; 1/2)</span>
                </div>
                <div>
                  <span className="font-semibold">Absolute Majority:</span> {absoluteMajority}{' '}
                  votes needed <span className="ml-1 text-gray-500">(≥ 2/3)</span>
                </div>
              </div>
            </div>
          </Card>

          {hasPassedMotion && (
            <Card>
              <div className="rounded-lg border-2 border-success bg-green-50 p-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">✓</span>
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-success">Motion Passed!</p>
                    <p className="mt-1 text-sm text-gray-700">
                      This group has moved forward locally. Completed groups are shared in the
                      background. Returning to the session...
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {group.motions.map((motion, index) => {
            const vote = votes[motion.id] ?? createEmptyVoteInputs();
            const derivedVoteState = buildDerivedVoteState(vote, votingBase, simpleMajority);
            const isVoted = motion.status !== 'pending';
            const isSubmitting = submittingMotionId === motion.id;

            return (
              <Card key={motion.id}>
                <div className="space-y-4">
                  <div className="flex items-start justify-between border-b border-gray-200 pb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-500">{index + 1}.</span>
                        <span className="text-lg font-semibold text-gray-900">
                          {motionTypeLabels[motion.type]}
                        </span>
                        <MotionProcessingBadge motionId={motion.id} />
                        {isVoted && (
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              motion.status === 'passed'
                                ? 'bg-success-light text-success'
                                : 'bg-error-light text-error'
                            }`}
                          >
                            {motion.status === 'passed' ? 'Passed' : 'Failed'}
                          </span>
                        )}
                      </div>
                      {motion.proposer && (
                        <div className="ml-7 text-sm text-gray-600">by {motion.proposer}</div>
                      )}
                      {motion.parameters.topic && (
                        <div className="ml-7 mt-2 text-base font-medium text-gray-800">
                          Topic: {motion.parameters.topic}
                        </div>
                      )}
                      {motion.parameters.totalSpeakers && (
                        <div className="ml-7 mt-1 text-base font-medium text-gray-700">
                          {motion.parameters.totalSpeakers} speakers,{' '}
                          {motion.parameters.speakingTime}s each
                        </div>
                      )}
                      {motion.parameters.totalTime && (
                        <div className="ml-7 mt-1 text-base font-medium text-gray-700">
                          {Math.floor(motion.parameters.totalTime / 60)} minutes
                        </div>
                      )}
                    </div>
                  </div>

                  {!isVoted ? (
                    <>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-gray-700">
                            Voting Base: {votingBase}
                          </p>
                          <p className="text-sm text-gray-600">
                            Vote counts are optional. You can confirm Pass or Fail directly.
                          </p>
                          <p className="text-sm text-gray-600">Enter For votes first.</p>
                          <p className="text-sm text-gray-600">
                            Against will be calculated automatically from the remaining voting
                            members.
                          </p>
                          <p className="text-sm text-gray-600">Abstain is optional.</p>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-700">
                              For
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              inputMode="numeric"
                              value={vote.for}
                              onChange={(event) =>
                                handleVoteChange(motion.id, 'for', event.target.value)
                              }
                              placeholder="Optional"
                              className="h-12 w-full rounded-lg border border-gray-300 px-3 text-lg font-bold focus:border-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                              disabled={isSubmitting}
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-700">
                              Against (Auto)
                            </label>
                            <input
                              type="text"
                              value={
                                derivedVoteState.autoCalculatedAgainst === null
                                  ? ''
                                  : String(derivedVoteState.autoCalculatedAgainst)
                              }
                              placeholder="Auto"
                              readOnly
                              className="h-12 w-full rounded-lg border border-gray-200 bg-gray-100 px-3 text-lg font-bold text-gray-700 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-700">
                              Abstain
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              inputMode="numeric"
                              value={vote.abstain}
                              onChange={(event) =>
                                handleVoteChange(motion.id, 'abstain', event.target.value)
                              }
                              placeholder="Optional"
                              className="h-12 w-full rounded-lg border border-gray-300 px-3 text-lg font-bold focus:border-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>

                        {derivedVoteState.validationMessage && (
                          <p className="mt-4 text-sm font-semibold text-error">
                            {derivedVoteState.validationMessage}
                          </p>
                        )}

                        {derivedVoteState.isInputStarted && derivedVoteState.isInputValid && (
                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                              <p className="text-sm text-gray-600">Auto-calculated Against</p>
                              <p className="text-xl font-bold text-primary">
                                {derivedVoteState.autoCalculatedAgainst}
                              </p>
                            </div>
                            <div
                              className={`rounded-lg border p-3 ${
                                derivedVoteState.predictedResult === 'pass'
                                  ? 'border-green-200 bg-green-50'
                                  : 'border-red-200 bg-red-50'
                              }`}
                            >
                              <p className="text-sm text-gray-600">Current Result</p>
                              <p
                                className={`text-xl font-bold ${
                                  derivedVoteState.predictedResult === 'pass'
                                    ? 'text-success'
                                    : 'text-error'
                                }`}
                              >
                                {derivedVoteState.predictedResult === 'pass'
                                  ? 'Currently passes'
                                  : 'Currently fails'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 pt-2">
                        <p className="text-sm text-gray-600">
                          The auto result is shown above when counts are entered. You can also
                          confirm Pass or Fail directly without entering any numbers.
                        </p>
                        <div className="grid gap-3 md:grid-cols-2">
                          <Button
                            onClick={() =>
                              void handleConfirmMotion(motion, derivedVoteState, 'pass')
                            }
                            disabled={
                              isSubmitting || !derivedVoteState.isInputValid
                            }
                          >
                            {isSubmitting ? 'Saving...' : 'Pass'}
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() =>
                              void handleConfirmMotion(motion, derivedVoteState, 'fail')
                            }
                            disabled={
                              isSubmitting || !derivedVoteState.isInputValid
                            }
                          >
                            {isSubmitting ? 'Saving...' : 'Fail'}
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div
                      className={`rounded-lg border-2 p-4 ${
                        motion.status === 'passed'
                          ? 'border-success bg-green-50'
                          : 'border-error bg-red-50'
                      }`}
                    >
                      <div
                        className={`mb-2 text-lg font-bold ${
                          motion.status === 'passed' ? 'text-success' : 'text-error'
                        }`}
                      >
                        {motion.status === 'passed' ? 'PASSED' : 'FAILED'}
                      </div>
                      <div className="text-sm text-gray-700">
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            For: <span className="font-semibold">{motion.voteResult?.for || 0}</span>
                          </div>
                          <div>
                            Against:{' '}
                            <span className="font-semibold">{motion.voteResult?.against || 0}</span>
                          </div>
                          <div>
                            Abstain:{' '}
                            <span className="font-semibold">
                              {motion.voteResult?.abstain || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {showSpeakerListDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-2xl font-bold text-gray-900">All Motions Rejected</h2>
              <p className="mt-2 text-gray-600">
                All motions in this group have been rejected. Would you like to open a General
                Speakers List?
              </p>
            </div>

            {!showTimeConfirmation && !calculatedTime ? (
              <div className="space-y-4 p-6">
                <div>
                  <label className="mb-2 block text-base font-semibold text-gray-700">
                    Duration & Speaking Time (minutes/seconds)
                  </label>
                  <input
                    type="text"
                    value={timeInput}
                    onChange={(event) => setTimeInput(event.target.value)}
                    onKeyDown={handleTimeInputKeyDown}
                    className="h-12 w-full rounded-lg border border-gray-300 px-3 text-base focus:border-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                    placeholder="e.g., 10/60"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Format: total duration in minutes / speaking time in seconds.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="secondary" onClick={onBack} className="flex-1">
                    No, Continue
                  </Button>
                  <Button onClick={handleCalculateTime} className="flex-1">
                    Calculate
                  </Button>
                </div>
              </div>
            ) : showTimeConfirmation && calculatedTime ? (
              <div className="space-y-4 p-6">
                <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-4">
                  <h4 className="mb-3 font-bold text-gray-900">Please confirm:</h4>
                  <div className="space-y-2 text-base">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Total Time:</span>
                      <span className="font-semibold">
                        {calculatedTime.totalMinutes} minutes ({calculatedTime.totalMinutes * 60}{' '}
                        seconds)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Speaking Time Each:</span>
                      <span className="font-semibold">{calculatedTime.speakingSeconds} seconds</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Total Speakers:</span>
                      <span className="font-semibold text-primary">
                        {calculatedTime.totalSpeakers} speakers
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setShowTimeConfirmation(false);
                      setCalculatedTime(null);
                    }}
                    variant="secondary"
                    className="flex-1"
                  >
                    Correct
                  </Button>
                  <Button onClick={() => void handleConfirmSpeakerList()} className="flex-1">
                    Confirm Speaker List
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
};
