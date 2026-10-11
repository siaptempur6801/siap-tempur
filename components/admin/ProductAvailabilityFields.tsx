'use client'

import { AdminReadinessChecklist } from '@/components/admin/data-display/AdminReadinessChecklist'
import type { ProductReadiness } from '@/src/services/admin-content-readiness.service'
import { useState } from 'react'
import { AdminField, adminInputClass, adminPrimaryButtonClass } from './AdminUi'

export default function ProductAvailabilityFields({
  type = 'PASS',
  status = 'DRAFT',
  readiness,
}: {
  type?: string
  status?: string
  readiness: Record<string, ProductReadiness>
}) {
  const [selectedType, setSelectedType] = useState(type)
  const [selectedStatus, setSelectedStatus] = useState(status)
  const gate = readiness[selectedType]
  const activeStatusIssue = selectedStatus === 'ACTIVE' && !gate?.ready
  const statusError = activeStatusIssue
    ? status === 'ACTIVE'
      ? 'Produk ini masih berstatus Aktif, tetapi persyaratan kontennya belum terpenuhi. Pilih Draft atau Diarsipkan sebelum menyimpan.'
      : 'Persyaratan konten belum terpenuhi. Pilih Draft atau Diarsipkan.'
    : undefined

  function changeType(nextType: string) {
    setSelectedType(nextType)
    if (selectedStatus === 'ACTIVE' && !readiness[nextType]?.ready) setSelectedStatus('DRAFT')
  }

  return (
    <>
      <AdminField label="Jenis produk">
        <select
          className={adminInputClass}
          name="product_type"
          value={selectedType}
          onChange={(event) => changeType(event.target.value)}
        >
          <option value="TOKEN_PACK">Paket token</option>
          <option value="PASS">Langganan (pass)</option>
          <option value="EVENT_TICKET">Tiket event</option>
        </select>
      </AdminField>
      <AdminField label="Status" fieldId="product-status" error={statusError}>
        <select
          id="product-status"
          className={adminInputClass}
          name="status"
          value={selectedStatus}
          onChange={(event) => setSelectedStatus(event.target.value)}
        >
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE" disabled={!gate?.ready}>
            Aktif
          </option>
          <option value="ARCHIVED">Diarsipkan</option>
        </select>
      </AdminField>
      <section
        className="space-y-3 rounded-lg border border-border p-4 sm:col-span-2"
        aria-label="Kesiapan konten"
      >
        <h3 className="font-semibold">Kesiapan konten</h3>
        <p className="text-sm text-muted-foreground">{gate?.reason}</p>
        <AdminReadinessChecklist items={gate?.items || []} />
        <p className="text-xs font-medium text-muted-foreground">
          Pilih status Aktif di sini, lalu simpan perubahan produk untuk menerapkannya.
        </p>
        <button
          type="button"
          className={adminPrimaryButtonClass}
          disabled={!gate?.ready}
          onClick={() => setSelectedStatus('ACTIVE')}
        >
          Pilih status Aktif
        </button>
      </section>
    </>
  )
}
