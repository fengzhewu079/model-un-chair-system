# SEO foundation preview — 2026-10-22

Approved scope: preview only. Keep the existing cover, headline, blue/white palette, atlas motion and meeting workflows. No database changes, Search Console account changes or production release.

## Design and implementation plan

- [x] Add a descriptive title, standard meta description and production canonical; align existing social metadata.
- [x] Add one compact overview between the cover and FAQ: attendance/co-chairs, speakers/motions, documents/voting/records. Use three editorial rows, no cards or large screenshots.
- [x] Render the real HomePage to static HTML during the Vite build, using Vite's existing SSR support and React DOM server. The browser still mounts the existing App with createRoot; this is a public initial document, not hydration or a change to session restoration. Do not bundle room/store state in the prerender.
- [x] Add robots.txt and a sitemap containing only the public homepage and privacy page. Give privacy its canonical.
- [x] On Vercel preview builds, add noindex to public HTML and disallow preview crawling. Keep canonical/sitemap pointed at the production domain. Include a preview-only notice without changing the production cover.
- [x] Verify SSR with a regression test first, then all tests/build, no-JavaScript HTML, desktop/mobile layout, FAQ, motion pause, create/join/demo navigation and refresh behavior.
- [ ] Commit and push only the dedicated feature branch, inspect its Vercel preview and verify production is unchanged. Report the preview link and the separate Search Console verification step.

## Acceptance

Raw built HTML includes the same visible overview and FAQs as the interactive homepage, exactly one h1, and no room data. JavaScript controls continue working after the static initial document is replaced. Public production metadata is correct, while preview HTML cannot be indexed. No promise of ranking, indexing or AI citation is made.

## Local verification

- SSR regression first failed with `window is not defined`; after the minimal browser guard, it passes.
- Full test suite: 17 top-level Node tests + 58 existing regression tests passed.
- Production and preview mode builds passed. Raw production artifact has one h1, canonical, description, functional overview and all FAQ answers, without noindex.
- Preview artifact has noindex/nofollow on homepage and privacy page, robots Disallow, and an explicit preview notice.
- Desktop full-page visual check and 390px mobile emulation: existing cover retained; overview fits in a single column on mobile without horizontal overflow. FAQ disclosure and motion pause work.
- Existing Browserlist data notice remains; no dependency updates were introduced.
- Online preview verification pending; Search Console verification requires the owner's account and remains separate.
