/**
 * Kontrak template ujian & assignment yang dipakai BERSAMA server dan browser.
 *
 * ## Kenapa modul terpisah
 *
 * `BatchExamPanel` adalah client component, sedangkan `organization-exam.service`
 * mengimpor `lib/utils/supabase/server.ts` yang server-only. Ketika panel itu
 * mengimpor tipe DAN konstanta dari service, bundler ikut menarik modul server ke
 * bundle browser dan build gagal dengan:
 *
 *     ./lib/utils/supabase/server.ts [Client Component Browser]
 *
 * TypeScript tidak menangkapnya karena tipe dihapus saat kompilasi — yang
 * tersisa adalah `import` nilai, dan itulah yang menyeret seluruh rantai server.
 *
 * Kesalahan yang sama pernah terjadi pada panel import peserta (Fase 4). Karena
 * itu kontrak bersama SELALU diletakkan di modul murni seperti ini.
 */

export type AssignmentRow = {
  id: string
  batch_id: string | null
  exam_id: string
  template_id: string | null
  is_active: boolean
  starts_at: string | null
  due_at: string | null
  notes: string | null
  exam_title: string | null
  exam_status: string | null
  question_count: number
  attempt_count: number
}
