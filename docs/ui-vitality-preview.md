# UI vitality preview — 2026-10-03

User authorized a more lively, polished UI with restrained motion and less blank white. Preview only; production main stays 05921f6.

- Preserve approved MUN Chair OS title, short subtitle, UN blue/white, world map, contact, all flows and FAQ. No additional marketing prose, giant screenshots or new dependencies.
- Homepage: staged entrance, very slow map atmosphere and light breathing on Create Room; keep pointer targets stable and give reduced-motion/static fallback.
- Working pages: pale blue canvas, white working surfaces, a consistent blue accent on headings and borders. Modals enter briefly; live timers/votes do not pulse or drift.
- Button, input, setup, agenda and presentation treatments use shared colors and visible focus. Keep warning/success/error colors distinct.
- Verification: build, existing regression suite, actual desktop/390px homepage, Create/Join, FAQ, motion editor, demo session and paper presentation. Inspect animations and reduced-motion stylesheet; no backend or data changes.

## Verification completed

- `npm run build` passed (existing Browserslist freshness and bundle-size notices remain); `npm test` passed all 30 checks.
- Browser: desktop home, 390×844 and 320×640 home had no horizontal overflow; FAQ scroll and expansion, Create/Join entry, demo entry, motion modal, vote, Paper Presentation, finish/archive, and Settings dialog verified.
- At 1280×720 and 390×844 the Paper Presentation finish control remained visible.
- Two runtime samples confirmed map transform and button glow changed while the Create Room bounding box stayed identical. Reduced-motion shutdown was verified in CSS/code review, not by toggling the OS preference.
- No database/store/backend logic changes or live-room collaboration test in this styling pass.
- Existing uncommitted AGENTS.md and QA artifacts were excluded from the change.
