import type { Delegate } from '../types';
import type { ResolutionVoteDraft } from './resolutionVoting';

type AttendanceDelegate = Pick<Delegate, 'id' | 'name' | 'attendance'>;
export type VoteRoster = ResolutionVoteDraft['roster'];
export function eligibleRoster(delegates: AttendanceDelegate[]): VoteRoster {
  return delegates.flatMap(d => d.attendance === 'present' || d.attendance === 'present_and_voting'
    ? [{id: d.id, name: d.name, attendance: d.attendance}] : []);
}
export function attendanceChanged(snapshot: VoteRoster, latest: VoteRoster): boolean {
  const signature = (roster: VoteRoster) => JSON.stringify(roster.map(d => [d.id, d.name, d.attendance]).sort((a,b) => a[0].localeCompare(b[0])));
  return signature(snapshot) !== signature(latest);
}
// Only called after the chair explicitly chooses to update this vote.
export function refreshVoteAttendance(draft: ResolutionVoteDraft, roster: VoteRoster): ResolutionVoteDraft {
  const ballots: ResolutionVoteDraft['ballots'] = {};
  for (const delegate of roster) {
    const choice = draft.ballots[delegate.id];
    if (choice && !(choice === 'abstain' && draft.restrictPV && delegate.attendance === 'present_and_voting')) ballots[delegate.id] = choice;
  }
  return {...draft, roster: roster.map(d => ({...d})), ballots};
}
export function speakerIsAbsent(name: string, delegates: AttendanceDelegate[]): boolean {
  return delegates.some(d => d.name.trim().toLowerCase() === name.trim().toLowerCase() && d.attendance === 'absent');
}
