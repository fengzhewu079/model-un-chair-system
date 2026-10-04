# Editorial UI preview — 2026-10-03

User correction: color-only styling still looks generic and segmented; ambient motion was too subtle. User authorized researching real products before continuing, autonomous design choices, privacy footer; preview only.

## References and chosen direction

- Linear: https://linear.app/now/how-we-redesigned-the-linear-ui and https://linear.app/now/behind-the-latest-design-refresh — align navigation and content, reduce visual weight of chrome, preserve familiar behavior. Apply to the actual meeting workspace.
- Liveblocks: https://liveblocks.io/ — observed homepage hero with a collaborative cursor motif. Borrow the idea that motion relates to the product; do not add fake presence or use their assets.
- Stripe: https://stripe.com/ — observed asymmetric heading/art relationship and a continuous decorative surface. Borrow composition, not their palette or illustration.
- WCAG pause/stop guidance: https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html — continuous decoration gets a pause control and reduced-motion fallback.

## Implementation plan

- [x] HomePage + home-vitality.css: replace centered template with editorial two-line title, original approved words/entry actions/contact, borderless atlas composition; local SVG routes run continuously. Keep FAQ below the fold.
- [x] Add HomeAtlas.tsx: decorative local SVG coast asset and route paths, CSS animation only, no data/network/presence claims. Pause/resume state on HomePage; preference-aware initialization and listener; no animation if reduced motion requested.
- [x] MainSessionPage/HeaderBar/MotionsPanel + scoped session-refinement.css: compact room header, quiet history navigation and list-like motion groups. Keep all handlers/store/data unchanged.
- [x] public/privacy.html: actual local/shared storage, provider resources and deletion limits verified against code; concise footer link, independent-tool note and contact.
- [x] Verify desktop/390px/320px home, pause/resume sampling, reduced-motion styles, action hit targets, FAQ/privacy links, demo motion group/create/edit/vote/execute/archive and settings. Build + existing regression tests.
- [ ] Commit/push codex/ui-preview only; confirm Preview success and unchanged production main 05921f6.

## Scope limits

No new dependencies, backend changes, additional marketing sections, invented use counts, legal compliance promises, or production deployment. Keep previous preview available for comparison.

## Verification outcome

- Build passed and all 30 existing tests passed. Existing chunk-size and Browserslist notices remain.
- Browser-verified desktop and 390/320px homepage widths; atlas opacity uses a responsive variable so its completed entrance animation cannot override the mobile value. Observed ongoing dash-offset changes, then two identical samples while paused; resume worked. Reduced-motion behavior was inspected in code, not through an OS preference change.
- Verified Create/Join routes, demo entry, FAQ scroll/expand, Privacy link and return. Privacy page has no new third-party resources.
- Verified two-motion group recording, reopen for correction, save, start voting, pass, Enter Mod, add/complete speaker, Finish Motion, completed sidebar record and Settings. Checked narrow workspace after final readability changes; 320px tools wrap without overflow. No real multi-chair backend operations performed.
- Review corrected undersized metadata/buttons: main text 14–16px, auxiliary labels at least 12px, room ID 14px monospace/600, controls at least 44px.
- Pre-existing AGENTS.md edits and QA assets excluded from commit.
