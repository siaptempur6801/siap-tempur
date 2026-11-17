'use client'
import { adminExamTypeLabel } from '@/lib/admin-format'
import { usePathname,useRouter,useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { AdminStatusBadge,adminInputClass,adminSecondaryButtonClass } from './AdminUi'
export type AssessmentOption = { id: string; title: string; domain: string; type: string; level: string; questionCount: number; durationSeconds: number; status: string; eligible: boolean; reason?: string }
export default function AssessmentSelector({ options, selectedId = '', name = 'exam_id', onSelect, total = options.length, page = 1 }: { options: AssessmentOption[]; selectedId?: string; name?: string; onSelect?: (id: string) => void; total?: number; page?: number }) {
  const [selected, setSelected] = useState(selectedId)
  const [previousId,setPreviousId]=useState(selectedId);if(previousId!==selectedId){setPreviousId(selectedId);setSelected(selectedId)}
  const router = useRouter(); const pathname = usePathname(); const params = useSearchParams()
  function filter(key: string, value: string) { const q = new URLSearchParams(params.toString()); if (value) q.set(key, value); else if(key==='selector_domain') q.set(key,'all');else q.delete(key);if(key==='selector_domain')q.delete('selector_level'); if (selected) q.set('exam', selected); if (key !== 'selector_page') q.delete('selector_page'); router.replace(`${pathname}?${q}`, { scroll: false }) }
  const pageCount = Math.max(1, Math.ceil(total / 25))
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-medium">Pilih assessment</legend>
      <p className="text-sm text-muted-foreground">Hanya assessment yang siap digunakan yang dapat dipilih.</p>
      <input type="hidden" name={name} value={selected}/>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 text-xs font-medium">Cari nama assessment
          <input className={adminInputClass} defaultValue={params.get('selector_search') || ''} placeholder="Cari nama assessment..." onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); filter('selector_search', e.currentTarget.value) } }} onBlur={e => { if(e.currentTarget.value !== (params.get('selector_search') || '')) filter('selector_search', e.currentTarget.value) }}/>
        </label>
        {[{ key: 'selector_domain', label: 'Program', values: ['CPNS', 'TKA'] }, { key: 'selector_type', label: 'Jenis assessment', values: ['FULL_TRYOUT', 'MINI_TRYOUT', 'DRILL'] }, { key: 'selector_level', label: 'Track', values: ['SKD', 'SD', 'SMP', 'SMA'] }].map(f => (
          <label key={f.key} className="min-w-0 text-xs font-medium sm:w-36">{f.label}
            <select aria-label={f.label} className={adminInputClass} value={params.get(f.key)==='all'?'':params.get(f.key) || ''} onChange={e => filter(f.key, e.target.value)}>
              <option value="">Semua</option>
              {f.values.map(v => <option key={v} value={v}>{f.key === 'selector_type' ? adminExamTypeLabel(v) : v}</option>)}
            </select>
          </label>
        ))}
      </div>
      <div role="group" aria-label="Daftar assessment" className="max-h-80 overflow-y-auto rounded-md border border-border">
        {options.map(o => (
          <label key={o.id} className={`flex items-start gap-3 border-b border-border p-3 last:border-0 ${!o.eligible ? 'bg-muted text-muted-foreground' : selected === o.id ? 'bg-info-muted' : 'hover:bg-muted'}`}>
            <input type="radio" name={`${name}_selection`} value={o.id} checked={selected === o.id} disabled={!o.eligible} onChange={() => { setSelected(o.id); onSelect?.(o.id); const q = new URLSearchParams(params.toString()); q.set('exam',o.id); router.replace(`${pathname}?${q}`,{scroll:false}) }} className="mt-1"/>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{o.title}</span>
              <span className="text-xs text-muted-foreground">{o.domain} · {adminExamTypeLabel(o.type)} · {o.level} · {o.questionCount} soal · {Math.ceil(o.durationSeconds / 60)} menit</span>
              {o.reason && <span className="mt-1 block text-xs font-medium text-muted-foreground">{o.reason}</span>}
            </span>
            <AdminStatusBadge status={o.eligible ? 'ready' : 'unavailable'} label={o.eligible ? 'Siap digunakan' : 'Belum siap'}/>
          </label>
        ))}
        {!options.length && <p className="p-4 text-sm text-muted-foreground">Tidak ada assessment yang cocok. Ubah pencarian atau filter.</p>}
      </div>
      <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>{total ? `${total} assessment ditemukan · halaman ${page} dari ${pageCount}` : 'Tidak ada assessment ditemukan'}</span>
        <div className="flex gap-2">
          <button type="button" className={adminSecondaryButtonClass} disabled={page <= 1} onClick={() => filter('selector_page', String(page - 1))}>Sebelumnya</button>
          <button type="button" className={adminSecondaryButtonClass} disabled={page >= pageCount} onClick={() => filter('selector_page', String(page + 1))}>Berikutnya</button>
        </div>
      </div>
    </fieldset>
  )
}
