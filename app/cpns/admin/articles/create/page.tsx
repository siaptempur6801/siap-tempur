import ArticleForm from '@/components/admin/ArticleForm'
import { createArticle } from '@/app/actions/articles'

export const dynamic = 'force-dynamic'

export default function CreateArticlePage() {
    return <ArticleForm title="Buat Artikel Baru" action={createArticle} />
}
