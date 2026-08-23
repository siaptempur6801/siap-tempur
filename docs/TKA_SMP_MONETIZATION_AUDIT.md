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

- `TkaPassPackagesClient` tersedia untuk Tempur Pass SMP.
- `/tka/smp/pass` memakai authenticated learner Supabase server client untuk membaca catalog melalui RLS; learner page tidak bergantung pada service-role.
- Learner tanpa pass melihat state `Belum ada Tempur Pass aktif` dan catalog 30/90 hari.
- Learner dengan pass memiliki UI status pass, effective expiry, dan renewal CTA.
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
- Renewal pass menumpuk durasi dari later of `paid_at` / current active entitlement expiry dan diserialisasi per learner untuk mencegah concurrent renewal kehilangan durasi.

### RLS

- learner hanya dapat membaca order miliknya.
- learner hanya dapat membaca payment melalui order miliknya.
- learner hanya dapat membaca entitlement miliknya.
- catalog learner memakai tabel public yang memang readable untuk role `authenticated`; tidak ada grant baru yang dibuka untuk monetization page.

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

## Exam access contract

Current catalog:

### Full Tryout

- slug: `tka-smp-full`
- access: `PREMIUM`
- required feature: `tka.smp.full_tryout.regular`
- stored attempt limit: 5

### Mini Bahasa Indonesia / Matematika

- access: `FREEMIUM`
- free attempt limit: 1
- required feature: `tka.smp.mini_tryout.unlimited`

V1 contract implemented in `20260823070444_tka_smp_monetization_access_contract_v1.sql` behind feature flag `tka.smp.monetization_enforcement`:

- Mini: 1 free attempt per exam; usable Tempur Pass bypasses free quota.
- Full: usable Tempur Pass required when enforcement is enabled.
- Usable pass bypasses the static Full Tryout attempt cap, providing unlimited regular Full Tryout semantics while entitlement remains usable.
- Existing in-progress attempt remains resumable; entitlement is checked before creating a new attempt.
- Expired/inactive/not-yet-started entitlement is unusable.
- Access decision is enforced database-side in the private starter, not UI-only.

The flag remains **OFF** during dark launch so M2/M3 behavior is unchanged until paid lifecycle + negative-access browser QA are ready.

## Renewal stacking

Implemented in `20260823071419_tka_pass_renewal_stacking_v1.sql`.

For a pass renewal, each feature entitlement starts from the later of:

```text
paid_at
latest active entitlement expiry
```

This prevents early renewal from wasting already-paid remaining days. Successful fulfillment remains source-per-order idempotent, and fulfillment is serialized per learner with an advisory transaction lock.

The learner pass page reads own entitlements through RLS. If a current entitlement is usable, it shows the effective expiry and follows contiguous scheduled renewal entitlements so the learner can see how far access has already been extended.

## Current exact-head evidence

Implementation head `6b9403d376f702fc5666c0569e0bd283076058a4` passed before documentation-only synchronization:

- CI #320: **SUCCESS**
- Content Review Staging E2E #114: **SUCCESS**
- TKA SMP Staging E2E #181: **SUCCESS**
- TKA browser suite: 9 tests passed, including the existing M2/M3 core flows plus authenticated learner catalog, inactive-pass state, mobile no-overflow, expected Rp29.000/Rp69.000 pricing, sandbox Snap loader, and unauthenticated return-to-login behavior.

These results validate the current learner catalog/status slice. They do **not** replace the later closure requirement for paid sandbox, negative entitlement access, expiry, renewal-paid-state, and payment-integrity E2E.

## Milestone 4 slices

### 4.1 Catalog + Access Contract

- [x] Audit product catalog
- [x] Lock staging price 30-day = Rp29.000
- [x] Lock staging price 90-day = Rp69.000
- [x] Activate SMP pass products on staging
- [x] Verify exactly one open price per product
- [x] Verify 10 feature mappings per product
- [x] Expose SMP pass catalog in learner staging UI through learner RLS
- [x] Harden section starter to enforce entitlement contract behind dark-launch flag
- [x] Normalize Full unlimited semantics for usable pass entitlement
- [ ] Browser negative access tests with enforcement enabled

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

- [x] Stack renewal duration safely
- [x] Show active pass / effective expiry to learner
- [x] Renewal CTA
- [ ] Paid-state browser proof for active + scheduled renewal UX
- [ ] Expired entitlement access denial E2E
- [ ] No-entitlement access denial E2E with enforcement enabled

### 4.4 Closure

- [ ] Admin order/payment verification
- [ ] Paid E2E green
- [ ] Expiry/no-entitlement E2E green
- [ ] Security/payment-integrity audit green
- [ ] Final TKA SMP M2/M3 regression green
- [ ] Final CI exact-head green
- [ ] 0 leaked disposable users/orders/QA artifacts

## Production boundary

Completing M4 means **staging-ready monetization**, not automatic production activation.

Production rollout remains a separate Milestone 5 decision. The first Schema V2/TKA SMP production cutover must keep monetization as a separately controlled release until core production stability is proven.
