# UI/UX remediation report

Date: 10 October 2026
Checkout: `/Users/dirga/Projects/siap-tempur` (`uiux/shared-foundations-2026-10-09`)

## Changes

- Replaced oversized learning titles and repeated hard-outline accents on focused practice, Full Tryout setup, Mini Tryout, history, and ranking with compact headings, semantic badges, neutral borders, and shared `Button`/`PageHeader` components.
- Removed the paper background and entrance movement from learner ranking and exam surfaces.
- Restyled CPNS profile navigation and sidebar identity/actions for learning mode, with larger mobile targets and softer surfaces.
- Updated the CPNS practice session to body typography, calm answer states and controls, and native accessible image/time dialogs. Timer status remains readable without pulsing animation.
- Audited profile and account flows across CPNS and TKA SD/SMP/SMA: limited payment-history orders to the current program, corrected out-of-range history pagination, mapped refund/chargeback states, made payment callback messaging reflect whether status verification actually succeeded, and revalidated voucher claims for every dynamic TKA level route.
- Replaced the profile photo preview/cropper overlays with the shared native dialog and focus handling, showed edit validation errors inline, made birth-date bounds follow Jakarta time, and reduced the CPNS profile heading to the shared learning header scale.
- Made single-action exam time notices use a full-width CTA while confirmation dialogs with cancel/confirm keep their two-column action layout.
- Reduced the TKA review explanation card to a neutral surface and removed the last-minute timer pulse.
- Corrected CPNS session route detection in both the dashboard layout and shell: only `/tryout/[sessionId]` is full-screen exam; `/tryout/[sessionId]/result` returns to the learning shell and sidebar. The nested session layout now applies only to the active session.
- Fixed the CPNS dashboard's weak-section recommendation deep link: destination heading IDs are normalized to lowercase to match section keys, so the recommended TKP/TIU/TWK heading is brought into view.
- Corrected the TKA review expectation to learning mode and verified that TKA result routes use the normal learning shell. Narrowed global learning selectors so authored rich-text headings and functional rotated icons keep their intended hierarchy/behavior.
- Restyled reviewed TKA diagnostic/history/result and CPNS assignment/event/purchase surfaces; event flyer priority now follows the first visible flyer to avoid LCP warnings.
- Kept the admin module organization, business flows, permissions, route state, and data behavior intact; shared admin confirmations continue using the common dialog surface.
- Follow-up CPNS dashboard sweep found that the shared profile root did not declare learning mode, leaving legacy account controls outside the compact UI contract. Its profile CSS module also used a repeated selector for a class attached only once, so its style rules did not match. Fixed both issues and added shared profile action buttons, descriptive profile-field icons, and neutral account detail surfaces.
- Aligned CPNS token/pass package cards and focused-practice/result actions with the shared Button, PageHeader, and semantic surface tokens; added a retry action to the event loading error and retained return destinations on active-session/result login redirects.
- Removed the ranking page's duplicate viewport frame and remaining English score label. Confirmed the CPNS choose-path links resolve to learner routes and the active subtest anchors.

No scoring, answer ordering, save barriers, session lifecycle, token/quota behavior, authorization, persistence, or admin domain workflow was changed by the presentation updates.

## Validation

Final check results for this checkout:

- `npm run lint` — PASS, zero warnings.
- `npm run typecheck` — PASS.
- `npm run test:unit` — PASS, 856 tests across 117 files (including corrected TKA review/result shell expectations).
- `npx next build --webpack` — PASS from an isolated temporary copy, preserving the already-running local dev server.
- `git diff --check` — PASS.
- Local browser inspection — CPNS landing/dashboard/result/event, focused practice, Mini Tryout, history, TKA tryout result/diagnostics, and admin dashboard/question-bank workspace rendered with expected content. Event page error/warning log was empty after the flyer priority adjustment. No purchase, sign-out, exam submission, or admin mutation was performed.
- Read-only public Chromium E2E — 19/19 checks passed against an isolated production build: CPNS landing menu/anchors/sticky CTA across seven viewport sizes, blog index/detail/not-found, and legacy admin workspace routing. The repaired dashboard deep link was also opened in the authenticated browser and verified to place `TKP · Tes Karakteristik Pribadi` at the viewport top.
- Final isolated production build after the profile audit — PASS (`npx next build --webpack`).
- Browser profile review — CPNS and TKA SD/SMP/SMA profile pages rendered with the correct active program/level and no horizontal overflow at 390×844; history and settings tabs remained reachable. Password validation and dialog dismissal, delete-account cancellation, profile edit cancellation, and avatar-preview close were checked without changing account data.
- CPNS deep follow-up — source sweep of all `app/cpns/dashboard` route modules and their shared dashboard/profile/commerce components; read-only browser review of profile, transaction/settings tabs, choose-path hub, ranking, and Full Tryout setup. Some data-backed route visits showed their loading skeleton during the sweep; the remaining states were checked in source. `npm run lint`, `npm run typecheck`, `git diff --check`, and an isolated `npx next build --webpack` pass after this follow-up.

