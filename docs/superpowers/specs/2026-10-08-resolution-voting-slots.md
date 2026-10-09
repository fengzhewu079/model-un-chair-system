# Fixed paper slots for resolution voting

User requirement: Enter Voting must declare how many papers will be voted on. A round with three slots stops after three paper decisions and ends with Finish group.

Implementation: Enter Voting has a required positive whole-number voteCount; old records default to one slot. The passed source motion ID scopes the voting page and local draft key. Each Pass/Fail records one local result. Returning preserves the current draft and previous results. No extra slot or next-paper action exists at capacity. Finish group validates exactly the declared count and unique draft IDs, builds one completed group of resolution records, marks the source votingComplete, and saves against a fresh shared version in collaboration mode. Completed sources no longer expose the entry. No-count manual Pass/Fail, Quick Tally, Roll-call Vote, rules and celebration are retained.

Persistence: unfinished voting results are local until Finish group, and not live co-edited. Shared serialization retains the count and completion flag. No database migration.

Validation: 64 total tests pass; production build and targeted whitespace checks pass. Local browser: Enter Voting count 3, procedural Pass, paper 1 Pass, paper 2 Fail, Back and re-entry restored both, paper 3 Pass showed only Finish group, then completion hid the source entry. Real multi-chair network save not tested. Not deployed to production.
