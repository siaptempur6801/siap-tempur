import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
const rpc = vi.hoisted(() => vi.fn())
vi.mock('@/lib/utils/supabase/server', () => ({ createClient: async () => ({ rpc }) }))
vi.mock('@/components/admin/QuestionBankForm', () => ({
  default: () => null,
  QuestionBankWorkflow: () => null,
}))
import QuestionBankEditor from '@/components/admin/QuestionBankEditor'
describe('Question editor is contextual and respects the authenticated RPC', () => {
  it('passes the selected question and context to the permission guarded RPC', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'Forbidden' } })
    const element = await QuestionBankEditor({
      program: 'CPNS',
      track: 'SKD',
      editId: 'selected-question',
      subjects: [],
      returnFilters: {},
      closeHref: '/admin/content/questions?status=published',
      canPublish: false,
    })
    const html = renderToStaticMarkup(element)
    expect(rpc).toHaveBeenCalledWith('get_question_bank_editor', {
      p_program: 'CPNS',
      p_track: 'SKD',
      p_id: 'selected-question',
    })
    expect(html).toContain('Gagal memuat detail soal.')
    expect(html).toContain('/admin/content/questions/selected-question/edit?status=published')
    expect(html).not.toContain('Jawaban benar')
  })
  it('loads the editor only for the detail/create page, never the list', () => {
    const source = readFileSync(
      resolve(__dirname, '../../components/admin/domain/catalog/CatalogWorkspace.tsx'),
      'utf8',
    )
    expect(source).not.toContain('questionBankService.editor')
    const branch = source.indexOf('if (isForm)')
    expect(branch).toBeGreaterThan(0)
    expect(source.indexOf('<QuestionBankEditor')).toBeGreaterThan(branch)
    expect(source.slice(source.indexOf('return <AdminPage>', branch + 20))).not.toContain(
      "rpc('get_question_bank_editor'",
    )
  })
})
