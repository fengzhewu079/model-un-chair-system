# Local presentation documents

**Goal:** Implement the approved Open document flow on preview only.
**Architecture:** A page-local document component sits alongside the existing timer. No cloud upload, persistence or shared-payload change. Leaving/refreshing the page clears the document. PDF uses a lazy-loaded PDF.js 6.4.299 canvas viewer with same-origin fonts, codecs and worker, raster images use img, UTF-8 text is rendered literally. Other formats display an honest local-app fallback. Fullscreen includes the timer.

- [x] Add regression tests for preview classification, empty/oversize files, PDF signature validation, active content fallback and plain-text limits; run red.
- [x] Add src/utils/presentationDocument.ts and src/components/PresentationDocument.tsx. Async selections ignore stale reads; replacement/removal/unmount revoke object URLs. Cancel preserves selection; errors leave current document intact.
- [x] Move Paper Presentation immediately below Extend Unmoderated Caucus in RecordMotionGroupModal. Integrate optional document panel and fullscreen in PaperPresentationPage, with scoped responsive CSS and no timer logic changes.
- [x] Run tests/build/diff check and browser demo: menu, document selection/replacement/removal, PDF/image/text/fallback, timer/Q&A, fullscreen and narrow layout. Publish only codex/ui-preview if checks pass; report deployment access limits.

Limits: 50 MiB file size, 2 MiB text preview; unsupported documents remain on the computer and must be opened with their usual application. No claim of automatic native-app launching. PDF has Previous/Next and zoom/fit controls; retain a separate-tab link as fallback.

## Verification
- 34 tests pass; TypeScript and Vite build pass. Existing Browserslist/chunk warnings remain. npm audit reports existing toolchain advisories; no pdfjs-dist entry.
- Built-app browser demo: dropdown order, PDF content, two-page navigation, zoom/fit, fullscreen entry, image decoding, literal text, PPT fallback, bad PDF preserving prior selection, removal, timer continuity, Q&A return/reentry (16 seconds), Finish archive. 390px/320px no page overflow.
- PDF native iframe was blank in the in-app browser; replaced with bundled PDF.js. No online document conversion service. Worker and optional font/CMap/WASM assets are served locally/from our deployment.
- No real multi-chair or Safari test this round. File contents never enter store, localStorage or shared payload (code reviewed). Browser tests used synthetic fixtures only.
- Build requires Node compatible with PDF.js (>=22.13 or >=24); local validation used Node24.

## 2026-10-06: Continuous reading
- Replaced Previous/Next navigation with vertically stacked PDF pages in a keyboard-focusable scrolling region; retained zoom and fullscreen.
- Render only pages near the reading viewport, retaining measured page heights and cancelling stale drawing tasks.
- Built-app verification: synthetic two-page PDF scrolled down and back up with the wheel; page 2 content visibly rendered underneath page 1, zoom works and no browser errors. Build and all 34 existing tests pass.

## 2026-10-06: Fullscreen document stage
- Fullscreen document fills the viewport; existing timer becomes a compact top-right control with start/pause/resume. Hide title, full sidebar and finish/Q&A transition actions until exiting; retain zoom and scrolling.
- Preserve PDF reading anchor across width/zoom changes without remounting the reader or timer. Exit button and explicit Escape handler return to normal layout.
- Verified built app with two-page PDF: fullscreen wheel scroll to page 2, timer counts down and pauses at 9:37, exit preserves the same reading passage and time; Q&A fullscreen timer starts correctly. Escape initially did not exit in embedded browser; explicit handler then verified. Build and 34 tests pass. No mobile fullscreen device test.
