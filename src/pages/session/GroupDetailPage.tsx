import {canEnterResolutionVoting} from '../../utils/resolutionVoting';
import {recordedVoteCount} from '../../utils/motionTally';
import { EditMotionMenu } from '../../components/EditMotionMenu';
import { paperNames, presentationProgress } from '../../utils/paperPresentation';
import { formatDuration } from '../../utils/duration';
import React from 'react';
import { useMeetingStore } from '../../store/useMeetingStore';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { MotionProcessingBadge } from '../../components/session/MotionProcessingBadge';
import type { MotionType } from '../../types';

const motionTypeLabels: Record<MotionType, string> = {
  resolution_vote: 'Resolution vote',
  paper_presentation: 'Paper Presentation',
  moderated_caucus: 'Moderated Caucus',
  unmoderated_caucus: 'Unmoderated Caucus',
  speaker_list: 'Speaker List',
  round_robin: 'Round Robin',
  extend_moderated: 'Extend Moderated Caucus',
  extend_unmoderated: 'Extend Unmoderated Caucus',
  close_debate: 'Close Debate',
  enter_voting: 'Enter Voting',
  resume_debate: 'Resume Debate',
  adjourn_meeting: 'Adjourn Meeting',
};

interface GroupDetailPageProps {
  groupId: string;
  onBack: () => void;
  onResolutionVoting?: (motionId:string) => void;
  onMotionClick?: (motionId: string) => void;
}

