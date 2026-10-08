import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Regresi nyata: saat editor opsi dipindah ke `ReviewQuestionFields`, prop
 * `defaultValue` ikut hilang sehingga form edit Review menampilkan opsi
 * contoh kosong (A–D) alih-alih opsi tersimpan. Data di database tidak rusak,
 * tetapi admin tidak bisa melihat/menyunting opsi yang ada.
 */
const repoRoot = resolve(__dirname, '../..')
function source(relativePath: string) {
    return readFileSync(resolve(repoRoot, relativePath), 'utf8')
}

describe('form edit Review mempertahankan opsi tersimpan', () => {
    it('ReviewQuestionFields meneruskan defaultValue ke QuestionOptionsEditor', () => {
        const component = source('components/admin/ReviewQuestionFields.tsx')
        expect(component).toContain('optionsDefaultValue')
        expect(component).toContain('defaultValue={optionsDefaultValue}')
    })

    it('form edit mengirim opsi dari detail soal', () => {
        expect(source('components/admin/domain/content/ReviewWorkspace.tsx')).toContain('optionsDefaultValue={serializeOptionRows(data.options)}')
    })
})
