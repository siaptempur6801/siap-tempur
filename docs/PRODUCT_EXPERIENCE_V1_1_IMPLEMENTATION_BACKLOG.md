# Product Experience V1.1 — Implementation Backlog

Parent: GitHub Issue #21  
Audit: GitHub Issue #22  
Branch: `feat/product-experience-v1-1`

This backlog converts the Product Experience audit into implementation-sized work. Priority is based on user impact and risk, not file order.

## P0-A — Foundation

- [ ] Implement shared design tokens and semantic UI roles
- [ ] Standardize body vs display typography usage
- [ ] Standardize button hierarchy
- [ ] Standardize alerts/toasts/dialog patterns
- [ ] Standardize empty/loading/error/locked states
- [ ] Implement reduced-motion behavior for learning/exam surfaces
- [ ] Define responsive container primitives

## P0-B — Exam experience

- [ ] Replace high-arousal 5-minute warning copy
- [ ] Replace high-arousal 1-minute warning copy
- [ ] Normalize exit confirmation to `kamu`
- [ ] Rename submission action to `Kumpulkan jawaban`
- [ ] Remove playful panic language from timed flow
- [ ] Reduce looping/bouncing motion in exam mode
- [ ] Audit mobile question navigator ergonomics
- [ ] Verify answer state does not depend on color alone
- [ ] Verify keyboard/focus behavior

Acceptance:

- user always knows question position, answer state, and remaining time
- warnings are calm and unambiguous
- no decorative motion competes with the question
- resume/submit behavior remains unchanged

## P0-C — CPNS dashboard

- [ ] Preserve resume-active-session as highest priority
- [ ] Introduce next-best-action card
- [ ] Surface weakest area when reliable data exists
- [ ] Show latest score/trend as supporting evidence
- [ ] Reduce ranking visual priority
- [ ] Move token balance into secondary account/access context
- [ ] Define empty state for users with no completed tryout

Acceptance:

Dashboard answers:

> Apa yang sebaiknya kamu kerjakan hari ini?

## P0-D — CPNS tryout entry

- [ ] Remove fabricated/noisy motivational quote
- [ ] Verify/remove `CAT BKN 2025/2026` claim
- [ ] Verify/remove `Passing Grade Terupdate` claim
- [ ] Standardize all access language to `token`
- [ ] Replace `Ticket Habis!`
- [ ] Clarify question count/duration/token cost
- [ ] Clarify resume behavior
- [ ] Simplify preparation/tips section

## P0-E — CPNS packages/payment

Commercial decision: **user-facing balance/access currency = token**.

- [ ] Replace `tiket` occurrences referring to token balance
- [ ] Remove `wallet` terminology from ordinary UI
- [ ] Remove `katalog` wording from package hero
- [ ] Replace provider-specific payment errors
- [ ] Add clear pending/verifying/failed/expired recovery copy
- [ ] Improve package value hierarchy
- [ ] Make fees transparent before payment
- [ ] Review mobile Snap flow

## P0-F — TKA SMP entry

- [ ] Replace learner-facing `track`
- [ ] Replace learner-facing `catalog`
- [ ] Replace learner-facing `attempt`
- [ ] Replace learner-facing `entitlement`
- [ ] Remove `user_tracks` explanation
- [ ] Rewrite activation section around saved learning progress
- [ ] Explain optional school/class/target-year fields by user benefit
- [ ] Clarify primary next action after activation

## P0-G — Navigation

- [ ] Replace feature-flat desktop IA with task-oriented IA
- [ ] Reduce mobile bottom navigation to 4–5 clear destinations
- [ ] Remove ambiguous `Mini`, `Drill`, `Beli` abbreviations
- [ ] Normalize `Dashboard`/`Home` to `Beranda`
- [ ] Add first-class `Hasil & perkembangan`
- [ ] Review whether ranking belongs in primary navigation
- [ ] Verify `LIVE` badges are state-driven
- [ ] Explain/remove unexplained XP badges

Candidate mobile nav:

```text
Beranda | Belajar | Tryout | Hasil | Profil
```

## P0-H — Results and recommendations

- [x] Remove internal Schema V2/server-side/attempt language from CPNS result
- [ ] Compute reliable strongest/weakest area from result data
- [ ] Add next recommended action
- [ ] Link recommendation to relevant practice
- [ ] Add improvement trend when historical comparison is available
- [ ] Audit TKA result hierarchy

## P0-I — Public conversion

- [x] First-pass main landing copy cleanup
- [x] First-pass TKA landing copy cleanup
- [ ] Rewrite CPNS landing page
- [ ] Add free useful entry action
- [ ] Add proof/trust layer
- [ ] Add pricing/value section
- [ ] Add FAQ
- [ ] Add final CTA
- [ ] Audit SEO claims
- [ ] Define conversion analytics events

## P1 — Retention and supporting journeys

- [ ] forgot password
- [ ] profile/settings
- [ ] history
- [ ] ranking
- [ ] event list/detail
- [ ] blog/article journeys
- [ ] generic/global errors
- [ ] empty/loading/locked states
- [ ] legal navigation/footer consistency

## Growth backlog

- [ ] positioning finalization
- [ ] CPNS messaging matrix
- [ ] TKA SMP messaging matrix
- [ ] Instagram/TikTok content pillars
- [ ] SEO content clusters
- [ ] free-to-paid funnel
- [ ] campaign landing-page pattern
- [ ] referral concept
- [ ] retention lifecycle
- [ ] analytics event taxonomy
- [ ] funnel dashboard/CRO baseline

## Release gate

Product Experience V1.1 must not merge to `main` until:

- [ ] no ordinary-user internal/release terminology remains in P0 flows
- [ ] mobile core journeys reviewed
- [ ] auth regression checked
- [ ] exam regression checked
- [ ] payment regression checked
- [ ] build/typecheck/lint pass
- [ ] relevant E2E pass
- [ ] preview smoke pass
- [ ] release notes prepared
