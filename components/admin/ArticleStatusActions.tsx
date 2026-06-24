'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { archiveArticle, deleteArticle, publishArticle, unpublishArticle } from '@/app/actions/articles'

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
        <div className="flex flex-wrap justify-end gap-2">
            {canPublish && status !== 'published' && status !== 'archived' && (
                <button
                    type="button"
                    disabled={isPending}
                    onClick={() => runAction(() => publishArticle(articleId))}
                    className="rounded-md border-2 border-gray-900 bg-blue-600 px-3 py-2 text-sm font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                >
                    Publish
                </button>
            )}
            {canPublish && status === 'published' && (
                <button
                    type="button"
                    disabled={isPending}
                    onClick={() => runAction(() => unpublishArticle(articleId))}
                    className="rounded-md border-2 border-gray-900 bg-white px-3 py-2 text-sm font-black text-gray-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                >
                    Unpublish
                </button>
            )}
            {canArchive && status !== 'archived' && (
                <button
                    type="button"
                    disabled={isPending}
                    onClick={() => runAction(() => archiveArticle(articleId))}
                    className="rounded-md border-2 border-gray-900 bg-red-600 px-3 py-2 text-sm font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                >
                    Arsipkan
                </button>
            )}
            {canDelete && status !== 'published' && (
                <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                        if (!window.confirm('Hapus permanen artikel ini? Aksi ini tidak bisa dibatalkan.')) return
                        runAction(() => deleteArticle(articleId))
                    }}
                    className="rounded-md border-2 border-gray-900 bg-gray-900 px-3 py-2 text-sm font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                >
                    Hapus
                </button>
            )}
        </div>
    )
}
