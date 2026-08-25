# Feature Status Delta — Milestone 4 Start

Dokumen ini mencatat delta status yang harus direkonsiliasi kembali ke `docs/FEATURE_STATUS_CHECKLIST.md` pada closure Milestone 4 tanpa menghapus detail historis tracker utama.

## Completed milestones

- Milestone 2 — TKA SMP Mini + Core Product: **COMPLETE**.
- Milestone 3 — TKA SMP Learning Loop V1: **COMPLETE + ACCEPTED**.
- PR #10 merged into `feat/schema-v2` as `ee306041fbfee3f5d1a2dc99cfa44613778e11a5`.

## Active milestone

Milestone 4 — TKA SMP Monetization: **ACTIVE**.

### 4.1 Catalog + Access Contract

- [x] Catalog audited
- [x] TKA SMP Pass 30-day price locked on staging: Rp29.000
- [x] TKA SMP Pass 90-day price locked on staging: Rp69.000
- [x] Products activated on staging
- [x] Exactly one open ACTIVE price per product verified
- [x] 10 feature mappings per product verified
- [x] learner catalog exposure through authenticated learner RLS; no service-role dependency on the pass page
- [x] server-side entitlement enforcement for SMP section starter behind dark-launch flag
- [x] Full Tryout unlimited semantics while usable pass entitlement exists
- [ ] browser negative access tests with monetization enforcement enabled

### 4.2 Payment + Fulfillment

- [x] Existing Midtrans checkout foundation audited
- [x] Webhook signature validation audited
- [x] Amount verification audited
- [x] Webhook idempotency foundation audited
- [x] Privileged fulfillment execution boundary audited
- [ ] paid sandbox E2E
- [ ] duplicate webhook E2E
- [ ] pending/cancel/deny/expire coverage
- [ ] cross-user payment sync/BOLA test

### 4.3 Expiry + Renewal

- [x] renewal stacking implemented from later of paid-at / current usable entitlement expiry
- [x] learner pass status + effective expiry UX implemented through own-entitlement RLS
- [x] renewal CTA changes package actions to perpanjangan for learners with an active pass
- [ ] paid-state browser proof for active/scheduled renewal UX
- [ ] expired/no-entitlement access-denial E2E

### Current exact-head evidence

At implementation head `6b9403d376f702fc5666c0569e0bd283076058a4` before this documentation-only sync:

- CI #320: **SUCCESS**
- Content Review Staging E2E #114: **SUCCESS**
- TKA SMP Staging E2E #181: **SUCCESS**
- TKA suite preserved the existing M2/M3 core browser flows and verified the unauthenticated redirect, learner pass catalog, inactive-pass learner state, mobile layout, prices, and sandbox Snap loader.

These are current-slice gates, not Milestone 4 closure gates; closure exact-head must be rerun after paid/negative-access work.

### 4.4 Closure

- [ ] admin order/payment verification
- [ ] payment-integrity audit
- [ ] final M2/M3 regression
- [ ] final exact-head CI/E2E
- [ ] QA artifact cleanup

See `docs/TKA_SMP_MONETIZATION_AUDIT.md` for the full audit.
