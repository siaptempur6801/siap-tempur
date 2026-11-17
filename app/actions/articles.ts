'use server'

import { adminReturnUrl } from '@/lib/admin-return-url'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { ArticleFormSchema } from '@/lib/validations/admin'
import { validateCsrf } from '@/lib/csrf'
import { createAdminClient } from '@/lib/utils/supabase/server'
import { getCurrentUserRole, isAdminRole } from '@/lib/utils/admin'
import { PERMISSIONS, type PermissionCode } from '@/src/auth/permissions'
import { logAuditEvent } from '@/lib/audit-log'
import { logger } from '@/lib/logger'

export type ArticleActionState = {
    success: boolean
    message: string
}

type ArticleActor = {
    userId: string
    role: string
    permissions: string[]
}

type ArticleRow = {
    id: string
    title: string
    slug: string
    status: 'draft' | 'published' | 'archived'
    author_id: string | null
}

const initialErrorState = { success: false, message: 'Invalid request' }
const ARTICLE_ADMIN_PATH = '/admin/content/articles'

function readArticleForm(formData: FormData) {
    return {
        title: String(formData.get('title') || ''),
        slug: String(formData.get('slug') || ''),
        excerpt: String(formData.get('excerpt') || ''),
        content: String(formData.get('content') || ''),
        category: String(formData.get('category') || ''),
        cover_image_url: String(formData.get('cover_image_url') || ''),
    }
}

function actorHasPermission(actor: ArticleActor, permission: PermissionCode) {
    return actor.permissions.includes(permission)
}

async function requireArticleActor(permission: PermissionCode) {
    const actor = await getCurrentUserRole()
    if (!actor || !actorHasPermission(actor, permission)) return null
    return actor
}

async function readArticle(id: string): Promise<ArticleRow | null> {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
        .from('articles')
        .select('id, title, slug, status, author_id')
        .eq('id', id)
        .maybeSingle()

    if (error) {
        logger.warn('[article-read]', { error })
        return null
    }

    return data as ArticleRow | null
}

function canModifyArticle(actor: ArticleActor, article: ArticleRow) {
    if (isAdminRole(actor.role)) return true
    return article.author_id === actor.userId && article.status !== 'published'
}

export async function createArticle(_prevState: ArticleActionState, formData: FormData): Promise<ArticleActionState> {
    try { await validateCsrf() } catch { return initialErrorState }

    const actor = await requireArticleActor(PERMISSIONS.CONTENT_CREATE)
    if (!actor) return { success: false, message: 'Unauthorized' }

    const parsed = ArticleFormSchema.safeParse(readArticleForm(formData))
    if (!parsed.success) return { success: false, message: parsed.error.issues[0].message }

    const supabase = await createAdminClient()
    const { data, error } = await supabase
        .from('articles')
        .insert({ ...parsed.data, status: 'draft', author_id: actor.userId })
        .select('id')
        .single()

    if (error) {
        if (error.code === '23505') return { success: false, message: 'Slug artikel sudah dipakai' }
        logger.warn('[article-create]', { error })
        return { success: false, message: 'Artikel gagal dibuat' }
    }

    await logAuditEvent({ action: 'CREATE_ARTICLE', actor_id: actor.userId, target_type: 'article', target_id: data.id })
    revalidatePath(ARTICLE_ADMIN_PATH)
    redirect(adminReturnUrl(formData.get('return_to'),ARTICLE_ADMIN_PATH))
}

export async function updateArticle(id: string, _prevState: ArticleActionState, formData: FormData): Promise<ArticleActionState> {
    try { await validateCsrf() } catch { return initialErrorState }

    const actor = await requireArticleActor(PERMISSIONS.CONTENT_UPDATE)
    if (!actor) return { success: false, message: 'Unauthorized' }

    const article = await readArticle(id)
    if (!article) return { success: false, message: 'Artikel tidak ditemukan' }
    if (!canModifyArticle(actor, article)) return { success: false, message: 'Unauthorized' }

    const parsed = ArticleFormSchema.safeParse(readArticleForm(formData))
    if (!parsed.success) return { success: false, message: parsed.error.issues[0].message }

    const supabase = await createAdminClient()
    const { error } = await supabase.from('articles').update(parsed.data).eq('id', id)

    if (error) {
        if (error.code === '23505') return { success: false, message: 'Slug artikel sudah dipakai' }
        logger.warn('[article-update]', { error, id })
        return { success: false, message: 'Artikel gagal diupdate' }
    }

    await logAuditEvent({ action: 'UPDATE_ARTICLE', actor_id: actor.userId, target_type: 'article', target_id: id })
    revalidatePath(ARTICLE_ADMIN_PATH)
    revalidatePath(`/blog/${parsed.data.slug}`)
    redirect(adminReturnUrl(formData.get('return_to'),ARTICLE_ADMIN_PATH))
}

