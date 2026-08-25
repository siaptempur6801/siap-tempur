# TKA SMP Monetization — Milestone 4 Audit

Status: **M4 COMPLETE / STAGING VERIFIED**  
Branch: `feat/tka-smp-monetization-v1`  
Base: `feat/schema-v2`  
Production: **NO-GO**

## Closure decision

Milestone 4 TKA SMP Monetization is **COMPLETE** for staging. Product catalog, entitlement/access contract, renewal, paid sandbox lifecycle, payment integrity, learner UX, RLS/BOLA security, permanent browser E2E, exact-head CI, staging cleanup, and Vercel Preview gates have passed.

Passing M4 does **not** enable production payments or production monetization enforcement. Production cutover remains Milestone 5 and requires a separate explicit GO/NO-GO decision.

## Catalog + access contract

Staging catalog:

| Product | Duration | Price |
|---|---:|---:|
| `TKA_SMP_PASS_30` | 30 hari | Rp29.000 |
| `TKA_SMP_PASS_90` | 90 hari | Rp69.000 |

Admin fee checkout existing: Rp500.

Verified:
- both products ACTIVE
- exactly one open ACTIVE price per product
- 10 product-feature mappings per product
- learner catalog uses authenticated RLS
- Full PREMIUM requires a usable entitlement when enforcement is ON
- expired/not-yet-started/inactive entitlement is unusable
- active pass unlocks Full and bypasses the static Full attempt cap
- Mini has one free attempt per exam; usable pass bypasses exhausted free quota
- an existing in-progress attempt remains resumable

Migrations:
- `20260823065718_tka_smp_pass_catalog_v1.sql`
- `20260823070444_tka_smp_monetization_access_contract_v1.sql`
- `20260823071419_tka_pass_renewal_stacking_v1.sql`
- `20260824050000_tka_smp_monetization_browser_contract_v1.sql`

## Renewal

Renewal fulfillment stacks duration from the later of `paid_at` or the latest active entitlement expiry. A per-learner advisory transaction lock prevents concurrent renewal from losing duration. Learner UX exposes active status, effective expiry/access-through, and renewal CTA.

## Paid sandbox + payment integrity

Real Midtrans sandbox QRIS lifecycle passed against staging:

```text
TKA_SMP_PASS_30
→ Rp29.000 product
→ Rp500 admin fee
→ Rp29.500 total
→ provider settlement
→ order paid
→ payment settlement
→ exactly 10 entitlements
→ duplicate fulfillment
→ still exactly 10 entitlements
```

Verified:
- invalid webhook signature rejected
- amount mismatch rejected
- pending accepted
- duplicate pending idempotent
- expire/cancel/deny terminal mapping
- settlement fulfillment
- duplicate settlement does not duplicate entitlement
- a later cancel cannot regress an already-paid order/payment or remove entitlement

## Security closure

Verified RLS/ownership on `orders`, `payments`, `entitlements`, `products`, `product_prices`, and `product_features`.

Ownership contract:
- orders: own user or admin permission
- payments: owning order user or admin permission
- entitlements: own user or admin permission

`fulfill_paid_order` privilege:
- anon EXECUTE: false
- authenticated EXECUTE: false
- service_role EXECUTE: true

`is_tka_smp_monetization_enforced()`:
- anon EXECUTE: false
- authenticated EXECUTE: true intentionally
- fixed `search_path = ''`
- no parameters; reads only the fixed monetization feature flag

Temporary M4 browser routes/scripts and the temporary Chromium harness were removed. Legacy one-shot M4 Edge Functions remain inert HTTP 410 stubs. Permanent `ci-e2e-m4` remains the GitHub-OIDC staging E2E helper.

## Permanent E2E

Source-controlled suite:
- `tests/e2e/specs/9-tka-smp-monetization.spec.ts`
- `tests/e2e/tka.m4.ts`
- `.github/workflows/tka-staging-e2e.yml`
- `supabase/functions/ci-e2e-m4/index.ts`

Matrix covers:
- pass catalog + sandbox Snap loader
- Full no-pass denial
- expired-pass denial
- active-pass expiry/renewal UX + Full unlock
- Mini quota exhausted lock
- active-pass Mini bypass
- order/payment owner-only BOLA across two learners
- unauthenticated pass-page redirect

The workflow always resets monetization enforcement OFF. The helper validates GitHub OIDC signature/issuer/audience/repository/workflow/event and restricts targets to disposable CI TKA users.

## Final execution evidence

Functional closure head:

`185c33bbb415762abadfc4bac09bb6e96d13455b`

Exact-head GitHub Actions:
- CI #392 — **SUCCESS**
- TKA SMP Staging E2E #253 — **SUCCESS**
- Content Review Staging E2E #186 — **SUCCESS**

The final TKA run exercised the permanent Playwright suite after fixing the CI helper's pass-price lookup to match the canonical ACTIVE status case-insensitively. Self-hosted runner execution is hardened against fork PRs, checkout does not persist GitHub credentials, and staging E2E provisioning uses GitHub OIDC instead of a stored Supabase service-role credential.

Exact functional-head Vercel deployment:

`dpl_C32uBDXMSWaWDTGXLpvX3rmQ3XHz` — **READY**

## Final staging-zero audit — 25 Aug 2026

```text
tka.smp.monetization_enforcement.enabled = false
rollout_percentage = 0
mode = dark_launch
QA/CI auth users = 0
M4 QA orders = 0
m4_browser_qa / ci_e2e_m4 entitlements = 0
M4 QA/CI attempts = 0
M4 QA webhook artifacts = 0
```

The staging environment is clean after the permanent E2E suite.

## Milestone 4 closure checklist

### Catalog + access
- [x] Catalog + prices locked
- [x] 10 feature mappings per product
- [x] Learner RLS catalog
- [x] Database entitlement contract
- [x] No-pass / expired / active pass permanent browser coverage

### Payment + fulfillment
- [x] Real paid sandbox settlement lifecycle
- [x] Signature and amount verification
- [x] Webhook idempotency
- [x] pending / expire / cancel / deny mapping
- [x] Duplicate fulfillment remains exactly 10 entitlements
- [x] Paid terminal-state preservation

### Expiry + renewal UX
- [x] Renewal stacking contract
- [x] Active pass / expiry learner UX
- [x] Renewal CTA
- [x] Expired/no-entitlement denial

### Security + closure
- [x] Payment integrity matrix green
- [x] RLS own-row policies verified
- [x] Fulfillment privilege verified
- [x] Feature flag OFF / rollout 0
- [x] Final staging QA residue = 0
- [x] Exact functional-head Vercel deployment READY
- [x] Permanent TKA SMP E2E green
- [x] Final CI green
- [x] Content Review regression green
- [x] Temporary QA/browser harness removed

## Production boundary

Production Supabase and `main` remain untouched by this closure. Production payment activation and production monetization enforcement remain **NO-GO** until Milestone 5 receives explicit approval.
