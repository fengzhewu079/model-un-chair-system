export interface WorkflowStep {
  id: string;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export const workflowSteps: WorkflowStep[] = [
  {
    id: 'create-room',
    label: 'Create Room',
    eyebrow: 'Step 1',
    title: 'Create a room for your committee.',
    description:
      'The host names the meeting and committee, then creates a private room for the dais team.',
    imageSrc: '/home/create-room.webp',
    imageAlt: 'The real MUN Chair create room form for entering meeting, committee, host, and PIN details.',
  },
  {
    id: 'roll-call',
    label: 'Complete Roll Call',
    eyebrow: 'Step 2',
    title: 'Prepare delegates and attendance.',
    description:
      'Add the country list, mark attendance, and let the system calculate the committee voting base.',
    imageSrc: '/home/roll-call.webp',
    imageAlt: 'The real MUN Chair roll call screen showing countries and their attendance controls.',
  },
  {
    id: 'run-session',
    label: 'Run the Session',
    eyebrow: 'Step 3',
    title: 'Manage the live committee from one workspace.',
    description:
      'Run speakers, timers, motions, voting, and completed records from the same session interface.',
    imageSrc: '/home/run-session.webp',
    imageAlt: 'The real MUN Chair live session interface with meeting status, motions, and completed groups.',
  },
];

export const faqItems: FaqItem[] = [
  {
    question: 'Do I need an account?',
    answer:
      'No. MUN Chair does not require an account during beta. A host can create a room and begin setup directly from the homepage.',
  },
  {
    question: 'How does another chair join my room?',
    answer:
      'Share the Meeting ID and PIN with your dais member. They select Join Room, enter those details and their name, then connect as a chair.',
  },
  {
    question: 'What is the difference between a host and a chair?',
    answer:
      'The host creates the room and controls meeting setup, delegates, roll call, and PIN access. Chairs join the room to help run the live session without changing host-only setup.',
  },
  {
    question: 'What information is shared with the dais team?',
    answer:
      'The room shares confirmed meeting information, roll call, live committee state, completed motion groups, and voting results. Personal preferences such as sound, volume, and font size stay on each device.',
  },
  {
    question: 'What happens if I refresh or briefly lose connection?',
    answer:
      'This browser saves its collaboration session and tries to reconnect automatically. If the session has expired or you switch devices, you may need to enter the Meeting ID and PIN again.',
  },
  {
    question: 'Is MUN Chair free?',
    answer:
      'Yes. MUN Chair is completely free during beta, with no paid features or paid content in the beta version.',
  },
];
