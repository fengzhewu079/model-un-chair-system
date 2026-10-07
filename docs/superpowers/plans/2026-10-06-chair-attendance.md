# Chair attendance

User authorization: ordinary chairs can take attendance. Keep other host setup and PIN permissions. Preview frontend only; additive scoped database RPC shared by environments, existing write paths remain host-protected.

- Add an authenticated member/room-checked attendance patch RPC: update existing delegate status only, recompute totals server-side, optionally complete roll call; never accept roster or meeting metadata edits. Serialize patches with row locks. Preserve active-motion restriction.
- Route attendance mutations through the new RPC for host/chair; show saving/error, do not show unsaved changes as saved. Keep demo/local behavior.
- Open setup roll call for chair, allow bulk attendance and completion. Keep delegates/preferences pages read-only. Merge shared attendance back into host without discarding unsaved roster changes or active motion drafts.
- Transaction-rollback database tests: chair patch and completion, host edits, auth/cross-room/invalid status/unknown ID rejection, unrelated fields unchanged; tests for frontend mutation/room-refresh preservation.
- Browser verify a chair role UI and error/disabled behavior; build/regression suite, preview deployment, production main unchanged.

## Verified 2026-10-06
- Build passed; all 38 automated tests passed.
- Scoped migration `chair_attendance_scoped_rpc` applied successfully; SQL transaction/rollback assertions passed for authentication, cross-room isolation, status validation, host-only metadata/PIN protection, completion and active-motion guard.
- Two independent browser clients (host and chair): chair individual and bulk attendance, chair completion, host receives shared roll call; chair refresh restores attendance, live correction persists.
- Attendance response merges shared records before advancing the room version, preventing unrelated completed records from being dropped on a later setup save.
- Frontend release target: codex/ui-preview only. Existing production frontend and broad setup RPC permissions retained.
