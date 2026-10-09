# Siap Tempur interaction standards

Canonical contract, 2026-10-09. Visual tokens and component ownership: [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md). Domain rules and permissions remain on the server. This document changes presentation and interaction mechanics, not scoring, session duration, question order, quotas, transactions or persistence.

## Dialogs, confirmations and drawers

Follow [APG modal dialogs](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) and [alert dialogs](https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/). Use the existing native `DialogSurface`; admin/domain adapters keep their own form and navigation behavior.

- A modal is actually modal: background inert, focus inside, Tab/Shift+Tab cycle through enabled visible controls, page scrolling locked. Nested dialogs must occupy the top layer and restore focus into their parent.
- Every dialog has a visible linked title. A short consequential alert dialog links its message with `aria-describedby`. Do not flatten long structured exam summaries into a single description; keep readable semantic structure.
- Initial focus favors Cancel for consequential/destructive decisions. A long structured dialog may focus its title with `tabIndex=-1` so the beginning stays visible. Do not focus a destructive commit by default.
- On cancellation, restore the connected trigger without moving the page. When the trigger has disappeared (e.g. closed mobile menu), explicitly choose the surviving menu button or next workflow target.
- Escape and backdrop mean Cancel on safe dialogs. Clicking blank padding inside the panel is not a backdrop click. During unsafe pending operations, close, Escape, backdrop and duplicate commit are blocked.
- Dirty forms require a clear discard confirmation. Cancelling it preserves all entered data. An Escape meant for a child confirmation must not also close its parent.
- Dialog bounds stay at least 16 px within short mobile viewports. Long content scrolls within the panel; primary/cancel controls remain reachable. Navigation/filter/preview drawers do not host long multi-step forms.
- Do not introduce confirmations for routine question navigation or saving an answer. Existing exam warnings and completion transitions keep their triggers and timing.

## Buttons and forms

- Use `<button type="button">` for UI toggles; preserve existing submitters and server-action form ownership. Use links for destinations; never nest a link and button.
- Give icon-only buttons an explicit name and visible focus. Decorative icons use `aria-hidden`. Buttons expose pending text and `aria-busy` when useful, and must be guarded against duplicate requests.
- Visible labels connect to controls. Hint/error IDs connect through `aria-describedby`; invalid controls use `aria-invalid`. Related choices use a group/fieldset and a legend.
- Errors appear near the affected field; after validation, focus the first invalid field when that helps correction. Form-wide failures use an inline alert and retain entered data. Avoid a second toast repeating the same error. Success feedback follows a confirmed result.
- Required/format/minimum constraints must match existing domain validation. Do not relax passwords, server validation or permissions for UI convenience.
- Pending forms retain input, disable unsafe navigation/dismissal, and protect unsaved changes using the existing guard. Do not infer that an HTTP request started successfully from a button click.
- Native selects are valid accessible controls. Use a custom combobox only when actual search/selection requirements justify it; then implement APG keyboard semantics with an existing suitable primitive.

## Menus and navigation

- Disclosure buttons expose `aria-expanded` and link their content. Escape closes a transient menu and returns focus to its trigger. Pointer-away and focus leaving the disclosure close it without trapping ordinary navigation.
- A disclosure containing ordinary links is not an ARIA menu unless full menu keyboard behavior is implemented. Keep links tabbable, use a labelled navigation region, and close when a destination is chosen.
- Permission-aware navigation stays permission-aware. Keep `lib/admin-routes.ts`, `AdminLink`, return URLs, filter state and `prefetch={false}` optimization contracts.
- Mobile drawer closure restores its trigger; selecting a route produces a clear active destination. Browser Back and refresh preserve URL-backed filters and domain context.

## Tables and filters

- Align numeric values consistently and retain units/date formatting. Use semantic table headers and named focusable horizontal scrolling regions.
- Search/filter changes reset pagination through the existing server contract. Detail/return links retain search, status, program and track when applicable.
- Distinguish no records from no matching records. Explain how to clear filters or create the resource. Loading/error/empty states do not masquerade as success.
- Overflow row actions have a resource-specific accessible name. Dense row actions keep their documented desktop/mobile sizes rather than using a global control-height rule.

## Learning and exams

- A learner sees current progress, the next useful action and access status in that order. Emphasis must not make every card/button appear primary.
- Questions, selected/flagged states, timer, save status and navigation remain stable under updates. Never announce every timer tick through a live region.
- Save success reflects an acknowledged answer; failed saving offers recovery using the existing queue. Manual completion still waits for the save barrier; no UI refactor bypasses it.
- Exit/completion confirmations reuse existing handlers and pending locks. Keep token deductions, answer order, scoring, expiry handling, resume and completion semantics intact.
- Do not persistently cache private answers or permissions to solve a visual interaction issue.

## Verification contract

Use [WCAG 2.2](https://www.w3.org/TR/WCAG22/) as the target: keyboard access, no accidental traps, visible/unobscured focus, reflow, contrast, names/roles/states, error identification and status messages. Test mouse, keyboard and touch-sized controls at 1440×900, 1024×768 and 390×844; add 390×568 for dialogs. Respect reduced motion.

For each changed surface: identify actual URL/title/content, review before/after screenshots, test Tab/Shift+Tab/Escape/focus return, pending/double-click/failed request where relevant, preserve input/context, and record console/page errors. Native-browser tests supplement unit assertions. Screen-reader, real mobile keyboard and Safari/Firefox results must be listed explicitly; Chromium emulation does not certify them.
