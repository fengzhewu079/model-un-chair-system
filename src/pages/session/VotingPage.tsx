import { paperSummary } from '../../utils/paperPresentation';
import { formatDuration } from '../../utils/duration';
import { buildMotionEntry } from '../../utils/motionEntry';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import React, { useEffect, useState } from 'react';
import { useMeetingStore } from '../../store/useMeetingStore';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { MotionProcessingBadge } from '../../components/session/MotionProcessingBadge';
import type { Motion, MotionType } from '../../types';

const motionTypeLabels: Record<MotionType, string> = {
  paper_presentation: 'Paper Presentation',
  moderated_caucus: 'Moderated Caucus',
  unmoderated_caucus: 'Unmoderated Caucus',
  speaker_list: 'Speaker List',
  round_robin: 'Round Robin',
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
  const [fallbackMinutes, setFallbackMinutes] = useState('10');
  const [fallbackSeconds, setFallbackSeconds] = useState('60');
  const [creatingSpeakerList, setCreatingSpeakerList] = useState(false);
  const skipSpeakerList = () => { if (!creatingSpeakerList) onBack(); };
  const fallbackDialogRef = useDialogFocus(showSpeakerListDialog, skipSpeakerList);
  const [actionError, setActionError] = useState<string | null>(null);
  const fallbackEntry = buildMotionEntry({ type: 'speaker_list', proposer: '', topic: '', minutes: fallbackMinutes, seconds: fallbackSeconds });

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

  const handleConfirmSpeakerList = async () => {
    const parameters = fallbackEntry.motion?.parameters;
    if (!parameters?.totalSpeakers || !parameters.speakingTime || creatingSpeakerList) return;

    setCreatingSpeakerList(true);
    setActionError(null);
    try {
      const success = await createSpeakerListFallbackMotion({
        totalSpeakers: parameters.totalSpeakers,
        speakingTime: parameters.speakingTime,
      });
      if (!success) {
        const latestState = useMeetingStore.getState();
        setActionError(latestState.motionProcessingError || latestState.collaborationError || 'The fallback speaker list was not saved. Please try again.');
        return;
      }
      setShowSpeakerListDialog(false);
      onBack();
    } finally {
      setCreatingSpeakerList(false);
    }
  };

  return (
    <>
      <div className="voting-page min-h-screen bg-white">
        <header className="border-b border-slate-200 px-5 py-4 sm:px-8">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="desk-title text-3xl text-slate-900">Vote on motions</h1>
              <p className="mt-1 text-sm text-slate-500">{group.motions.length} {group.motions.length === 1 ? 'motion' : 'motions'} in this group</p>
            </div>
            <Button variant="secondary" onClick={onBack}>Back to Session</Button>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-5 py-6 sm:px-8">
          {motionProcessingError && <p role="alert" className="mb-4 border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">{motionProcessingError}</p>}
          {actionError && <p role="alert" className="mb-4 border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">{actionError}</p>}
          <div className="border-b border-slate-200 pb-5">
            <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <div><dt className="text-slate-500">Voting base</dt><dd className="mt-1 font-semibold text-slate-900">{votingBase} delegates</dd></div>
              <div><dt className="text-slate-500">Simple majority (&gt; ½)</dt><dd className="mt-1 font-semibold text-slate-900">{simpleMajority} votes</dd></div>
              <div><dt className="text-slate-500">Absolute majority (≥ ⅔)</dt><dd className="mt-1 font-semibold text-slate-900">{absoluteMajority} votes</dd></div>
            </dl>
            <p className="mt-4 text-sm leading-6 text-slate-600">Counts optional; choose Pass or Fail. Against is calculated from remaining votes.</p>
          </div>
          {hasPassedMotion && <p role="status" className="mt-5 border-l-2 border-green-600 bg-green-50 px-4 py-3 text-sm text-green-800">Motion passed. Returning to the session…</p>}
          {group.motions.map((motion, index) => {
            const vote = votes[motion.id] ?? createEmptyVoteInputs();
            const derivedVoteState = buildDerivedVoteState(vote, votingBase, simpleMajority);
            const isVoted = motion.status !== 'pending';
            const isSubmitting = submittingMotionId === motion.id;
            const fieldId = `vote-${groupId}-${motion.id}`;
            return (
              <section key={motion.id} aria-labelledby={`${fieldId}-heading`} className="border-b border-slate-200 py-6">
                <div className="mb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 id={`${fieldId}-heading`} className="text-lg font-semibold text-slate-900"><span className="mr-2 font-mono text-sm font-normal text-slate-500">{index + 1}.</span>{motionTypeLabels[motion.type]}</h2>
                    <MotionProcessingBadge motionId={motion.id} />
                  </div>
                  {motion.proposer && <p className="mt-1 text-sm text-slate-500">Proposed by {motion.proposer}</p>}
                  {motion.parameters.topic && <p className="mt-2 break-words font-medium text-slate-800">{motion.parameters.topic}</p>}
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                    {motion.parameters.totalSpeakers && <span>{motion.parameters.totalSpeakers} speakers · {motion.parameters.speakingTime}s each</span>}
                    {motion.parameters.totalTime && <span>{motion.type==='paper_presentation'&&motion.parameters.papers?paperSummary(motion):formatDuration(motion.parameters.totalTime)}</span>}
                  </div>
                </div>
                {!isVoted ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label htmlFor={`${fieldId}-for`} className="mb-1 block text-sm font-medium text-slate-700">For</label>
                        <input id={`${fieldId}-for`} type="number" min="0" step="1" inputMode="numeric" value={vote.for} onChange={(event) => handleVoteChange(motion.id, 'for', event.target.value)} placeholder="Optional" disabled={isSubmitting} aria-invalid={!derivedVoteState.isInputValid} aria-describedby={derivedVoteState.validationMessage ? `${fieldId}-error` : undefined} className="h-12 w-full min-w-0 rounded-md border border-slate-300 px-3 text-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                      </div>
                      <div>
                        <label htmlFor={`${fieldId}-against`} className="mb-1 block text-sm font-medium text-slate-700">Against <span className="font-normal text-slate-500">(auto)</span></label>
                        <input id={`${fieldId}-against`} type="text" value={derivedVoteState.autoCalculatedAgainst === null ? '' : String(derivedVoteState.autoCalculatedAgainst)} placeholder="Calculated" readOnly className="h-12 w-full min-w-0 rounded-md border border-slate-200 bg-slate-50 px-3 text-lg text-slate-700" />
                      </div>
                      <div>
                        <label htmlFor={`${fieldId}-abstain`} className="mb-1 block text-sm font-medium text-slate-700">Abstain</label>
                        <input id={`${fieldId}-abstain`} type="number" min="0" step="1" inputMode="numeric" value={vote.abstain} onChange={(event) => handleVoteChange(motion.id, 'abstain', event.target.value)} placeholder="Optional" disabled={isSubmitting} aria-invalid={!derivedVoteState.isInputValid} aria-describedby={derivedVoteState.validationMessage ? `${fieldId}-error` : undefined} className="h-12 w-full min-w-0 rounded-md border border-slate-300 px-3 text-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                      </div>
                    </div>
                    {derivedVoteState.validationMessage && <p id={`${fieldId}-error`} role="alert" className="mt-3 text-sm text-error">{derivedVoteState.validationMessage}</p>}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                      <p aria-live="polite" className="text-sm text-slate-600">
                        {derivedVoteState.isInputStarted && derivedVoteState.isInputValid ? <><span className={derivedVoteState.predictedResult === 'pass' ? 'font-semibold text-success' : 'font-semibold text-error'}>{derivedVoteState.predictedResult === 'pass' ? 'Calculated: Pass' : 'Calculated: Fail'}</span><span className="ml-2">Simple majority · {simpleMajority} needed</span></> : 'Result: choose manually'}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Button onClick={() => void handleConfirmMotion(motion, derivedVoteState, 'pass')} disabled={isSubmitting || !derivedVoteState.isInputValid}>{isSubmitting ? 'Saving...' : 'Pass'}</Button>
                        <Button variant="danger" onClick={() => void handleConfirmMotion(motion, derivedVoteState, 'fail')} disabled={isSubmitting || !derivedVoteState.isInputValid}>{isSubmitting ? 'Saving...' : 'Fail'}</Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                    <span className={motion.status === 'passed' ? 'font-semibold text-success' : 'font-semibold text-error'}>{motion.status === 'passed' ? 'Passed' : 'Failed'}</span>
                    <span>For: <strong>{motion.voteResult?.for || 0}</strong></span>
                    <span>Against: <strong>{motion.voteResult?.against || 0}</strong></span>
                    <span>Abstain: <strong>{motion.voteResult?.abstain || 0}</strong></span>
                  </div>
                )}
              </section>
            );
          })}
        </main>
      </div>

      {showSpeakerListDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div ref={fallbackDialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="fallback-title" aria-describedby="fallback-description" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
              <h2 id="fallback-title" className="desk-title text-2xl text-slate-900">Open a General Speakers List?</h2>
              <p id="fallback-description" className="mt-2 text-sm text-slate-600">All motions were rejected. Set speaking time below, or return to the session.</p>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); void handleConfirmSpeakerList(); }} className="space-y-4 p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="fallback-minutes" className="mb-2 block text-sm font-medium text-slate-700">Total time (minutes)</label>
                  <input data-initial-focus id="fallback-minutes" type="number" min="0" step="any" value={fallbackMinutes} onChange={(event) => setFallbackMinutes(event.target.value)} disabled={creatingSpeakerList} aria-describedby="fallback-timing" className="h-12 w-full min-w-0 rounded-md border border-slate-300 px-3 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label htmlFor="fallback-seconds" className="mb-2 block text-sm font-medium text-slate-700">Each speaker (seconds)</label>
                  <input id="fallback-seconds" type="number" min="1" step="1" value={fallbackSeconds} onChange={(event) => setFallbackSeconds(event.target.value)} disabled={creatingSpeakerList} aria-describedby="fallback-timing" className="h-12 w-full min-w-0 rounded-md border border-slate-300 px-3 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <div id="fallback-timing" aria-live="polite" className="text-sm leading-6">
                {fallbackEntry.error ? <p className="text-error">{fallbackEntry.error}</p> : <>
                  <p className="font-medium text-slate-800">{fallbackEntry.motion?.parameters.totalSpeakers} full speaking turns · {formatDuration(fallbackEntry.effectiveSeconds ?? 0)} actual time</p>
                  {!!fallbackEntry.remainderSeconds && <p className="text-amber-800">{formatDuration(fallbackEntry.remainderSeconds)} left over, not included in the speaker list.</p>}
                </>}
              </div>
              {actionError && <p role="alert" className="text-sm text-error">{actionError}</p>}
              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                <Button type="button" variant="secondary" onClick={skipSpeakerList} disabled={creatingSpeakerList}>Skip, return to session</Button>
                <Button type="submit" disabled={creatingSpeakerList || !fallbackEntry.motion}>{creatingSpeakerList ? 'Creating…' : 'Create Speakers List'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
