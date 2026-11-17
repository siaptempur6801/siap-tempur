import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Tahap A — upload gambar soal/opsi.
 *   - policy bucket `question-images` mengizinkan pemegang permission konten
 *     mengunggah ke folder `questions/<uid>/`;
 *   - editor artikel memakai bucket `article-images` (policy lama yang memeriksa
 *     kolom `profiles.role` sudah dihapus di Schema V2 → upload artikel rusak);
 *   - form soal & review memakai field dengan tombol sisipkan gambar.
 */
const repoRoot = resolve(__dirname, '../..')
function source(relativePath: string) {
    return readFileSync(resolve(repoRoot, relativePath), 'utf8')
}

const migration = source('supabase/migrations/20260922120000_question_image_upload_v1.sql')

describe('upload gambar soal', () => {
    it('policy mengizinkan folder questions/<uid> untuk pemegang permission konten', () => {
        expect(migration).toContain('question_images_content_upload')
        expect(migration).toContain("(storage.foldername(name))[1] = 'questions'")
        expect(migration).toContain("(storage.foldername(name))[2] = (select auth.uid())::text")
        expect(migration).toMatch(/current_user_has_permission\('content\.create'\)/)
        expect(migration).toMatch(/current_user_has_permission\('question\.manage'\)/)
        // Policy rusak yang memeriksa kolom terhapus harus dibuang.
        expect(migration).toContain('drop policy if exists "Article writers can upload own article images"')
    })

    it('editor artikel memakai bucket article-images, bukan question-images', () => {
        const editor = source('components/admin/ArticleRichTextEditor.tsx')
        expect(editor).toContain("storage.from('article-images')")
        expect(editor).not.toContain("storage.from('question-images')")
    })

    it('form soal dan review memakai field dengan tombol sisipkan gambar', () => {
        expect(source('components/admin/QuestionBankForm.tsx')).toContain('QuestionRichTextEditor')
        expect(source('components/admin/domain/content/ReviewWorkspace.tsx')).toContain('QuestionRichTextEditor')
    })

    it('editor opsi memakai tombol unggah gambar', () => {
        const options = source('components/admin/QuestionOptionsEditor.tsx')
        expect(options).toContain('QuestionImageButton')
        const button = source('components/admin/QuestionImageButton.tsx')
        expect(button).toContain('data-upload-target')
    })
})

describe('tahap B — toolbar rumus', () => {
    it('editor soal, editor opsi, dan form review memakai FormulaToolbar', () => {
        expect(source('components/admin/QuestionRichTextEditor.tsx')).toContain('FormulaToolbar')
        expect(source('components/admin/QuestionOptionsEditor.tsx')).toContain('QuestionRichTextEditor')
        expect(source('components/admin/domain/content/ReviewWorkspace.tsx')).toContain('QuestionRichTextEditor')
    })

    it('snippet disisipkan sebagai node rumus di editor visual', () => {
        const editor = source('components/admin/QuestionRichTextEditor.tsx')
        expect(editor).toContain('insertSnippet')
        expect(editor).toContain('snippet.latex')
        expect(editor).not.toContain('snippet.cursorBack')
    })
})

describe('sisa opsional — paste/drag-drop & kompresi', () => {
    it('tombol dan field memakai jalur unggah bersama (validasi + kompresi)', () => {
        expect(source('components/admin/QuestionImageButton.tsx')).toContain('uploadQuestionImage')
        const client = source('lib/question-media-client.ts')
        expect(client).toContain('compressQuestionImage')
        expect(client).toContain('validateQuestionImageInput')
        expect(client).toContain('validateQuestionImage(')
    })

    it('editor soal menerima tempel & tarik-lepas gambar', () => {
        const editor = source('components/admin/QuestionRichTextEditor.tsx')
        expect(editor).toContain('handlePasteCapture')
        expect(editor).toContain('handleDropCapture')
        expect(editor).toContain('onPasteCapture')
        expect(editor).toContain('onDropCapture')
        // Field textarea lama (QuestionRichTextField + useImagePasteDrop) sudah
        // dihapus; jalur tempel/drop hanya ada di editor visual.
        expect(editor).toContain("candidate.type.startsWith('image/')")
    })
})

describe('editor visual soal (WYSIWYG)', () => {
    it('Question Bank memakai editor visual, bukan textarea', () => {
        const form = source('components/admin/QuestionBankForm.tsx')
        expect(form).toContain('QuestionRichTextEditor')
        expect(form).not.toContain('QuestionRichTextField')
    })

    it('renderer peserta mendukung node rumus & gambar editor', () => {
        const renderer = source('components/MathRenderer.tsx')
        expect(renderer).toContain('parseRichTextSegments')
        expect(renderer).toContain("'img'")
        expect(renderer).toContain('data-latex')
    })

    it('editor menyimpan HTML, read-only saat terkunci, dan menerima paste/drop', () => {
        const editor = source('components/admin/QuestionRichTextEditor.tsx')
        expect(editor).toContain('data-latex')
        expect(editor).toContain('setEditable')
        expect(editor).toContain('handlePaste')
        expect(editor).toContain('handleDrop')
        expect(editor).toContain("name={name}")
    })

    it('isi opsi memakai editor visual ringkas tanpa input tersembunyi sendiri', () => {
        const options = source('components/admin/QuestionOptionsEditor.tsx')
        expect(options).toContain('<QuestionRichTextEditor')
        expect(options).toContain('compact')
        expect(options).toContain('hiddenInput={false}')
        expect(options).not.toContain('<textarea')
    })

    it('form Review memakai editor visual, bukan textarea', () => {
        const page = source('components/admin/domain/content/ReviewWorkspace.tsx')
        expect(page).toContain('QuestionRichTextEditor')
        expect(page).not.toContain('QuestionRichTextField')
    })

    it('rumus bisa diklik untuk diubah isinya (bukan node mati)', () => {
        const editor = source('components/admin/QuestionRichTextEditor.tsx')
        expect(editor).toContain('Klik untuk mengubah rumus')
        expect(editor).toContain('LaTeX rumus')
        expect(editor).toContain('updateAttributes')
        expect(editor).toContain('deleteNode')
        expect(editor).toContain('autoEdit')
        expect(editor).toContain('errorColor')
    })

    it('editor ringkas menyembunyikan daftar dan menaruh tombol gambar di toolbar', () => {
        const editor = source('components/admin/QuestionRichTextEditor.tsx')
        expect(editor).toContain('compact ?')
        expect(editor).toContain('<FormulaToolbar compact={compact}')
    })
})
