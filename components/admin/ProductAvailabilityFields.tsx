'use client'
import { AdminReadinessChecklist } from '@/components/admin/data-display/AdminReadinessChecklist'
import type { ProductReadiness } from '@/src/services/admin-content-readiness.service'
import { useState } from 'react'
import { AdminField,adminInputClass } from './AdminUi'
export default function ProductAvailabilityFields({type='PASS',status='DRAFT',readiness}:{type?:string;status?:string;readiness:Record<string,ProductReadiness>}) {
 const [selected,setSelected]=useState(type);const [state,setState]=useState(status)
 const gate=readiness[selected]
 return <><AdminField label="Jenis"><select className={adminInputClass} name="product_type" value={selected} onChange={e=>{setSelected(e.target.value);if(state==='ACTIVE'&&!readiness[e.target.value]?.ready)setState('DRAFT')}}><option value="TOKEN_PACK">Paket token</option><option value="PASS">Langganan (pass)</option><option value="EVENT_TICKET">Tiket event</option></select></AdminField><AdminField label="Status" error={state==='ACTIVE'&&!gate?.ready?'Produk belum dapat diaktifkan. Pilih Draft atau Archived.':undefined} fieldId="product-status"><select id="product-status" className={adminInputClass} name="status" value={state} onChange={e=>setState(e.target.value)}><option value="DRAFT">Draft</option><option value="ACTIVE" disabled={!gate?.ready}>Active</option><option value="ARCHIVED">Archived</option></select></AdminField><section className="space-y-3 rounded-lg border p-4 sm:col-span-2" aria-label="Content Readiness"><h3 className="font-bold">Content Readiness</h3><p className="text-sm text-muted-foreground">{gate?.reason}</p><AdminReadinessChecklist items={gate?.items || []}/><button type="button" className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50" disabled={!gate?.ready} onClick={()=>setState('ACTIVE')}>Aktifkan Produk</button></section></>
}
