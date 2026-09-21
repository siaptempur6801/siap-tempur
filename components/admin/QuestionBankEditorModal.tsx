'use client'

import { useCallback, useRef, useState } from 'react'
import AdminModal from '@/components/admin/AdminModal'
import QuestionBankForm, { QuestionBankWorkflow } from '@/components/admin/QuestionBankForm'
import { adminSecondaryButtonClass } from '@/components/admin/AdminUi'
import { createClient } from '@/lib/utils/supabase/client'
import type { QuestionBankDetail } from '@/lib/question-bank'

type Props = {
    program: string
    track: string
    /** UUID soal yang sedang diedit; kosong berarti form soal baru. */
    editId: string
    subjects: { id: string; code: string; name: string }[]
    returnFilters: Record<string, string>
    closeHref: string
    canPublish: boolean
}

/**
 * Modal Question Bank yang memuat katalognya malas (lazy).
 *
 * `get_question_bank_editor` mengembalikan SELURUH stimulus satu track beserta
 * isinya — terukur ~24 kB konten stimulus per track SD/SMP di staging. Sebelumnya RPC itu
 * dipanggil di setiap pemuatan halaman daftar, padahal formnya tertutup dan
 * stimulus hanya dipakai untuk dropdown/preview. Kini katalog dimuat saat modal
 * benar-benar dibuka: dari trigger (soal baru) atau saat mount bila URL sudah
 * menentukan soal yang diedit.
 *
 * Pemanggilan langsung dari browser memakai sesi pengguna; guard permission dan
 * status akun tetap dijalankan di database oleh RPC itu sendiri.
 */
export default function QuestionBankEditorModal({ program, track, editId, subjects, returnFilters, closeHref, canPublish }: Props) {
    const [detail, setDetail] = useState<QuestionBankDetail | null>(null)
    const [error, setError] = useState('')
    const requestedRef = useRef(false)

    const load = useCallback(async () => {
        if (requestedRef.current) return
        requestedRef.current = true
        // Tidak ada setState SEBELUM await: efek pemanggil tidak boleh memicu
        // render tambahan secara sinkron. Status "memuat" adalah keadaan default
        // selama belum ada detail maupun error.
        const { data, error: rpcError } = await createClient().rpc('get_question_bank_editor', {
            p_program: program,
            p_track: track,
            p_id: editId || null,
        })
        if (rpcError || !data || typeof data !== 'object') {
            requestedRef.current = false
            setError('Katalog soal tidak dapat dimuat. Periksa koneksi Anda, lalu coba lagi.')
            return
        }
        setError('')
        setDetail(data as unknown as QuestionBankDetail)
    }, [program, track, editId])

    // URL sudah menentukan soal yang diedit → modal terbuka sejak render pertama
    // dan `onOpen` dari AdminModal yang memicu pemuatan (lihat komentar di sana).
    const question = detail?.question ?? null
    return (
        <AdminModal
            key={editId || 'new'}
            title={question ? 'Detail & edit soal' : 'Tambah soal'}
            description="Simpan draf, periksa pratinjau, lalu ajukan melalui alur review."
            triggerLabel={question ? 'Buka soal' : 'Tambah soal'}
            defaultOpen={Boolean(editId)}
            closeHref={closeHref}
            size="wide"
            confirmUnsaved
            onOpen={() => { if (!detail) void load() }}
        >
            {detail ? (
                <>
                    <QuestionBankForm key={question ? String(question.id) : 'new'} detail={detail} program={program} track={track} subjects={subjects} returnFilters={returnFilters}/>
                    {question ? <div className="mt-5"><QuestionBankWorkflow question={question} program={program} track={track} returnFilters={returnFilters} canPublish={canPublish}/></div> : null}
                </>
            ) : error ? (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    <p>{error}</p>
                    <button type="button" className={`${adminSecondaryButtonClass} mt-2`} onClick={() => { setError(''); void load() }}>Coba lagi</button>
                </div>
            ) : (
                <p role="status" className="text-sm font-semibold text-slate-600">Memuat katalog soal…</p>
            )}
        </AdminModal>
    )
}
