# TKA SMP Monetization — Milestone 4 Audit

Status: **CLOSURE READY / STAGING ONLY — EXTERNAL CI EXECUTION BLOCKER**  
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

## Catalog + access contract

Staging catalog:

| Product | Duration | Price |
|---|---:|---:|
| `TKA_SMP_PASS_30` | 30 hari | Rp29.000 |
| `TKA_SMP_PASS_90` | 90 hari | Rp69.000 |

Admin fee checkout existing: Rp500.

Verified:
- kedua product ACTIVE
- tepat satu open ACTIVE price per product
- 10 product-feature mappings per product
- learner catalog dibaca melalui authenticated RLS, tanpa service-role browser path

Migrations:
- `20260823065718_tka_smp_pass_catalog_v1.sql`
- `20260823070444_tka_smp_monetization_access_contract_v1.sql`
- `20260823071419_tka_pass_renewal_stacking_v1.sql`
- `20260824050000_tka_smp_monetization_browser_contract_v1.sql`

Access contract saat enforcement ON:
- Full Tryout PREMIUM tanpa usable pass → `ENTITLEMENT_REQUIRED`
- expired/not-yet-started/inactive entitlement → unusable
- active pass membuka Full Tryout dan bypass static attempt cap
- Mini memiliki 1 free attempt per exam
- Mini setelah free quota membutuhkan usable pass
- usable pass bypass free Mini quota
- existing in-progress attempt tetap resumable sebelum entitlement gate untuk attempt baru

Database contract proof telah lulus di staging menggunakan transaksi yang dibatalkan, sehingga tidak meninggalkan state QA.

## Renewal

Fulfillment renewal menumpuk durasi dari later of:

```text
paid_at
latest active entitlement expiry
```

Per-learner advisory transaction lock mencegah concurrent renewal kehilangan durasi. Learner pass page menampilkan active pass, effective access-through expiry, dan renewal CTA.

## Paid sandbox lifecycle proof — 24 Aug 2026

Real Midtrans sandbox QRIS lifecycle telah diuji terhadap staging:

```text
TKA_SMP_PASS_30
→ product Rp29.000
→ admin fee Rp500
→ total Rp29.500
→ provider charge accepted
→ QRIS simulator completion
→ provider settlement
→ order paid
→ payment settlement
→ exactly 10 entitlements
→ duplicate fulfillment
→ still exactly 10 entitlements
→ cleanup
```

Verified payment/security matrix:
- invalid webhook signature → rejected
- amount mismatch → rejected
- pending → accepted
- duplicate pending webhook → idempotent
- expire → terminal expired state
- cancel → terminal cancelled state
- deny → terminal failed state
- settlement → paid + fulfillment
- duplicate settlement → no duplicate entitlement
- cancel after paid → paid state tidak diregresikan dan entitlement tetap ada

## Security closure

Final staging audit on 24 Aug 2026:

### Feature flag / cleanup

```text
tka.smp.monetization_enforcement.enabled = false
rollout_percentage = 0
mode = dark_launch
QA auth users = 0
M4BROWSER/M4SEC/M4QA orders = 0
m4_browser_qa / ci_e2e_m4 entitlements = 0
M4 browser attempts = 0
CI TKA attempts = 0
M4SEC webhook artifacts = 0
```

### RLS

RLS enabled on:
- `orders`
- `payments`
- `entitlements`
- `products`
- `product_prices`
- `product_features`

`anon` does not have SELECT on those learner monetization tables/catalog tables. Authenticated catalog reads use explicit policies.

Ownership policies verified:
- `orders_select_own`: `user_id = auth.uid()` or admin permission
- `payments_select_own`: payment's order must belong to `auth.uid()` or admin permission
- `entitlements_select_own`: `user_id = auth.uid()` or admin permission

### Function privileges

`fulfill_paid_order`:
- anon EXECUTE: **false**
- authenticated EXECUTE: **false**
- service_role EXECUTE: **true**

`is_tka_smp_monetization_enforced`:
- anon EXECUTE: **false**
- authenticated EXECUTE: **true**
- fixed `search_path = ''`
- no parameters; reads only the fixed monetization flag key

Supabase advisor still reports general schema baseline notices, including intentionally authenticated learner SECURITY DEFINER wrappers and pre-existing RLS/performance notices. No new M4 privilege leak was found. Reference: https://supabase.com/docs/guides/database/database-linter

Auth leaked-password protection is a project-level recommendation and remains outside M4. Reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Browser / permanent E2E contract

