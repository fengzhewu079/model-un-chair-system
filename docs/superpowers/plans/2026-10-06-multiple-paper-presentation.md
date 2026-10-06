# Multiple-paper presentation implementation plan

Goal: One voted presentation motion contains named papers, each with independent presentation and Q&A countdowns and a local document.
Architecture: Extend motion parameters with paper names and Q&A seconds; keep legacy single-paper progress readable. Store new per-paper progress on the motion, behind the existing local-processing guard and Finish submission boundary. Files remain mounted page-local and are never serialized.
Approved flow: presentation minutes, Q&A minutes, paper count; optional names window; existing motion group voting; select each paper, manually start/pause Q&A and finish each paper before finishing the motion. Names default to Paper N. Changing paper pauses the clock. No automatic timer or paper transitions. Preview only.

- [x] Add independent progress tests: presentation exhaustion never touches Q&A or another paper; Q&A caps at zero; switching/JSON restore preserves all entries; legacy records retain elapsed-Q&A behavior.
- [x] Extend types and pure timer helpers; store accepts an explicit paper index and rejects invalid indices. Keep current mutation guard and shared state boundary.
- [x] Extend form validation with Q&A duration and 1–50 papers; optional names, default Paper N; modal name step opens after count selection and remains skippable. Retain pending-group edit and Add & continue.
- [x] Add paper selection and independent mounted documents; pause before selection or phase changes; finish paper marks progress, final submission requires all papers finished. Preserve full-screen header layout and scrolling.
- [x] Display names and both configured durations at voting and in records/export. Verify serialization does not drop progress or include files.
- [x] Run tests/build; browser test names skip/edit, two papers with different documents, separate countdowns, fullscreen and completed records. Commit only scope files; publish preview; main unchanged.

## Verification
- 36 tests pass (9 route/demo and 27 regression/document tests); production build passes with existing bundle-size/Browserslist warnings.
- Browser: count selection opens names window; Skip/reopen/edit work; a blank third name becomes Paper 3. Pending-group edit restores both durations and names. Voting displays per-paper timings.
- Local demo: Alpha consumes 8/60 presentation seconds; switching to Beta shows untouched 60 seconds. Returning restores Alpha PDF and 52 seconds. Alpha Q&A reaches 0 after 6 seconds without advancing; Beta file is independent text. All papers must be finished before final submission. Details retain distinct per-paper results.
- Fullscreen controls stay above document; 390px viewport has no horizontal overflow. Automated tests cover JSON local/shared restoration; no live multi-chair network test in this turn. No backend/schema/security changes.
- Documents remain page-local; switching papers retains files, leaving/refreshing still requires reopening them. Legacy motions retain their original untimed Q&A semantics.
