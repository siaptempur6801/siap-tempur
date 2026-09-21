import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

// Katalog dimuat lewat browser client; mock agar tidak menyentuh jaringan/env.
vi.mock('@/lib/utils/supabase/client', () => ({
    createClient: () => ({ rpc: vi.fn() }),
}))

// QuestionBankForm menarik server action (dan `server-only`); bukan subjek uji ini.
vi.mock('@/components/admin/QuestionBankForm', () => ({
    default: () => null,
    QuestionBankWorkflow: () => null,
}))

import QuestionBankEditorModal from '@/components/admin/QuestionBankEditorModal'

/**
 * Katalog editor (`get_question_bank_editor`) mengembalikan seluruh stimulus satu
 * track — terukur ~1 MB untuk SD/SMP. Kontraknya: halaman daftar TIDAK memanggil
 * RPC itu; modal memuatnya saat dibuka.
 */
const repoRoot = resolve(__dirname, '../..')
function source(relativePath: string) {
    return readFileSync(resolve(repoRoot, relativePath), 'utf8')
}

describe('Question Bank memuat katalog secara malas', () => {
    it('HTML awal berisi trigger dan status memuat, bukan katalog', () => {
        const html = renderToStaticMarkup(
            <QuestionBankEditorModal program="CPNS" track="SKD" editId="" subjects={[]} returnFilters={{}} closeHref="/admin/content/questions" canPublish={false}/>,
        )
        expect(html).toContain('Tambah soal')
        expect(html).toContain('Memuat katalog soal…')
    })

    it('halaman daftar tidak lagi memanggil RPC editor secara eager', () => {
        const workspace = source('app/admin/AdminOperationsWorkspace.tsx')
        expect(workspace).not.toContain('questionBankService.editor')
        expect(workspace).toContain('QuestionBankEditorModal')
        const modal = source('components/admin/QuestionBankEditorModal.tsx')
        expect(modal).toContain("rpc('get_question_bank_editor'")
    })
})
