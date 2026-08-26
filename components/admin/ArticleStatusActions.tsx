'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { archiveArticle, deleteArticle, publishArticle, unpublishArticle } from '@/app/actions/articles'
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
            {canArchive && status !== 'archived' ? <button type="button" disabled={isPending} onClick={() => runAction(() => archiveArticle(articleId))} className={adminDangerButtonClass}>Arsipkan</button> : null}
            {canDelete && status !== 'published' ? <button type="button" disabled={isPending} onClick={() => {
                if (!window.confirm('Hapus permanen artikel ini? Aksi ini tidak bisa dibatalkan.')) return
                runAction(() => deleteArticle(articleId))
            }} className={adminDangerButtonClass}>Hapus</button> : null}
        </div>
    )
}
