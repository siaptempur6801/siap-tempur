'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { archiveArticle, deleteArticle, publishArticle, unpublishArticle } from '@/app/actions/articles'
import ConfirmSubmit from '@/components/admin/ConfirmSubmit'
import { adminDangerButtonClass, adminPrimaryButtonClass, adminSecondaryButtonClass } from '@/components/admin/AdminUi'

interface ArticleStatusActionsProps {
    articleId: string
    status: 'draft' | 'published' | 'archived'
    canPublish: boolean
    canArchive: boolean
    canDelete: boolean
}

export default function ArticleStatusActions({ articleId, status, canPublish, canArchive, canDelete }: ArticleStatusActionsProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const runAction = (action: () => Promise<{ success: boolean; message: string }>) => {
        startTransition(async () => {
            const result = await action()
            if (result.success) {
                toast.success(result.message)
                router.refresh()
            } else {
                toast.error(result.message)
            }
        })
    }

    return (
        <div className="flex flex-wrap gap-2">
            {canPublish && status !== 'published' && status !== 'archived' ? <button type="button" disabled={isPending} onClick={() => runAction(() => publishArticle(articleId))} className={adminPrimaryButtonClass}>Publish</button> : null}
            {canPublish && status === 'published' ? <button type="button" disabled={isPending} onClick={() => runAction(() => unpublishArticle(articleId))} className={adminSecondaryButtonClass}>Unpublish</button> : null}
            {canArchive && status !== 'archived' ? (
                <ConfirmSubmit
                    message="Arsipkan artikel ini?"
                    detail="Artikel tidak lagi tampil di blog publik, tetapi isinya tetap tersimpan dan bisa dipublikasikan kembali."
                    confirmLabel="Arsipkan"
                    title="Konfirmasi arsipkan artikel"
                    trigger={<button type="button" disabled={isPending} onClick={() => runAction(() => archiveArticle(articleId))} className={adminDangerButtonClass}>Arsipkan</button>}
                />
            ) : null}
            {canDelete && status !== 'published' ? (
                // Sebelumnya `window.confirm` — satu-satunya dialog konfirmasi di
                // panel admin, padahal aksi lain yang sama destruktifnya tidak
                // bertanya sama sekali. Kini keduanya memakai dialog yang sama,
                // dan yang benar-benar ireversibel justru diberi peringatan tegas.
                <ConfirmSubmit
                    message="Hapus permanen artikel ini?"
                    detail="Artikel yang dihapus tidak bisa dikembalikan dari panel ini."
                    confirmLabel="Hapus permanen"
                    title="Konfirmasi hapus artikel"
                    trigger={<button type="button" disabled={isPending} onClick={() => runAction(() => deleteArticle(articleId))} className={adminDangerButtonClass}>Hapus</button>}
                />
            ) : null}
        </div>
    )
}
