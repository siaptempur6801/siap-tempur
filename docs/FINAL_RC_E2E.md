# Milestone ⑥ — Final CPNS + TKA SMP Release-Candidate E2E

Status: **ACTIVE**

Base: `feat/schema-v2` after Milestone ⑤ merge (`c10aa6c79951f9646ac6c2980ca2e23f5ee8d1af`).

## Safety

- Production Supabase `llnttutwhtvxtdktiizo` remains READ ONLY.
- `main` and production deployment remain untouched.
- All authenticated RC E2E data is disposable staging QA data only.
- Test helpers must hard-guard staging project `lpgrivowdcepcxradavu`.
- CI helpers use GitHub OIDC; no production/admin credential is stored in GitHub Actions.

## RC gates

### CPNS / SKD

Required before Milestone ⑥ can close:

- [ ] disposable authenticated CPNS/SKD staging user can be provisioned and cleaned up
- [ ] CPNS dashboard loads canonical wallet/track state
- [ ] Full Tryout can start from pre-exam page and consumes exactly one token for a new attempt
- [ ] answer can be saved
- [ ] refresh/resume restores the same attempt and question progress without consuming another token
- [ ] completed Full Tryout produces result + TWK/TIU/TKP score breakdown
- [ ] Mini Tryout works for TWK/TIU/TKP
- [ ] Drill works against canonical CPNS submaterial taxonomy
- [ ] history/result pages remain readable after completion
- [ ] no disposable CPNS QA residue after cleanup

### TKA SMP

Use the existing proven `TKA SMP Staging E2E` workflow as the RC gate.

- [ ] Full Tryout 60 questions / 150 minutes passes
- [ ] BIN → MAT section transition passes
- [ ] answer persistence + refresh/resume passes
- [ ] submit/result/explanation passes
- [ ] Mini Tryout passes
- [ ] monetization enforcement test passes and resets to disabled afterward
- [ ] disposable TKA QA residue cleanup passes

### Shared release gates

- [ ] standard CI is green on the final RC head
- [ ] CPNS Staging E2E is green on the final RC head
- [ ] TKA SMP Staging E2E is green on the final RC head
- [ ] no unresolved P0/P1 release blocker
- [ ] staging monetization enforcement ends disabled
- [ ] production and `main` remain untouched

## Implementation note

The repository already had a dedicated TKA SMP staging workflow but no dedicated authenticated CPNS RC workflow. Milestone ⑥ therefore adds a CPNS-specific GitHub-OIDC provisioning helper and Playwright suite rather than treating generic public E2E as proof that the CPNS exam flow works.