The local development server on port 3000 returned a broken HMR WebSocket response in a fresh Playwright browser, preventing hydration there. The public E2E pass succeeded against an isolated production build on port 3100; the existing port 3000 process was left untouched. Profile routes received an additional visual pass at desktop and 390×844, but the rest of the product does not yet have a full responsive screenshot pass. Physical devices, Safari/Firefox, screen-reader certification, mutating admin workflows, account deletion, password changes, purchases, and real exam/session submission remain unverified.

## TKA all-page follow-up

- Made SD/SMA Tempur Pass pages status-only while Mini/Full Tryout flows are unavailable; kept current pass status visible, suppressed new package offers, and skipped loading Midtrans on those pages.
- Matched TKA profile and choose-path copy to pass availability and removed duplicate level links from the choose-path header.
- Added a direct Tempur Pass link beside disabled SMP tryout actions and after focus-drill errors that say a pass is required.
- Prevented TKA SD results from falling back to SMP learning-focus recommendations/remedial links; returned SD results to TKA history and clarified score points versus question counts.
- Fixed TKA result/review level typography and changed SD/SMA dashboard question totals to “soal terdata.”

Validation for this follow-up: lint, typecheck, and `git diff --check` pass. At 390×844, reviewed TKA routes showed no horizontal overflow. The browser confirmed no SD pass checkout controls or Midtrans script, no SMP topic links on SD results, correct SD history destinations, and package links on locked SMP Mini Tryout cards. No payment, exam start, answer submission, or test suite was run in this follow-up.

## Cross-contract correction — 11 October 2026

- Aligned the root experience mode in `TkaInteractiveReviewClient` with the learning-mode TKA review shell. This prevents global exam-mode background and motion rules from leaking into review and pembahasan views.
- Validation: `npm run lint`, `npm run typecheck`, and `git diff --check` pass. This specific correction was source-reviewed but did not receive a fresh authenticated browser screenshot in this pass.

## Admin P2 follow-up — 11 October 2026

- Added an assignment-scope selector to batch Monitoring and Reports. It keeps the organization, batch, and validated return destination in the URL; switching scope clears the participant search/status/page filters.
- Added a responsive filter disclosure to `AdminTableToolbar` for widths up to 1023 px. The native disclosure is keyboard-operable and reports active filters; Apply/Reset remain visible while closed. Desktop retains the visible primary filter and the separate advanced-filter disclosure.
- Validation: isolated production `next build --webpack`, lint, typecheck, and `git diff --check` pass. An authenticated disposable-admin browser review covered Monitoring at 1440×900 and 390×844 plus Reports at 1024×768: desktop filters were visible; the mobile disclosure opened with Space, closed with Escape, and restored focus; status Apply/Reset and context retention worked; horizontal overflow and page errors were absent. The staging batch had no assignment rows, so the selected-assignment branch was not exercised and no staging records were mutated.

## Full Admin Workspace audit — 11 October 2026

- Reviewed 21 primary admin routes from Dashboard through Assessment, Content, Event, Instansi, Monitoring/Reports, Commerce, Users, and Settings/Audit Log. At 1440×900, 1024×768, and 390×844 they returned HTTP 200, rendered one main H1, and had no document-level horizontal overflow.
- Tested mobile navigation with keyboard: Enter opened the native drawer, focus moved inside it, Escape closed it, and focus returned to the menu trigger.
- Fixed the Article editor's duplicate Tiptap Link extension and labeled the cover URL field explicitly with a linked hint. The hidden file input has a descriptive accessible name.
- Clarified the product status error shown for an existing Active product whose readiness gate is incomplete. The copy now explains the persisted status and directs the admin to choose Draft or Diarsipkan before saving; no readiness or activation rules changed.
- Read-only detail checks covered one question, one product, and one order. Staging had no Assessment/Event/Instansi records for detail checks and no assignments for the selected-assignment branch. No records were changed.
- Validation: `npm run lint`, `npm run typecheck`, `git diff --check`, and isolated production `npx next build --webpack` pass. Browser follow-up confirmed the corrected article label and upload action, corrected product message, and no Article editor console warnings/errors. Screen-reader certification, other browser engines, and mutating workflows remain open.
