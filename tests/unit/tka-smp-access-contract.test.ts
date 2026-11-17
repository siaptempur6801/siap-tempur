import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationSql = readFileSync(
    resolve(__dirname, '../../supabase/migrations/20260912062834_tka_smp_access_guard_and_token_contract.sql'),
    'utf8',
)

const tkaShellSource = readFileSync(
    resolve(__dirname, '../../components/tka/TkaDashboardShell.tsx'),
    'utf8',
)

const tkaBuyTokenSource = readFileSync(
    resolve(__dirname, '../../app/tka/[level]/beli-token/page.tsx'),
    'utf8',
)

const tkaBuyTokenLoadingSource = readFileSync(
    resolve(__dirname, '../../app/tka/[level]/beli-token/loading.tsx'),
    'utf8',
)

const tokenPackagesSource = readFileSync(
    resolve(__dirname, '../../components/dashboard/TokenPackagesPage.tsx'),
    'utf8',
)

const tkaLevelSource = readFileSync(
    resolve(__dirname, '../../app/tka/[level]/page.tsx'),
    'utf8',
)

const tkaPracticeSource = readFileSync(
    resolve(__dirname, '../../app/actions/tka-practice.ts'),
    'utf8',
)

const tkaTryoutPageSource = readFileSync(
    resolve(__dirname, '../../app/tka/[level]/tryout/page.tsx'),
    'utf8',
)

const tkaMiniTryoutPageSource = readFileSync(
    resolve(__dirname, '../../app/tka/[level]/mini-tryout/page.tsx'),
    'utf8',
)

const enforcementMigrationSql = readFileSync(
    resolve(__dirname, '../../supabase/migrations/20260912074522_enable_tka_smp_monetization_enforcement.sql'),
    'utf8',
)

describe('TKA SMP access contract', () => {
    it('restricts the server-side starter to TKA SMP and pass-based exams', () => {
        expect(migrationSql).toContain('create or replace function app_private.start_exam_attempt_for_user')
        expect(migrationSql).toContain("upper(coalesce(v_program_code,'')) <> 'TKA'")
        expect(migrationSql).toContain("upper(coalesce(v_track_code,'')) <> 'SMP'")
        expect(migrationSql).toContain("if coalesce(v_token_cost,0) <> 0 then")
        expect(migrationSql).toContain("raise exception 'TKA SMP exams must use Tempur Pass access'")
        expect(migrationSql).toContain('revoke all on function app_private.start_exam_attempt_for_user(uuid,uuid)')
    })

    it('checks exam availability and entitlement validity on the server', () => {
        expect(migrationSql).toContain("lower(coalesce(v_exam_status,'')) not in ('active','scheduled')")
        expect(migrationSql).toContain("if v_starts_at is not null and v_starts_at > now() then")
        expect(migrationSql).toContain("if v_ends_at is not null and v_ends_at < now() then")
        expect(migrationSql).toContain("and lower(en.status)='active'")
        expect(migrationSql).toContain('and en.starts_at <= now()')
        expect(migrationSql).toContain('(en.expires_at is null or en.expires_at > now())')
        expect(migrationSql).toContain('(en.usage_limit is null or en.usage_count < en.usage_limit)')
    })

    it('keeps TKA navigation and purchase routes pass-oriented', () => {
        expect(tkaShellSource).not.toContain('tokenBalance')
        expect(tkaShellSource).not.toContain('/beli-token')
        expect(tkaBuyTokenSource).toContain("redirect(`${tkaLevelPath(level)}/pass`)")
        expect(tkaBuyTokenLoadingSource).toContain('Membuka Tempur Pass')
        expect(tokenPackagesSource).toContain('listActiveProductOffers(catalogProgram, catalogTrack)')
        expect(tokenPackagesSource).not.toContain("listActiveProductOffers('CPNS', 'SKD')")
    })

    it('shows Tempur Pass only for the Full Tryout entitlement', () => {
        expect(tkaLevelSource).toContain('const fullTryoutFeatureId')
        expect(tkaLevelSource).toContain('entitledFeatures.has(fullTryoutFeatureId)')
        expect(tkaLevelSource).not.toContain('const hasTempurPass = entitledFeatures.size > 0')
    })

    it('does not allow TKA starts to fall back to the CPNS token service', () => {
        expect(tkaPracticeSource).toContain('isTkaLevelAvailable(level)')
        expect(tkaPracticeSource).toContain('tkaFullExamRpcService.startSmpExam')
        expect(tkaPracticeSource).not.toContain('SMP_SECTION_EXAM_SLUGS')
        expect(tkaPracticeSource).not.toContain('examAttemptService.startConfiguredExam')
    })

    it('does not keep a staging-only bypass once monetization is enforced', () => {
        for (const source of [tkaTryoutPageSource, tkaMiniTryoutPageSource]) {
            expect(source).not.toContain('stagingSmpPilot')
            expect(source).not.toContain('stagingFullExam')
            expect(source).not.toContain('stagingMiniExam')
            expect(source).not.toContain('Akses uji coba')
        }
        expect(enforcementMigrationSql).toContain("'tka.smp.monetization_enforcement'")
        expect(enforcementMigrationSql).toContain('true')
        expect(enforcementMigrationSql).toContain('100')
        expect(enforcementMigrationSql).toContain("'mode', 'enforced'")
    })
})
