import type { Delegate, MeetingSessionState } from '../../types';

export const DEMO_COUNTRIES = [
  'Brazil',
  'China',
  'France',
  'Germany',
  'India',
  'Japan',
  'Kenya',
  'Mexico',
  'Nigeria',
  'Republic of Korea',
  'Russian Federation',
  'South Africa',
  'United Kingdom',
  'United States',
  'Vietnam',
] as const;

export const DEMO_MEMBERS = [
  { name: 'Demo Host', role: 'host' as const, status: 'online' as const },
  { name: 'Sample Chair', role: 'chair' as const, status: 'online' as const },
];

const countryId = (country: string) =>
  `demo-${country.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

export const createDemoSessionSeed = (now = new Date()): MeetingSessionState => {
  const delegates: Delegate[] = DEMO_COUNTRIES.map((country) => ({
    id: countryId(country),
    name: country,
    attendance: 'present',
    timestamp: new Date(now),
  }));

  return {
    id: 'demo-room',
    name: 'Interactive Demo Session',
    chairName: 'Demo Host',
    committeeName: 'General Assembly Demo',
    status: 'GSL',
    startTime: new Date(now),
    rollCall: {
      delegates,
      totalDelegates: delegates.length,
      presentCount: delegates.length,
      presentAndVotingCount: 0,
      absentCount: 0,
      completed: true,
      completedAt: new Date(now),
    },
    currentStep: 'roll_call',
    meetingState: 'GSL',
    currentSpeaker: null,
    waitingQueue: [],
    speakerQueue: [],
    timerState: { isRunning: false },
    timePool: 0,
    motions: [],
    motionGroups: [],
    currentVote: null,
    isMuted: false,
    fontSize: 'medium',
    soundAlerts: [10, 0],
    volume: 0.5,
  };
};
