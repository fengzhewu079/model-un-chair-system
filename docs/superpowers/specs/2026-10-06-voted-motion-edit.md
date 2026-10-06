# Edit voted motion — approved scope and verification

User approved a quiet `⋯ → Edit motion` entry, editing parameters after Pass/Fail without changing voting results or resetting active speakers. Use existing blue/white UI and short copy: Voting result stays unchanged. Preview only.

Implementation: separate parameter-only correction utility; same editor on agenda/Mod/completed details. Keep IDs/type/status/votes and all progress. Validate positive whole seconds/counts and prevent dropping recorded speakers. Existing speakers retain their timers; newly added speakers use new duration. Paper names can be corrected without reordering/removing linked progress; Q&A already started keeps its duration. Completed record edits use the existing authenticated version-check RPC against fresh shared state; no database schema or permission change. Existing active-motion shared-write guard stays enforced.

Verification: 41 tests, production build, live host UI modification of passed motion from 60 to 90 seconds while France retained 51 seconds; live completed-record correction and chair receipt. Additional guards tested for voting, disconnected state and lowering capacity below already-recorded speakers. Existing dirty AGENTS.md and review assets are excluded from commits.
