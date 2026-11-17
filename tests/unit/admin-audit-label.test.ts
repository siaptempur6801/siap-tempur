import { describe, expect, it } from 'vitest'
import { adminAuditLabel } from '@/lib/admin-format'

describe('adminAuditLabel', () => {
  it('menerjemahkan aksi yang dikenal ke bahasa operasional', () => {
    expect(adminAuditLabel('question.content.created')).toBe('Soal dibuat (draft)')
    expect(adminAuditLabel('question.workflow.published')).toBe('Soal diterbitkan')
    expect(adminAuditLabel('content.review.assigned')).toBe('Reviewer ditugaskan')
    expect(adminAuditLabel('PUBLISH_QUESTION')).toBe('Soal diterbitkan')
    expect(adminAuditLabel('REMOVE_PARTICIPANT')).toBe('Peserta dikeluarkan')
  })

  it('aksi tak dikenal tetap terbaca (pemisah jadi spasi), bukan kode mentah', () => {
    expect(adminAuditLabel('exam.something.happened')).toBe('exam something happened')
    expect(adminAuditLabel('ORG_CREATE')).toBe('ORG CREATE')
  })

  it('nilai kosong menjadi tanda hubung', () => {
    expect(adminAuditLabel(null)).toBe('—')
    expect(adminAuditLabel('')).toBe('—')
  })
})