export async function publishArticle(id: string): Promise<ArticleActionState> {
    try { await validateCsrf() } catch { return initialErrorState }

    const actor = await requireArticleActor(PERMISSIONS.CONTENT_PUBLISH)
    if (!actor) return { success: false, message: 'Unauthorized' }

    const supabase = await createAdminClient()
    const { data, error } = await supabase
        .from('articles')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', id)
        .select('slug')
        .single()

    if (error) {
        logger.warn('[article-publish]', { error, id })
        return { success: false, message: 'Artikel gagal dipublish' }
    }

    await logAuditEvent({ action: 'PUBLISH_ARTICLE', actor_id: actor.userId, target_type: 'article', target_id: id })
    revalidatePath('/blog')
    revalidatePath(`/blog/${data.slug}`)
    revalidatePath(ARTICLE_ADMIN_PATH)
    return { success: true, message: 'Artikel dipublish' }
}

export async function unpublishArticle(id: string): Promise<ArticleActionState> {
    try { await validateCsrf() } catch { return initialErrorState }

    const actor = await requireArticleActor(PERMISSIONS.CONTENT_PUBLISH)
    if (!actor) return { success: false, message: 'Unauthorized' }

    const supabase = await createAdminClient()
    const { data, error } = await supabase
        .from('articles')
        .update({ status: 'draft', published_at: null })
        .eq('id', id)
        .select('slug')
        .single()

    if (error) {
        logger.warn('[article-unpublish]', { error, id })
        return { success: false, message: 'Artikel gagal ditarik dari publik' }
    }

    await logAuditEvent({ action: 'UNPUBLISH_ARTICLE', actor_id: actor.userId, target_type: 'article', target_id: id })
    revalidatePath('/blog')
    revalidatePath(`/blog/${data.slug}`)
    revalidatePath(ARTICLE_ADMIN_PATH)
    return { success: true, message: 'Artikel menjadi draft' }
}

export async function archiveArticle(id: string): Promise<ArticleActionState> {
    try { await validateCsrf() } catch { return initialErrorState }

    const actor = await requireArticleActor(PERMISSIONS.CONTENT_UPDATE)
    if (!actor) return { success: false, message: 'Unauthorized' }

    const article = await readArticle(id)
    if (!article) return { success: false, message: 'Artikel tidak ditemukan' }
    if (!canModifyArticle(actor, article)) return { success: false, message: 'Unauthorized' }

    const supabase = await createAdminClient()
    const { error } = await supabase
        .from('articles')
        .update({ status: 'archived', published_at: null })
        .eq('id', id)

    if (error) {
        logger.warn('[article-archive]', { error, id })
        return { success: false, message: 'Artikel gagal diarsipkan' }
    }

    await logAuditEvent({ action: 'ARCHIVE_ARTICLE', actor_id: actor.userId, target_type: 'article', target_id: id })
    revalidatePath('/blog')
    revalidatePath(ARTICLE_ADMIN_PATH)
    return { success: true, message: 'Artikel diarsipkan' }
}

export async function deleteArticle(id: string): Promise<ArticleActionState> {
    try { await validateCsrf() } catch { return initialErrorState }

    const actor = await getCurrentUserRole()
    if (!actor || !isAdminRole(actor.role)) return { success: false, message: 'Unauthorized' }

    const article = await readArticle(id)
    if (!article) return { success: false, message: 'Artikel tidak ditemukan' }
    if (article.status === 'published') return { success: false, message: 'Artikel published harus di-unpublish sebelum dihapus permanen' }

    const supabase = await createAdminClient()
    const { error } = await supabase.from('articles').delete().eq('id', id)

    if (error) {
        logger.warn('[article-delete]', { error, id })
        return { success: false, message: 'Artikel gagal dihapus' }
    }

    await logAuditEvent({
        action: 'DELETE_ARTICLE',
        actor_id: actor.userId,
        target_type: 'article',
        target_id: id,
        details: { title: article.title, slug: article.slug, status: article.status },
    })

    revalidatePath('/blog')
    revalidatePath(`/blog/${article.slug}`)
    revalidatePath(ARTICLE_ADMIN_PATH)
    return { success: true, message: 'Artikel dihapus permanen' }
}
