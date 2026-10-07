# Round Robin

Approved: add Round Robin with chair-selected seconds, automatic present-delegate queue, reordering/skipping and existing paused-return behavior. Preview only.

Flow: optional topic + positive whole seconds → vote → executing → seed current attendance once → reorder/start/skip/next/pause/back → Finish Motion. Initial form total is an estimate using current attendance; first entry uses the then-current roster. No database changes. Same local-progress/shared-completion boundary as Mod. Reset preserves the queue/order, restores speaker durations. Empty queues can finish.

Verified: 43 automated tests and build; live room recorded/passed 45-second Round Robin, auto-added France/Brazil and moved Brazil first. Regression covers absent exclusion, custom seconds, invalid zero, reorder, return preserving remaining time, skip, reset and finished export.

Topic is optional on both creation and post-vote correction. Blank entries retain the Round Robin type label without an empty topic line.
