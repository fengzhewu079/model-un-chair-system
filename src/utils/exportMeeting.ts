import {recordedVoteCount} from './motionTally';
import { paperNames, presentationProgress } from './paperPresentation';
import { formatDuration } from './duration';
import type { MeetingSessionState } from '../types';

export const exportMeetingRecord = (state: MeetingSessionState) => {
  const {
    name,
    chairName,
    committeeName,
    startTime,
    rollCall,
    motions,
    motionGroups,
  } = state;

  // Format date and time
  const formatDateTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Build the text content
  let content = '';

  // Header
  content += '═══════════════════════════════════════════════════════\n';
  content += '           MODEL UN MEETING RECORD\n';
  content += '═══════════════════════════════════════════════════════\n\n';

  // Meeting Information
  content += '📋 MEETING INFORMATION\n';
  content += '─────────────────────────────────────────────────────\n';
  content += `Meeting Name: ${name}\n`;
  content += `Committee: ${committeeName}\n`;
  content += `Chair: ${chairName}\n`;
  content += `Date & Time: ${formatDateTime(startTime)}\n`;
  content += '\n';

  // Roll Call Results
  content += '✓ ROLL CALL RESULTS\n';
  content += '─────────────────────────────────────────────────────\n';
  content += `Total Delegates: ${rollCall.totalDelegates}\n`;
  content += `Present: ${rollCall.presentCount}\n`;
  content += `Present and Voting: ${rollCall.presentAndVotingCount}\n`;
  content += `Absent: ${rollCall.absentCount}\n`;
  content += `\nVoting Base: ${rollCall.presentCount + rollCall.presentAndVotingCount} delegates\n`;
  content += '\n';

  // Delegate List
  if (rollCall.delegates.length > 0) {
    content += 'Delegate List:\n';
    const presentDelegates = rollCall.delegates.filter(d => d.attendance === 'present');
    const pvDelegates = rollCall.delegates.filter(d => d.attendance === 'present_and_voting');
    const absentDelegates = rollCall.delegates.filter(d => d.attendance === 'absent');

    if (presentDelegates.length > 0) {
      content += '\n  Present (P):\n';
      presentDelegates.forEach((d, idx) => {
        content += `    ${idx + 1}. ${d.name}\n`;
      });
    }

    if (pvDelegates.length > 0) {
      content += '\n  Present and Voting (PV):\n';
      pvDelegates.forEach((d, idx) => {
        content += `    ${idx + 1}. ${d.name}\n`;
      });
    }

    if (absentDelegates.length > 0) {
      content += '\n  Absent (A):\n';
      absentDelegates.forEach((d, idx) => {
        content += `    ${idx + 1}. ${d.name}\n`;
      });
    }
  }
  content += '\n';

  // Motions and Votes
  const allMotions = [...new Map([
    ...motions,
    ...motionGroups.flatMap((g) => g.motions),
  ].map(motion => [motion.id, motion])).values()].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (allMotions.length > 0) {
    content += '📝 MOTIONS AND VOTING RECORDS\n';
    content += '─────────────────────────────────────────────────────\n';

    allMotions.forEach((motion, idx) => {
      content += `\n${idx + 1}. ${getMotionTypeLabel(motion.type)}\n`;
      content += `   Status: ${getStatusLabel(motion.status)}\n`;
      content += `   Timestamp: ${formatDateTime(motion.timestamp)}\n`;

      if (motion.proposer) {
        content += `   Proposed by: ${motion.proposer}\n`;
      }

      // Motion Parameters
      if ((motion.type === 'round_robin' || motion.type === 'moderated_caucus' || motion.type === 'extend_moderated') && motion.parameters) {
        content += `   Total Time: ${formatDuration(motion.parameters.totalTime)}\n`;
        content += `   Speaking Time: ${motion.parameters.speakingTime} seconds per speaker\n`;
        if (motion.parameters.topic) {
          content += `   Topic: ${motion.parameters.topic}\n`;
        }
      } else if ((motion.type === 'unmoderated_caucus' || motion.type === 'extend_unmoderated') && motion.parameters) {
        content += `   Time: ${formatDuration(motion.parameters.totalTime)}\n`;
      }

      if (motion.type === 'resolution_vote' && motion.resolutionVote) {
        const d=motion.resolutionVote;
        content += `    Resolution: ${d.name} — ${motion.status==='passed'?'Adopted':'Not adopted'}\n`;
        content += `    Method: ${d.method} | Rule: ${motion.voteResult?.rule}\n`;
        content += `    PV abstention restricted: ${d.restrictPV?'Yes':'No'}\n`;
        if(d.method==='rollcall')d.roster.forEach(r=>{content+=`    ${r.name}: ${d.ballots[r.id]}\n`;});
      }
      if (motion.type === 'paper_presentation') {
        paperNames(motion).forEach((name,index) => {
          const progress = presentationProgress(motion,index);
          content += `   Paper ${index+1}: ${name}\n`;
          content += `   Presentation: ${formatDuration(motion.parameters.totalTime)} · Remaining: ${formatDuration(progress.remainingSeconds)}\n`;
          content += `   Q&A: ${progress.phase === 'qa' ? formatDuration(progress.qaElapsedSeconds) : 'Not opened'}${motion.parameters.qaTime !== undefined ? ` / ${formatDuration(motion.parameters.qaTime)} allocated` : ''}\n`;
          if (motion.parameters.papers) content += `   Finished: ${progress.completed ? 'Yes' : 'No'}\n`;
        });
      }

      // Vote Result
      if (motion.voteResult) {
        const vr = motion.voteResult;
        content += `   Voting Result:\n`;
        content += `     For: ${recordedVoteCount(vr,'for')}  |  Against: ${recordedVoteCount(vr,'against')}  |  Abstain: ${recordedVoteCount(vr,'abstain')}\n`;
        content += `     ${vr.countsEntered && Object.values(vr.countsEntered).some(v=>!v)?'Recorded Votes':'Total Votes'}: ${vr.total}\n`;
        content += `     Voting Base: ${vr.votingBase}\n`;
        content += `     Rule: ${vr.rule}\n`;
        content += `     Result: ${vr.result === 'pass' ? '✓ PASSED' : '✗ FAILED'}\n`;
      }
    });
  } else {
    content += '📝 MOTIONS AND VOTING RECORDS\n';
    content += '─────────────────────────────────────────────────────\n';
    content += 'No motions recorded.\n';
  }
  content += '\n';

  // Footer
  content += '═══════════════════════════════════════════════════════\n';
  content += `Generated by Model UN Chair System\n`;
  content += `Export Time: ${formatDateTime(new Date())}\n`;
  content += '═══════════════════════════════════════════════════════\n';

  return content;
};

const getMotionTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    resolution_vote: 'Resolution vote',
  paper_presentation: 'Paper Presentation',
    moderated_caucus: 'Motion for Moderated Caucus',
    round_robin: 'Motion for Round Robin',
    unmoderated_caucus: 'Motion for Unmoderated Caucus',
    close_debate: 'Motion to Close Debate',
    enter_voting: 'Motion to Enter Voting',
    adjourn_meeting: 'Motion to Adjourn Meeting',
    suspend_meeting: 'Motion to Suspend Meeting',
    resume_debate: 'Motion to Resume Debate',
  };
  return labels[type] || type;
};

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: 'Pending',
    voting: 'In Voting',
    passed: 'Passed',
    failed: 'Failed',
    executing: 'Executing',
  };
  return labels[status] || status;
};

export const downloadMeetingRecord = (state: MeetingSessionState) => {
  const content = exportMeetingRecord(state);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  // Generate filename
  const date = new Date().toISOString().split('T')[0];
  const safeName = state.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  link.download = `MUN_${safeName}_${date}.txt`;

  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