export const GroupDetailPage: React.FC<GroupDetailPageProps> = ({ groupId, onBack, onMotionClick, onResolutionVoting }) => {
  const motionGroups = useMeetingStore((state) => state.motionGroups);
  const group = motionGroups.find(g => g.id === groupId);

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card>
          <p className="text-center text-gray-500 py-8">Motion group not found</p>
          <div className="flex justify-center mt-4">
            <Button onClick={onBack}>← Back</Button>
          </div>
        </Card>
      </div>
    );
  }

  const resolution=group.motions.length===1&&group.motions[0].type==='resolution_vote';
  const hasPassedMotion = group.motions.some(m => m.status === 'passed');

  return (
    <div className="session-detail min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="secondary" onClick={onBack} className="mb-2">
              ← Back
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">{resolution?'Resolution vote':'Motion Group Details'}</h1>
            <p className="text-gray-600 mt-1">
              {resolution?(hasPassedMotion?'Adopted':'Not adopted'):hasPassedMotion ? 'At least one motion passed' : 'All motions failed'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4 max-w-4xl mx-auto">
        {/* Group Status Card */}
        <Card>
          <div className={`p-4 rounded-lg border-2 ${
            hasPassedMotion
              ? 'bg-green-50 border-success'
              : 'bg-red-50 border-error'
          }`}>
            <div className={`text-xl font-bold mb-2 ${
              hasPassedMotion ? 'text-success' : 'text-error'
            }`}>
              {hasPassedMotion ? (resolution?'✓ RESOLUTION ADOPTED':'✓ GROUP COMPLETED - MOTION(S) PASSED') : (resolution?'RESOLUTION NOT ADOPTED':'✗ GROUP COMPLETED - ALL MOTIONS FAILED')}
            </div>
            <div className="text-sm text-gray-700">
              {resolution?group.motions[0].parameters.topic:<>Total Motions: {group.motions.length} | Passed: {group.motions.filter(m=>m.status==='passed').length} | Failed: {group.motions.filter(m=>m.status==='failed').length}</>}
            </div>
          </div>
        </Card>

        {/* All Motions in Group */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">{resolution?'Voting record':'All Motions in This Group'}</h3>
          <div className="space-y-3">
            {group.motions.map((motion, index) => (
              <Card key={motion.id}>
                <div className="space-y-3">
                  {/* Motion Header */}
                  <div className="flex items-start justify-between border-b border-gray-200 pb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-500">{index + 1}.</span>
                        <span className="text-lg font-semibold text-gray-900">
                          {motionTypeLabels[motion.type]}
                        </span>
                        <MotionProcessingBadge motionId={motion.id} />
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            motion.status === 'passed'
                              ? 'bg-success-light text-success'
                              : motion.status === 'failed'
                              ? 'bg-error-light text-error'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {motion.status === 'passed' ? '✓ Passed' : motion.status === 'failed' ? '✗ Failed' : 'Pending'}
                        </span>
                      </div>
                    </div>
                    <EditMotionMenu motion={motion} />
                  </div>

                  {/* Motion Details */}
                  <div className="space-y-2">
                    {motion.proposer && (
                      <div className="text-sm text-gray-600">
                        <span className="font-semibold">Proposer:</span> {motion.proposer}
                      </div>
                    )}

                    {motion.parameters.topic && (
                      <div className="text-base text-gray-800">
                        <span className="font-semibold">{motion.type === 'paper_presentation' ? 'Paper:' : 'Topic:'}</span> {motion.parameters.topic}
                      </div>
                    )}

                    {motion.parameters.totalSpeakers && (
                      <div className="text-sm text-gray-700">
                        <span className="font-semibold">Speakers:</span> {motion.parameters.totalSpeakers} speakers, {motion.parameters.speakingTime}s each
                      </div>
                    )}

                    {motion.parameters.totalTime && (
                      <div className="text-sm text-gray-700">
                        <span className="font-semibold">Duration:</span> {formatDuration(motion.parameters.totalTime)}
                      </div>
                    )}

                    {motion.type==='resolution_vote'&&motion.resolutionVote&&<div className="text-sm space-y-2"><strong>{motion.status==='passed'?'Adopted':'Not adopted'}</strong><p>{motion.voteResult?.rule}</p><p>Method: {motion.resolutionVote.method==='quick'?'Quick tally':'Roll-call vote'}</p>{motion.resolutionVote.method==='rollcall'&&motion.resolutionVote.roster.map(d=><p key={d.id}>{d.name}: {motion.resolutionVote!.ballots[d.id]??'Not recorded'}</p>)}</div>}
                    {motion.type === 'paper_presentation' && paperNames(motion).map((name,index)=>{const progress=presentationProgress(motion,index);return <div key={index} className="text-sm text-gray-700"><strong>{index+1}. {name}</strong><p>Presentation: {formatDuration(motion.parameters.totalTime)} · Remaining: {formatDuration(progress.remainingSeconds)}</p><p>Q&amp;A: {progress.phase==='qa'?formatDuration(progress.qaElapsedSeconds):'Not opened'}{motion.parameters.qaTime!==undefined?` / ${formatDuration(motion.parameters.qaTime)} allocated`:''}</p></div>;})}

                    {motion.voteResult && (
                      <div className="bg-gray-50 rounded p-3 text-sm">
                        <div className="font-semibold text-gray-700 mb-1">Vote Results:</div>
                        <div className="grid grid-cols-3 gap-2 text-gray-700">
                          <div>For: <span className="font-semibold">{recordedVoteCount(motion.voteResult,'for')}</span></div>
                          <div>Against: <span className="font-semibold">{recordedVoteCount(motion.voteResult,'against')}</span></div>
                          <div>Abstain: <span className="font-semibold">{recordedVoteCount(motion.voteResult,'abstain')}</span></div>
                        </div>
                      </div>
                    )}

                    {motion.type==='enter_voting'&&<p className="text-sm text-slate-600">{motion.parameters.voteCount??1} papers to vote on{motion.parameters.votingComplete?' · Voting group finished':''}</p>}
                    {canEnterResolutionVoting(motion) && onResolutionVoting && <Button onClick={()=>onResolutionVoting(motion.id)}>Enter resolution voting →</Button>}
                    {/* Enter motion processing page for passed execution motions */}
                    {motion.status === 'passed' &&
                      (motion.type === 'moderated_caucus' ||
                        motion.type === 'round_robin' || motion.type === 'speaker_list' ||
                        motion.type === 'unmoderated_caucus' || motion.type === 'extend_moderated' || motion.type === 'extend_unmoderated') &&
                      onMotionClick && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onMotionClick(motion.id)}
                        className="mt-2"
                      >
                        {(motion.type === 'unmoderated_caucus' || motion.type === 'extend_unmoderated') ? 'Enter Unmod' : 'Enter Caucus'}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
