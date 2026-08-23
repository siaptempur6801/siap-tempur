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
- [ ] learner catalog exposure
- [ ] server-side entitlement enforcement for SMP section starter
- [ ] Full Tryout unlimited semantics
- [ ] negative access tests

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

- [ ] renewal stacking
- [ ] active pass/expiry UX
- [ ] renewal CTA
- [ ] expired/no-entitlement E2E

### 4.4 Closure

- [ ] admin order/payment verification
- [ ] payment-integrity audit
- [ ] M2/M3 regression
- [ ] exact-head CI/E2E
- [ ] QA artifact cleanup

See `docs/TKA_SMP_MONETIZATION_AUDIT.md` for the full audit.
