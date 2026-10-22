# SEO foundation preview — 2026-10-22

Initial approved scope: preview only. User subsequently approved production release on October 22, 2026. Keep the existing cover, headline, blue/white palette, atlas motion and meeting workflows. No database changes, Search Console account changes or production release.

## Design and implementation plan

- [x] Add a descriptive title, standard meta description and production canonical; align existing social metadata.
- [x] Add one compact overview between the cover and FAQ: attendance/co-chairs, speakers/motions, documents/voting/records. Use three editorial rows, no cards or large screenshots.
- [x] Render the real HomePage to static HTML during the Vite build, using Vite's existing SSR support and React DOM server. The browser still mounts the existing App with createRoot; this is a public initial document, not hydration or a change to session restoration. Do not bundle room/store state in the prerender.
- [x] Add robots.txt and a sitemap containing only the public homepage and privacy page. Give privacy its canonical.
- [x] On Vercel preview builds, add noindex to public HTML and disallow preview crawling. Keep canonical/sitemap pointed at the production domain. Include a preview-only notice without changing the production cover.
- [x] Verify SSR with a regression test first, then all tests/build, no-JavaScript HTML, desktop/mobile layout, FAQ, motion pause, create/join/demo navigation and refresh behavior.
- [x] Commit and push only the dedicated feature branch; Vercel preview build status and exact commit verified. Online HTML access is blocked by project authentication (see below). Production unchanged; report local preview as the immediately reviewable result.

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

## Preview delivery and limits

- Preview code commit: `d8845e686d2a4ce0f60aaa05803bb30273a7f153` on `codex/seo-preview-2026-10-22`.
- Vercel Preview deployment `7256551923` and GitHub commit status report success. URL: https://model-un-chair-system-emfw08e12-lawrences-projects-d8428387.vercel.app/
- The URL requires Vercel Authentication. Authenticated MCP fetch failed with project/team access denied (403); no protection setting changed. No installed CLI was found. Online rendered HTML was not verified.
- The identical local preview-mode build is served at http://127.0.0.1:4175/ and was opened in Codex. This URL works on this computer while its preview process is running.
- Create and Join buttons open their correct forms; reloading Join retains the route; demo opens the actual sample committee without creating a Supabase room. Final browser console error/warning scan is clear.
- Read-only production check still shows old title and `/assets/index-DerX_N7Z.js`, without the new overview. `origin/main` remains `047bf100efef4c7c911148f8dd85f8b46869afd2`.
- Search Console has not been connected or modified. Owner should verify munchair.com and inspect its production URL after any separately approved production release. Preview has noindex intentionally and should not be submitted.


## Production release authorization — October 22, 2026

User explicitly requested “发布吧” after reviewing the preview. Release includes only the reviewed SEO change and this evidence log. Fresh tests: 17 top-level Node tests and 58 regression tests pass. Fresh production build passes; generated homepage/privacy omit preview noindex; homepage omits preview notice; robots allows crawling. Rollback baseline: 047bf100efef4c7c911148f8dd85f8b46869afd2, tag production-before-seo-2026-10-22. Search Console remains a separate owner verification task.
