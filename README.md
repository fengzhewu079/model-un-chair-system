# Model UN Chair System

A web-based meeting management tool designed for Model United Nations conference chairs. Transforms chair work from memory-dependent to system-maintained processes.

## Current Backend Status

- The current first-round multi-chair collaboration MVP backend mainline is [`supabase/collaboration_mvp.sql`](/Users/wufengzhe/Documents/Competition/MODEL%20UN/MODEL%20UN%20Chair%20OS%20CURSOR/supabase/collaboration_mvp.sql).
- The backend contract and boundary rules for that mainline are documented in [`docs/backend-collaboration-mvp.md`](/Users/wufengzhe/Documents/Competition/MODEL%20UN/MODEL%20UN%20Chair%20OS%20CURSOR/docs/backend-collaboration-mvp.md).
- [`supabase/meetings.sql`](/Users/wufengzhe/Documents/Competition/MODEL%20UN/MODEL%20UN%20Chair%20OS%20CURSOR/supabase/meetings.sql) and the `MeetingSnapshot` flow are legacy single-table snapshot storage, kept for historical compatibility and old cloud archive reference.
- The legacy snapshot path is not the current multi-chair collaboration backend mainline and should not be extended as the primary collaboration path going forward.

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
- **Supabase** for the current collaboration MVP backend mainline plus a legacy snapshot cloud archive path

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn package manager

## Installation

1. Install dependencies:
```bash
npm install
```

2. Optional: configure Supabase by creating a `.env.local` file:
```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

If Supabase gives you a newer publishable key instead of a legacy anon key, you can use:
```bash
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

3. If you are setting up Supabase, choose the correct path:
   - Current collaboration MVP backend mainline: run [`supabase/collaboration_mvp.sql`](/Users/wufengzhe/Documents/Competition/MODEL%20UN/MODEL%20UN%20Chair%20OS%20CURSOR/supabase/collaboration_mvp.sql) and use [`docs/backend-collaboration-mvp.md`](/Users/wufengzhe/Documents/Competition/MODEL%20UN/MODEL%20UN%20Chair%20OS%20CURSOR/docs/backend-collaboration-mvp.md) as the source of truth for room/member/session/RPC behavior.
   - Legacy snapshot cloud archive: run [`supabase/meetings.sql`](/Users/wufengzhe/Documents/Competition/MODEL%20UN/MODEL%20UN%20Chair%20OS%20CURSOR/supabase/meetings.sql) only if you specifically need the old `Save to Cloud` / `Load from Cloud` snapshot flow that still exists in the current frontend.

4. Start development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
```

6. Preview production build:
```bash
npm run preview
```

## Usage

### Setup Phase

1. **Meeting Information**: Enter meeting name, default speaking time (in seconds), and select voting rule
   The setup screen may still show a meeting ID and old `Save to Cloud` / `Load from Cloud` actions; those belong to the legacy snapshot path, not the current collaboration backend mainline
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

## Supabase Setup

Supabase currently appears in this repository in two different roles. They are not the same thing.

### Current Collaboration MVP Backend Mainline

Use this path for current first-round multi-chair collaboration backend work.

1. Create a Supabase project.
2. In Supabase, copy:
   - `Project URL`
   - `anon key` or `publishable key`
   Do not use the `service_role` key in the browser.
3. Add these environment variables to your Vite app:
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
   If you only have a publishable key, set `VITE_SUPABASE_PUBLISHABLE_KEY` instead.
4. Run [`supabase/collaboration_mvp.sql`](/Users/wufengzhe/Documents/Competition/MODEL%20UN/MODEL%20UN%20Chair%20OS%20CURSOR/supabase/collaboration_mvp.sql).
   Re-run this SQL after pulling collaboration backend updates, because it also refreshes the `pgcrypto`-dependent helper functions used by room create/join flows.
5. Read [`docs/backend-collaboration-mvp.md`](/Users/wufengzhe/Documents/Competition/MODEL%20UN/MODEL%20UN%20Chair%20OS%20CURSOR/docs/backend-collaboration-mvp.md) before wiring frontend flows. That document is the source of truth for:
   - room creation and join semantics
   - `host` / `chair` roles
   - `meeting identifier + PIN + name` join flow
   - `active motion` and `finish_collaboration_motion` boundaries
   - the distinction between formal shared state and local-only in-progress motion handling
6. Optional: configure the database setting described in the backend doc for `app.settings.collaboration_access_code_secret` if you need host PIN reveal to work across browsers/devices. Without it, create/join still works and the original host browser can reveal its locally saved PIN.

### Legacy Snapshot Cloud Archive

This path is kept only for historical compatibility and old snapshot-based cloud archive behavior.

- It uses [`supabase/meetings.sql`](/Users/wufengzhe/Documents/Competition/MODEL%20UN/MODEL%20UN%20Chair%20OS%20CURSOR/supabase/meetings.sql) and a single `public.meetings` table.
- It stores a full meeting snapshot by `meetingId`.
- It matches the older `MeetingSnapshot`-style `Save to Cloud` / `Load from Cloud` flow that still appears in parts of the current frontend.
- It is not the current multi-chair collaboration backend mainline.
- It can be kept as a single-device archive/reference path, but it should not be treated as the primary path for ongoing collaboration backend work.

If you specifically need that old snapshot flow, then:

1. Run [`supabase/meetings.sql`](/Users/wufengzhe/Documents/Competition/MODEL%20UN/MODEL%20UN%20Chair%20OS%20CURSOR/supabase/meetings.sql).
2. Use the setup/header meeting ID together with the legacy `Save to Cloud` / `Load from Cloud` UI.
3. Treat it as a compatibility path, not as the source of truth for current collaboration architecture.

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