Permanent suite is source-controlled in:
- `tests/e2e/specs/9-tka-smp-monetization.spec.ts`
- `tests/e2e/tka.m4.ts`
- `.github/workflows/tka-staging-e2e.yml`
- `supabase/functions/ci-e2e-m4/index.ts`

Permanent matrix covers:
- learner pass catalog + Midtrans sandbox loader
- Full no-pass denial
- expired-pass denial
- active-pass expiry/renewal UX + Full unlock
- exhausted Mini quota lock
- active-pass Mini quota bypass
- order/payment owner-only BOLA test across two learners
- unauthenticated pass-page redirect

The workflow has an `if: always()` cleanup that resets monetization enforcement to OFF.

The permanent CI helper uses GitHub OIDC and validates:
- GitHub issuer/signature
- audience `siap-tempur-staging-e2e`
- repository `8shagrid/siap-tempur`
- exact TKA workflow ref
- allowed events only
- target users must match disposable `ci-tka-*` users with CI metadata

Temporary M4 one-shot Edge Functions remain deployed only as inert HTTP `410 Gone` stubs. Permanent `ci-e2e-m4` remains active for the source-controlled staging E2E workflow.

## Clean exact head verification

Clean pre-doc closure head:

`8e5f407067575fb82e5b6388421b3f9d55e47ec2`

Verified on Vercel Preview:
- `npm run build` = normal `next build`
- Next.js compile success
- TypeScript success
- route generation success
- temporary `/api/internal/m4-browser-session` absent
- temporary Vercel/Sparticuz browser harness removed
- deployment `dpl_2eWL4DAkwK3KzoySRDpGtmx1zxj1` = **READY**

## GitHub Actions external blocker

Exact-head pull-request workflows were retried on 24 Aug 2026:

- CI run `32738409660`, attempt 2
- TKA SMP Staging E2E run `32738409631`, attempt 2
- Content Review Staging E2E run `32738409593`, attempt 2

All three fail before runner steps start:

```text
job conclusion = failure
steps = null
job logs artifact = unavailable
```

This is not an application/test assertion failure: checkout, install, build, Playwright, and cleanup steps never execute. Therefore permanent exact-head CI/E2E cannot honestly be marked green until GitHub Actions can allocate/start the jobs.

## Milestone 4 closure checklist

### 4.1 Catalog + Access Contract
- [x] Catalog + prices locked
- [x] 10 feature mappings per product
- [x] Learner RLS catalog
- [x] Database entitlement contract
- [x] Full no-pass browser denial observed during closure investigation
- [x] Expired-pass browser denial observed during closure investigation
- [x] Permanent browser negative/access tests committed

### 4.2 Payment + Fulfillment
- [x] Real paid sandbox settlement lifecycle
- [x] Signature rejection
- [x] Amount mismatch rejection
- [x] Duplicate webhook/idempotency
- [x] pending / expire / cancel / deny state verification
- [x] Duplicate fulfillment remains exactly 10 entitlements
- [x] Paid terminal-state preservation after later cancel

### 4.3 Expiry + Renewal UX
- [x] Renewal stacking contract
- [x] Active pass / expiry learner UX
- [x] Renewal CTA
- [x] Database expired/no-entitlement denial
- [x] Active pass status + renewal UI observed in browser closure investigation
- [x] Permanent active/expired/no-entitlement browser tests committed

### 4.4 Security + Closure
- [x] Payment integrity matrix green
- [x] RLS own-row policies verified
- [x] Fulfillment privilege verified
- [x] Feature flag OFF / rollout 0
- [x] Final staging QA residue = 0
- [x] Clean exact-head Vercel build/deploy READY
- [x] Temporary branch/browser QA harness removed
- [ ] Permanent TKA SMP E2E exact-head execution green — **blocked before runner starts**
- [ ] Final CI exact-head execution green — **blocked before runner starts**
- [ ] Content Review regression exact-head green — **blocked before runner starts**

## Closure decision

**Do not mark Milestone 4 COMPLETE yet.** Product, payment, access-control, staging cleanup, and clean-head deployment gates are closure-ready. The remaining blocker is external GitHub Actions job execution: exact-head jobs terminate with `steps=null` before any workflow step starts.

Once GitHub Actions executes normally and the three exact-head workflows are green, Milestone 4 can be marked **COMPLETE** without reopening product/payment implementation unless those workflows expose a real regression.

## Production boundary

Production remains untouched and **NO-GO**. Passing M4 does not automatically enable production payments or production monetization enforcement. Production cutover remains Milestone 5 and requires a separate explicit GO/NO-GO decision.
