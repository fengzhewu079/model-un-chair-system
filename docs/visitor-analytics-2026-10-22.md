# Visitor analytics — 2026-10-22

User requested real visitor counts and authorized adding the missing collection code and publishing it. The signed-in Vercel Analytics dashboard showed Get Started and no collected data; zero was not evidence of zero visitors. The production insights script endpoint already returned 200.

Scope: use the official @vercel/analytics 2.0.1 SDK once at startup. Collect production public app opens/reloads only, without custom events or meeting navigation tracking. Exclude development, preview deployments and unknown hosts/paths. The beforeSend hook returns only the canonical homepage URL, stripping query strings, fragments and extra payload. Provider metadata/referrers remain subject to Vercel's privacy policy. Update the privacy notice accordingly. Do not change meeting features or data.

Validation: privacy filter tests first failed before implementation, then passed. All 19 Node tests and 58 regression tests passed (77 total); TypeScript, Vite production build and homepage prerender passed. Existing stale Browserslist notice only. Production publication and collection will be checked separately. Historical visits cannot be backfilled.

Rollback baseline: 6dcab823c4ac4b8710d9a4637af475d0350dbc84, tagged production-before-visitor-analytics-2026-10-22 before publication.
