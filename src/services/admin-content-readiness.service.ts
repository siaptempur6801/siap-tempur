import { cache } from 'react'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createAdminClient } from '@/lib/utils/supabase/server'
import { assessmentCatalogService } from './assessment-catalog.service'
import type { ReadinessItem } from '@/components/admin/data-display/AdminReadinessChecklist'
async function manifest(name: string) {
  const text = await readFile(join(process.cwd(), 'docs/content/cpns', name), 'utf8')
  const [header, ...lines] = text.trim().split(/\r?\n/)
  const keys = header.split('\t')
  return lines.map((line) => Object.fromEntries(line.split('\t').map((v, i) => [keys[i], v])))
}
/** Audited evidence, explicitly labelled as a production snapshot, never as live staging data. */
export const cpnsContentAudit = cache(async () => {
  const names = [
    ['Full Tryout', 'full-tryout-01.tsv'],
    ['Mini TWK', 'mini-twk-01.tsv'],
    ['Mini TIU', 'mini-tiu-01.tsv'],
    ['Mini TKP', 'mini-tkp-01.tsv'],
  ]
  const assessments = await Promise.all(
    names.map(async ([name, file]) => {
      const rows = await manifest(file)
      return {
        name,
        total: rows.length,
        approved: rows.filter((r) => r.content_review_state === 'APPROVED').length,
        blockedAsset: rows.filter((r) => r.content_review_state === 'BLOCKED_ASSET').length,
        needsReview: rows.filter((r) => r.content_review_state === 'NEEDS_REVIEW').length,
        frozen: rows.every((r) => r.content_version === 'approved-v1'),
      }
    }),
  )
  const nodes = await manifest('drill-node-readiness-v1.tsv')
  return {
    assessments,
    nodes,
    date: '7 Oktober 2026',
    readyNodes: nodes.filter((n) => n.state === 'FROZEN_V1_READY').length,
    totalNodes: 28,
  }
})
export type ProductReadiness = { ready: boolean; items: ReadinessItem[]; reason: string }
const distributableCatalog = cache(() => assessmentCatalogService.listDistributable())
export const productReadiness = cache(
  async (
    program: string,
    track: string,
    type: string,
    productId?: string,
  ): Promise<ProductReadiness> => {
    const db = await createAdminClient()
    const catalog = (await distributableCatalog()).filter(
      (a) => a.domain === program && a.trackCode === track,
    )
    const has = (kind: string) => catalog.some((a) => a.kind === kind)
    const items: ReadinessItem[] = []
    if (type === 'TOKEN_PACK')
      items.push({
        label: 'Full Tryout tersedia',
        ready: has('TRYOUT'),
        detail: 'Assessment aktif dengan konten yang dapat digunakan.',
      })
    if (program === 'CPNS' && type === 'TOKEN_PACK') {
      const audit = await cpnsContentAudit()
      const full = audit.assessments[0]
      items.push({
        label: 'Review Full Tryout production',
        ready: full.approved === full.total && full.frozen,
        detail: `${full.approved} / ${full.total} approved · ${full.blockedAsset} blocked asset. Audit production ${audit.date}.`,
        href: '/admin/content/readiness?program=CPNS&track=SKD',
      })
      // No accepted production release evidence exists in the audited source. Fail closed; do not invent a QA PASS.
      items.push({
        label: 'Technical QA & participant smoke production',
        ready: false,
        detail: 'Belum ada bukti release Full Tryout production yang disetujui pada audit konten.',
      })
    }
    if (type === 'EVENT_TICKET') {
      const result = productId
        ? await db
            .from('event_products')
            .select('session_id,event_sessions(exam_id)')
            .eq('product_id', productId)
            .eq('status', 'active')
            .maybeSingle()
        : { data: null, error: null }
      if (result.error) throw result.error
      const session = result.data?.event_sessions as unknown as { exam_id: string } | null
      items.push({
        label: 'Sesi Event terhubung',
        ready: !!session && catalog.some((a) => a.id === session.exam_id),
        detail: 'Hubungkan produk ke sesi Event dengan assessment yang tersedia.',
      })
    }
    if (!items.length) items.push({ label: 'Jenis produk didukung', ready: false })
    const ready = items.every((i) => i.ready)
    return {
      ready,
      items,
      reason: ready
        ? 'Konten memenuhi kebutuhan produk.'
        : 'Produk belum dapat diaktifkan. Lengkapi requirement yang belum siap.',
    }
  },
)
