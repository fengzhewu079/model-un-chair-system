# Homepage preview

Approved: one heading, one short description, Create / Join / Try demo, real current session screenshot; bright UN blue with white labels, no decorative cards. FAQ content retained. Production unchanged.

Plan: update HomePage layout and remove repeated descriptive prose; capture current local demo as screenshot; preserve three workflow previews with current screenshots; run build and existing tests; verify desktop/mobile, entry routes and FAQ; deploy preview branch only.

No backend, room data format, authentication or session changes.

Verification: production build and 25 existing tests pass. Browser verified Create, Join, Try demo, all three image choices and FAQ expansion. Current screenshots captured from real UI. Exact main button computed color is rgb(0,158,219). Mobile viewport override did not apply to document width; mobile visual verification remains incomplete. Previous preview b52b0c8 remains recoverable.

User revision: remove the entire oversized screenshot and three-step image switcher. Keep heading, short description, Create / Join / Try demo and all FAQs. Keep configured walkthrough link if available. Removed only homepage presentation and unused component state; existing routes remain unchanged. Build passed.
