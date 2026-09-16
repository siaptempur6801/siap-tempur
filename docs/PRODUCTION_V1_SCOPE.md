# Siap Tempur — Production V1 Scope Freeze

> ⚠️ **HISTORIS — bukan sumber kebenaran status.**
> Scope freeze ini disusun 2026-08-26 ("cutover remains NO-GO"); cutover sudah selesai 2026-09-01 dan eksposur publik kini sengaja ditahan.
> Status terkini: [`docs/STATUS.md`](./STATUS.md).

> Frozen: 2026-08-26
> Target integration branch: `feat/schema-v2`
> Production cutover remains NO-GO until every release gate below is green.

## Production V1 — Included

### Account & access
- Email/password + Google authentication
- Profile
- Program/track activation

### CPNS / SKD
- Canonical question bank for reviewed legacy content
- Drill TWK/TIU/TKP
- Mini Tryout TWK/TIU/TKP
- Full Tryout SKD
- Autosave/resume/submit
- Scoring, result, review/pembahasan
- History
- Leaderboard
- Token/wallet access

### TKA SMP
- Full Tryout
- Mini Tryout Bahasa Indonesia + Matematika
- Autosave/resume/result/review
- Wrong-question mode
- Automatic remedial
- Knowledge mastery
- Weakest-topic recommendation
- Readiness score
- Progress dashboard
- Tempur Pass 30/90 days
- Midtrans payment + entitlement contract

### Unified Admin
- Dashboard
- Question Bank
- Review Workspace
- Articles
- Exams
- Events
- Products
- Orders & Payments
- Program/Track context

### Commerce & Event
- Products/prices
- Orders/payments
- Midtrans checkout/webhook
- Idempotent fulfillment
- Entitlements
- Wallets
- Payment reconciliation
- Tryout Akbar registration/access/attempt/ranking

## Explicitly Deferred After Production V1

The following features must not block V1 cutover unless they introduce a data-integrity or security dependency:
- TKA SD hardening
- TKA SMA user-facing completion
- School/B2B management
- Notification center/campaign delivery
- Voucher/Promotion V2 product completion
- Advanced operational exports
- Refund workflow polish
- Advanced platform-wide analytics beyond the V1 learning loop

## Release Sequence

1. Freeze Production V1 scope — this document.
2. Complete CPNS legacy migration into canonical Schema V2 staging.
3. Close Unified Admin Workspace and verify authenticated Admin flow.
4. Run production-clone / production-like migration rehearsal and reconciliation.
5. Run final CPNS + TKA SMP release-candidate E2E.
6. Perform Schema V2 production cutover only after all gates are green.

## Hard Release Gates

Production cutover is forbidden unless all are satisfied:
- CPNS canonical migration inventory reconciles with source inventory.
- Unreviewed / needs-revision CPNS questions are withheld, not guessed.
- CPNS Drill, Mini, Full, scoring, result and review regression are green.
- TKA SMP Full, Mini, learning loop and monetization regression are green.
- Unified Admin authenticated closure is green.
- User UUID/auth relationships are preserved in rehearsal.
- Attempts/scores/history reconciliation is green.
- Wallet/order/payment/entitlement reconciliation is green.
- Backup/PITR availability is verified.
- Rollback procedure is rehearsed.
- Production environment/OAuth/payment configuration is verified.
- Final release candidate has no unresolved P0 data-integrity/security defect.

## Safety Boundary

Until Step 6:
- `main` remains untouched.
- Production Supabase remains unchanged except read-only audit/rehearsal source access.
- Payment production activation remains unchanged.
- All destructive migration testing is performed only on staging or a dedicated production-like rehearsal environment.

This scope is intentionally frozen to prevent post-MVP expansion from delaying the first Schema V2 production release.
