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
        for (const file of ['components/admin/QuestionBankForm.tsx', 'app/admin/content/review/page.tsx']) {
            expect(source(file), file).toContain('QuestionRichTextField')
        }
    })

    it('editor opsi memakai tombol unggah gambar', () => {
        const options = source('components/admin/QuestionOptionsEditor.tsx')
        expect(options).toContain('QuestionImageButton')
        const button = source('components/admin/QuestionImageButton.tsx')
        expect(button).toContain('data-upload-target')
    })
})

describe('tahap B — toolbar rumus', () => {
    it('field teks soal dan editor opsi memakai FormulaToolbar', () => {
        expect(source('components/admin/QuestionRichTextField.tsx')).toContain('FormulaToolbar')
        expect(source('components/admin/QuestionOptionsEditor.tsx')).toContain('FormulaToolbar')
    })

    it('snippet disisipkan lewat helper yang menempatkan kursor', () => {
        const field = source('components/admin/QuestionRichTextField.tsx')
        expect(field).toContain('insertSnippet')
        expect(field).toContain('snippet.cursorBack')
        expect(source('components/admin/QuestionOptionsEditor.tsx')).toContain('insertLatexSnippet')
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

    it('field soal dan isi opsi menerima tempel & tarik-lepas gambar', () => {
        for (const file of ['components/admin/QuestionRichTextField.tsx', 'components/admin/QuestionOptionsEditor.tsx']) {
            expect(source(file), file).toContain('useImagePasteDrop')
        }
        const hook = source('components/admin/useImagePasteDrop.ts')
        expect(hook).toContain('onPaste')
        expect(hook).toContain('onDrop')
        expect(hook).toContain('image/')
    })
})
