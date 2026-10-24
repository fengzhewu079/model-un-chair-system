# Voting order preview

Approved direction: show Voting order, offer suggested most-to-least-disruptive caucus sorting, adjustable equal-duration rule and manual up/down controls. Preview only; never push main.

Boundaries: no universal precedence is claimed. Sort ordinary unmoderated/moderated caucuses among their existing slots (unmoderated first, then longer total duration). Leave all other motion types in their slots for chair placement. Equal-duration moderated caucuses default to more speakers; selectable longer speeches alternative; final ties preserve proposal order. Chair order and rule persist per meeting/group/browser, not as a shared conference rule. Counts/results stay attached to motion IDs. Lock order once any result is recorded, without changing existing voting semantics.

Sources: UMass Lowell official rules https://www.uml.edu/fahss/model-un/resources/rules-of-umlmun.aspx ; MSUMUN https://msumun.org/disruptiveness ; GrunnMUN 2021 Appendix I https://teimun.org/wp-content/uploads/2021/02/GrunnMUN-2021-Rules-of-Procedure-1.pdf . Historical examples illustrate differences, not a current universal rule.

Plan: (1) failing tests for sorting, tie variants, mixed types, stable IDs; (2) pure order helper and local presentation preferences; (3) compact blue/white controls, accessible move buttons, explicit suggestion scope; (4) full tests/build and real browser checks including mobile, reload and manual voting; (5) publish preview branch only or provide local preview if protection blocks remote access. Production remains unchanged.

## User correction

Remove manual up/down ordering and the duplicated overview list. Keep a compact suggested-order explanation and rule selector, with direct Pass/Fail on any motion regardless of position. Discard prior manual preview ordering via a new preference namespace. No extra conference precedence invented: automatic scope remains ordinary caucuses pending clarification of broader rule presets. 80 tests/build passed; browser confirmed no move controls/list and out-of-order voting still records the selected motion only.

## Final clarified requirement

The user means a top-level choice between Most → least disruptive and Order proposed, not alternative caucus types. Add a visible Voting order selector with both options. Proposed mode preserves original motion array order across ALL types (mod proposed before unmod stays first); disruptive mode retains researched ordinary-caucus sorting and shows its tie-break setting underneath. Persist mode and migrate older preview preferences to disruptive. No up/down controls or duplicate list. Reference order never blocks choosing any pending motion. Lock setting after the first recorded vote. Preview only.

Validation: new proposed-order regression failed first, then passed after implementation. 23 Node + 58 regression tests = 81 passed; build passed. Actual 390px browser shows mod/unmod reverse when mode changes, hides tie-break setting in proposed mode, has no horizontal overflow, preserves proposed mode after Back/Continue and contains no Move buttons.
