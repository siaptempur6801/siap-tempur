import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = resolve(__dirname, '../..')
const read = (relativePath: string) => readFileSync(resolve(repoRoot, relativePath), 'utf8')

/**
 * Kontrak konfirmasi sesi ujian TKA.
 *
 * Dulu tiga klien sesi TKA memakai `window.confirm()` native — tidak bisa di-style,
 * memblokir main thread, dan tidak konsisten dengan modal CPNS. Konfirmasi kini
 * memakai satu komponen bersama `TkaSectionConfirmModal`. Test ini menjaga agar:
 * 1. tidak ada klien sesi TKA yang kembali memakai dialog native,
 * 2. testid yang diklik spec E2E benar-benar ada di komponen modal,
 * 3. spec TKA yang menyelesaikan bagian selalu mengklik modal itu (bukan dialog native).
 */
const SESSION_CLIENTS = [
    'components/tka/TkaFullExamSessionClient.tsx',
    'components/tka/TkaDiagnosticSessionClient.tsx',
    'components/practice/UniversalPracticeSessionClient.tsx',
] as const

const SECTION_COMPLETION_SPECS = [
    'tests/e2e/specs/6-tka-smp-full.spec.ts',
    'tests/e2e/specs/8-tka-smp-mini.spec.ts',
    'tests/e2e/specs/13-tka-diagnostic.spec.ts',
] as const

const CONFIRM_TESTID = 'tka-section-confirm'
const CANCEL_TESTID = 'tka-section-cancel'

/** Buang komentar agar penjelasan "bukan window.confirm()" tidak dianggap kode. */
function stripComments(source: string) {
    return source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^[ \t]*\/\/.*$/gm, '')
}

describe('kontrak konfirmasi sesi ujian TKA', () => {
    it.each(SESSION_CLIENTS)('%s tidak memakai dialog native', (path) => {
        const code = stripComments(read(path))
        expect(code).not.toContain('window.confirm')
        expect(code).not.toContain('confirm(')
    })

    it.each(SESSION_CLIENTS)('%s memakai komponen modal bersama', (path) => {
        const code = read(path)
        expect(code).toContain("import TkaSectionConfirmModal from '@/components/tka/TkaSectionConfirmModal'")
        expect(code).toContain('<TkaSectionConfirmModal')
    })

    it('komponen modal mengekspos testid yang dipakai spec E2E', () => {
        const modal = read('components/tka/TkaSectionConfirmModal.tsx')
        expect(modal).toContain(`data-testid="${CONFIRM_TESTID}"`)
        expect(modal).toContain(`data-testid="${CANCEL_TESTID}"`)
        expect(modal).toContain('isOpen={message !== null}')
    })

    it('helper E2E mengklik modal dan aman bila modal tidak muncul', () => {
        const helper = read('tests/e2e/pages/TkaExamActions.ts')
        expect(helper).toContain(`confirmTkaSectionIfPresent`)
        expect(helper).toContain(`getByTestId('${CONFIRM_TESTID}')`)
        // Helper wajib menoleransi modal yang tidak muncul agar suite tidak menggantung.
        expect(helper).toMatch(/waitFor\(\{\s*state:\s*'visible'/)
        expect(helper).toContain('catch')
    })

    it.each(SECTION_COMPLETION_SPECS)('%s menyelesaikan konfirmasi lewat modal', (path) => {
        const code = stripComments(read(path))
        expect(code).not.toContain("page.once('dialog'")
        expect(code).toContain("import { confirmTkaSectionIfPresent } from '../pages/TkaExamActions'")
        expect(code).toContain('await confirmTkaSectionIfPresent(page)')
    })
})
