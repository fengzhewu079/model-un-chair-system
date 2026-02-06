# Model UN Chair System

A web-based meeting management tool designed for Model United Nations conference chairs. Transforms chair work from memory-dependent to system-maintained processes.

## Features

### Pre-Meeting Setup
- **Meeting Configuration**: Set meeting name, default speaking time, and voting rules
- **Delegate Management**: Add delegates individually or in bulk
- **Roll Call**: Mark attendance status (Present, Present and Voting, Absent)

### Main Session Management
- **Speaker Queue**:
  - Current speaker display with countdown timer
  - 10-second audio alert (3 beeps)
  - Intelligent search for adding speakers (2-letter trigger)
  - Waiting queue management

- **Motion Processing**:
  - Record motions (Moderated Caucus, Unmoderated Caucus, etc.)
  - Track motion status (Pending, Voting, Passed, Failed)
  - Dynamic form fields based on motion type

- **Voting System**:
  - Automatic vote calculation based on voting rules
  - Support for Simple Majority, Absolute Majority, and Two-thirds Majority
  - Real-time vote counting interface

## Tech Stack

- **React 18** with TypeScript for type-safe component development
- **Vite** as build tool for fast development
- **Zustand** for lightweight state management
- **Tailwind CSS** for utility-first styling
- **Web Audio API** for programmatic audio generation
- **LocalStorage** for client-side data persistence

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn package manager

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

4. Preview production build:
```bash
npm run preview
```

## Usage

### Setup Phase

1. **Meeting Information**: Enter meeting name, default speaking time (in seconds), and select voting rule
2. **Add Delegates**: Paste a list of delegates (one per line) or add them individually
3. **Roll Call**: Mark attendance for each delegate using P (Present), PV (Present and Voting), or A (Absent) buttons

### Main Session

1. **Managing Speakers**:
   - Type delegate name in the search box (2+ letters for auto-suggestions)
   - Click "Start First Speaker" to begin
   - Timer shows remaining time with audio alert at 10 seconds
   - Click "Next Speaker" to move to the next person in queue

2. **Recording Motions**:
   - Click "Record Motion" button
   - Select motion type
   - Fill in required parameters (varies by motion type)
   - Optionally specify proposer

3. **Voting**:
   - Click "Start Vote" on a pending motion
   - Enter vote counts (For, Against, Abstain)
   - System automatically calculates result based on voting rule
   - Click "Confirm Result" to finalize

4. **Settings**:
   - Click the settings icon to return to Roll Call for updates
   - Click mute icon to disable/enable audio alerts

## Design Specifications

- **Display**: Optimized for 1366x768 minimum, 1920x1080 recommended
- **Theme**: Light theme with professional color palette
- **Interaction**: Mouse clicks + keyboard input (typing), no keyboard shortcuts
- **Audio**: 3 beeps at 10 seconds remaining (800Hz sine wave, 0.1s each)
- **Search**: Auto-suggestions after 2 letters, shows max 5 results

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   ├── SearchInput.tsx
│   └── Timer.tsx
├── pages/              # Page components
│   ├── setup/          # Setup wizard steps
│   │   ├── MeetingInfoStep.tsx
│   │   ├── DelegatesStep.tsx
│   │   └── RollCallStep.tsx
│   ├── session/        # Main session components
│   │   ├── HeaderBar.tsx
│   │   ├── SpeakerQueue.tsx
│   │   └── MotionsPanel.tsx
│   ├── SetupPage.tsx
│   └── MainSessionPage.tsx
├── store/              # State management
│   └── useMeetingStore.ts
├── types/              # TypeScript type definitions
│   └── index.ts
├── App.tsx             # Main app component
├── main.tsx            # Entry point
└── index.css           # Global styles
```

## Data Persistence

All meeting data is automatically saved to browser's LocalStorage, allowing you to:
- Close and reopen the browser without losing data
- Continue sessions after interruptions
- Maintain full meeting history

To start a fresh meeting, clear browser data for this site.

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari

Requires a modern browser with support for:
- ES6+ JavaScript
- Web Audio API
- LocalStorage API

## License

This project is created for Model UN conferences and educational purposes.

## Support

For issues or questions, please refer to the PRD.md and DESIGN_SPEC.md documents in the project root for detailed specifications.
