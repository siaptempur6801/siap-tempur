# TKA SMP Monetization — Milestone 4 Audit

Status: **ACTIVE / STAGING ONLY**  
Branch: `feat/tka-smp-monetization-v1`  
Base: `feat/schema-v2`  
Production: **NO-GO**

## Goal

Menyelesaikan Tempur Pass TKA SMP sebagai lifecycle penuh:

```text
package visible
→ checkout
→ payment state
→ verified fulfillment
→ entitlement issued
→ premium access granted
→ expiry enforced
→ renewal
→ access revoked when no usable entitlement
```

Milestone 4 tidak mengubah production atau `main`. Semua payment/entitlement QA dilakukan terhadap staging `lpgrivowdcepcxradavu`.

## Existing foundation verified

### Learner UI / checkout

- `TkaPassPackagesClient` sudah tersedia.
- `createTkaPassTransaction` membatasi product code ke pass sesuai jenjang.
- Checkout memakai server-side authenticated user.
- CSRF dan rate limit sudah ada.
- Midtrans Snap callback melakukan status sync.

### Payment integrity

- Order dibentuk server-side dari active product + active price.
- Amount checkout berasal dari catalog server-side, bukan input client.
- `syncUserOrder` memverifikasi order milik learner.
- Provider amount harus sama persis dengan `orders.total_amount`.
- Webhook Midtrans diverifikasi dengan SHA-512 signature dan timing-safe comparison.
- Webhook event memiliki idempotency state melalui `payment_webhook_events`.

### Fulfillment / entitlement

- `fulfill_paid_order` hanya executable oleh `postgres` / `service_role`; learner/anon tidak memiliki EXECUTE.
- Successful `capture` / `settlement` menandai order paid.
- Product features menjadi entitlement dengan source `order_item`.
- Unique entitlement source membuat duplicate paid fulfillment pada order yang sama idempotent.
- Entitlement memiliki `starts_at`, `expires_at`, `usage_limit`, `usage_count`, `status`.

### RLS

- learner hanya dapat membaca order miliknya.
- learner hanya dapat membaca payment melalui order miliknya.
- learner hanya dapat membaca entitlement miliknya.

## Product catalog decision V1

Pricing staging dipilih konsisten dengan existing TKA SD pass catalog:

| Product | Duration | Price |
|---|---:|---:|
| `TKA_SMP_PASS_30` | 30 hari | Rp29.000 |
| `TKA_SMP_PASS_90` | 90 hari | Rp69.000 |

Admin fee checkout existing tetap Rp500.

Migration staging:

`20260823065718_tka_smp_pass_catalog_v1`

Verification:

- kedua product `ACTIVE`
- tepat 1 open ACTIVE price per product
- currency `IDR`
- 30-day = `29000`
- 90-day = `69000`
- product-feature mapping tetap 10 feature per product

## Product → feature mapping verified

Kedua pass memberikan feature yang sama:

- `tka.smp.analytics.full`
- `tka.smp.drill.unlimited`
- `tka.smp.explanation.full`
- `tka.smp.full_tryout.regular`
- `tka.smp.material.premium`
- `tka.smp.mini_tryout.unlimited`
- `tka.smp.progress.history`
- `tka.smp.recommendation`
- `tka.smp.remedial.auto`
- `tka.smp.wrong_questions`

## Exam access contract audit

Current catalog:

### Full Tryout

- slug: `tka-smp-full`
- access: `PREMIUM`
- required feature: `tka.smp.full_tryout.regular`
- current attempt limit: 5

### Mini Bahasa Indonesia / Matematika

- access: `FREEMIUM`
- free attempt limit: 1
- required feature: `tka.smp.mini_tryout.unlimited`

Intended V1 contract:

- Mini: 1 free attempt per exam; usable Tempur Pass bypasses free quota.
- Full: usable Tempur Pass required.
- Existing in-progress attempt remains resumable; entitlement is checked before creating a new attempt.
- Expired/inactive/not-yet-started entitlement is unusable.
- Access decisions must be enforced server/database-side, never UI-only.

## Blocking finding — M4 access enforcement

The current staging section engine intentionally used during Milestone 2/3 calls:

`public.start_exam_attempt()` → `app_private.start_exam_attempt_for_user()`.

The private starter currently validates active profile, active track, exam state, section/item/version integrity, and raw attempt limit, but **does not yet enforce `access_type` / `required_feature_id` / entitlement**.

Consequences before M4 access hardening:

- staging Full Tryout can still start without Tempur Pass;
- second Mini attempt remains blocked by raw `attempt_limit=1` even when an unlimited-Mini entitlement exists.

This is the primary M4 functional blocker.

## Full Tryout unlimited semantics

Product UI promises regular Full Tryout + Mini Tryout unlimited during pass validity. Current Full exam still has `attempt_limit=5`.

For M4 V1, access behavior should be normalized so an active pass is not unexpectedly blocked by a static five-attempt cap. This must be implemented and regression-tested before closure.

## Renewal finding

Current fulfillment creates every purchase entitlement with:

```text
starts_at  = paid_at
expires_at = paid_at + duration_days
```

A second purchase before current pass expiry therefore overlaps the previous entitlement and can waste remaining paid days.

M4 renewal should stack duration from the later of:

```text
paid_at
current usable entitlement expiry
```

while preserving source-per-order idempotency.

## Milestone 4 slices

### 4.1 Catalog + Access Contract

- [x] Audit product catalog
- [x] Lock staging price 30-day = Rp29.000
- [x] Lock staging price 90-day = Rp69.000
- [x] Activate SMP pass products on staging
- [x] Verify exactly one open price per product
- [x] Verify 10 feature mappings per product
- [ ] Expose SMP pass catalog in learner staging UI
- [ ] Harden section starter to enforce entitlement contract
- [ ] Normalize Full unlimited semantics
- [ ] Negative access tests

### 4.2 Payment + Fulfillment

- [x] Existing Snap checkout present
- [x] Existing signature validation present
- [x] Existing amount verification present
- [x] Existing webhook idempotency present
- [x] Existing entitlement fulfillment present
- [ ] Paid sandbox lifecycle E2E
- [ ] Duplicate webhook E2E
- [ ] pending/failed/cancel/expire verification
- [ ] cross-user sync/BOLA verification

### 4.3 Expiry + Renewal UX

- [ ] Stack renewal duration safely
- [ ] Show active pass / expiry to learner
- [ ] Renewal CTA
- [ ] Expired entitlement access denial
- [ ] No-entitlement access denial

### 4.4 Closure

- [ ] Admin order/payment verification
- [ ] Paid E2E green
- [ ] Expiry/no-entitlement E2E green
- [ ] Security/payment-integrity audit green
- [ ] TKA SMP M2/M3 regression green
- [ ] CI exact-head green
- [ ] 0 leaked disposable users/orders/QA artifacts

## Production boundary

Completing M4 means **staging-ready monetization**, not automatic production activation.

Production rollout remains a separate Milestone 5 decision. The first Schema V2/TKA SMP production cutover must keep monetization as a separately controlled release until core production stability is proven.
