# Paper Presentation Implementation Plan

**Goal:** Add the approved minimal paper introduction and optional Q&A workflow, preview only.
**Architecture:** A paper_presentation motion uses the current record/vote/execute/finish lifecycle. A dedicated detail page provides introduction countdown and optional untimed Q&A stopwatch. Progress lives on the local motion, is restored paused, and only completed groups enter shared history via the existing Finish RPC. No uploads, paper editing or mandated conference rules.
**Tech Stack:** React, TypeScript, Zustand, existing Vite and Supabase RPC.

- [x] Add regression coverage to tests/regression.test.ts: name and positive duration required; passing a vote leaves presentation executing; intro clock cannot go negative; Q&A starts once without resetting on re-entry; back/reopen and storage/serialization retain progress; finish archives and exports paper name, duration and Q&A elapsed time.
- [x] Extend src/types/index.ts and src/utils/motionEntry.ts with paper_presentation and required paper name (stored in topic) / totalTime. Add src/utils/paperPresentation.ts for valid progress and tick/Q&A transitions. Add guarded store action on executing, claimed presentation only.
- [x] Add dropdown fields and labels in RecordMotionGroupModal, MotionsPanel, VotingPage, StatusBar, GroupDetailPage, motionCollaboration. Add dedicated PaperPresentationPage route. Completed details remain read-only. Reuse brand blue/white, short labels, existing sound settings.
- [x] Serialize presentation progress explicitly in sharedMeetingState; include details in exportMeeting; preserve local draft boundaries. No SQL changes.
- [x] npm test, npm run build, git diff --check. Browser: record/vote/execute, pause/resume, Q&A, back/reopen, finish/read-only history. Check narrow layout. Push codex/ui-preview only; verify deployed demo and report actual verification limits.

## Verification
- Build and 30 tests pass. Local demo browser: six-second introduction reaches zero without archiving; Q&A ran eight seconds, paused and remained eight seconds after Back/reopen; Finish moved the group into completed history with its paper name and Q&A duration.
- 390px viewport inspected, no horizontal overflow. Intro-without-Q&A and serialized/local refresh recovery covered by regression tests. No live two-chair room test in this change; no SQL changes.
- Preview branch only. Production remains at 05921f6.
