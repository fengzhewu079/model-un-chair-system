# Session layout preview

Goal: implement the user's approved layout: center the empty-state next action, emphasize Completed Groups, put export below history, and clarify header hierarchy. Preview only.

Architecture: retain the existing motion handlers, filters, records and export. Conditional CTA placement in MotionsPanel; flex history column in StatusBar; scoped session CSS with mobile overrides. No state or backend changes.

- [x] Empty state: one centered Record a motion CTA; populated state keeps the toolbar CTA and list.
- [x] History: bold heading, actual completed count, short blue underline; export follows records at the bottom.
- [x] Header: separate name and committee; increase spacing before status/room metadata without shrinking room ID.
- [x] Verify production build; real browser empty-state screenshot, CTA opening and motion saving/list transition. At 390px viewport document width does not exceed viewport.
- [ ] Publish only codex/ui-preview; retain production main.
