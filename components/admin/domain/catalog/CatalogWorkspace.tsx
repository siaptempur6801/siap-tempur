import AdminProductsPanel from '@/components/admin/AdminProductsPanel'
import AdminQuestionsPanel from '@/components/admin/AdminQuestionsPanel'
import { lower,n,nullable,s,type SearchParams,type ViewRow,type WorkspaceView } from '@/components/admin/AdminResourceShared'
import { AdminEmptyState,AdminFeedbackBanner,AdminPage,AdminPageHeader,adminPrimaryButtonClass,adminSecondaryButtonClass } from '@/components/admin/AdminUi'
import { AdminErrorState } from '@/components/admin/feedback/AdminErrorState'
import { AdminBreadcrumbs } from '@/components/admin/navigation/AdminBreadcrumbs'
import { adminPageSummary,parseAdminPage } from '@/lib/admin-pagination'
import { ADMIN_RESOURCE_COPY,ADMIN_RESOURCE_PERMISSIONS,ADMIN_RESOURCE_ROUTES } from '@/lib/admin-resources'
import { getServerNowMs } from '@/lib/server/time'
import { PERMISSIONS } from '@/src/auth/permissions'
import { catalogContextService } from '@/src/services/catalog-context.service'
import { adminWorkspaceService } from '@/src/services/admin-workspace.service'
import { authorizationService } from '@/src/services/authorization.service'
import Link from '@/components/admin/navigation/AdminLink'

/** Composition for the two catalog resources; workflows belong to domain components. */
export default async function AdminResourceWorkspace({ mode, searchParams }: { mode: 'products' | 'questions'; searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const actor = await authorizationService.getCurrentAuthorization()
  const permissions = new Set(actor?.permissions ?? [])
  const title = ADMIN_RESOURCE_COPY[mode].title
  if (!ADMIN_RESOURCE_PERMISSIONS[mode].some(p => permissions.has(p))) return <AdminPage><AdminPageHeader title={title}/><AdminEmptyState title="Akses tidak tersedia" description="Hubungi pengelola untuk akses workspace ini."/></AdminPage>
  const context = { programCode: (params.program || 'CPNS').toUpperCase(), trackCode: (params.track || (params.program === 'TKA' ? 'SMP' : 'SKD')).toUpperCase() }
  const pathname = ADMIN_RESOURCE_ROUTES[mode]
  const page = parseAdminPage(params.page)
  const filters = { search: params.q, status: params.status, subject: params.subject, material: params.material, submaterial: params.submaterial, review: params.review, page }
  const validEdit = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.edit || '') ? params.edit : undefined
  let workspace: WorkspaceView, domainPage: Awaited<ReturnType<typeof adminWorkspaceService.listDomainPage>>
  try {
    const results = await Promise.all([catalogContextService.resolve(context), adminWorkspaceService.listDomainPage(mode, { context, ...filters, ...(validEdit ? {id:validEdit, page:1} : {}) })])
    workspace = {catalog:results[0]}; domainPage = results[1]
  } catch { return <AdminErrorState noun={mode === 'products' ? 'produk' : 'soal'} retryHref={pathname}/> }
  const program = workspace.catalog.program.code, track = workspace.catalog.track.code
  const activeFilters = { program, track, q: params.q || '', status: params.status || '', subject: params.subject || '', material: params.material || '', submaterial: params.submaterial || '', review: params.review || '', returnTo: params.returnTo || '' }
  const query = new URLSearchParams(Object.fromEntries(Object.entries({...activeFilters, page:String(page)}).filter(([,v]) => v)))
  const closeHref = `${pathname}?${query}`
  const editHref = (_: string, id: string) => `${closeHref}&edit=${id}`
  const edited = validEdit ? domainPage.rows[0] : undefined
  const isForm = params.new === '1' || Boolean(params.edit)
  const ids = mode === 'products' ? domainPage.rows.map(row => s(row.id)) : []
  const [prices, grants] = await Promise.all([adminWorkspaceService.listProductPrices(ids), adminWorkspaceService.listProductWalletGrants(ids)])
  const priceByProduct = new Map<string,ViewRow>()
  for (const row of prices) {
    const end = nullable(row.ends_at)
    if (lower(row.status) === 'active' && (!end || Date.parse(end) >= getServerNowMs()) && !priceByProduct.has(s(row.product_id))) priceByProduct.set(s(row.product_id),row)
  }
  const grantByProduct = new Map(grants.map(row => [s(row.product_id),n(row.amount)]))
  const pageSummary = adminPageSummary(domainPage.clampTo ?? page, domainPage.rows.length, domainPage.total)
  if (isForm) {
    // Keep each domain's client form out of list-route module initialization.
    const ProductForm = mode === 'products' ? (await import('@/components/admin/domain/commerce/ProductForm')).default : null
    const QuestionBankEditor = mode === 'questions' ? (await import('@/components/admin/QuestionBankEditor')).default : null
    return <AdminPage>
    <AdminBreadcrumbs items={[{label:mode === 'questions' ? 'Content' : 'Commerce'},{label:title,href:closeHref},{label:edited ? s(edited.name || edited.question_code) : mode === 'products' ? 'Tambah produk' : 'Tambah soal'}]}/>
    <AdminPageHeader title={edited ? s(edited.name || edited.question_code) : mode === 'products' ? 'Tambah produk' : 'Tambah soal'} description={`${program} / ${track}`} action={<Link className={adminSecondaryButtonClass} href={closeHref}>Kembali ke {title}</Link>}/>
    <AdminFeedbackBanner ok={params.ok} error={params.error}/>
    {params.edit && !edited ? <AdminEmptyState title="Data tidak ditemukan" description="Data tidak tersedia dalam konteks ini. Kembali ke daftar untuk memilih resource lain."/> : ProductForm ? <ProductForm product={edited} price={edited ? priceByProduct.get(s(edited.id)) : undefined} grant={edited ? grantByProduct.get(s(edited.id)) : undefined} program={program} track={track} returnTo={closeHref}/> : QuestionBankEditor ? <QuestionBankEditor key={validEdit || 'new'} program={program} track={track} editId={validEdit || ''} subjects={workspace.catalog.subjects} returnFilters={{...activeFilters,page:String(page)}} closeHref={closeHref} canPublish={permissions.has(PERMISSIONS.CONTENT_PUBLISH)}/> : null}
  </AdminPage>
  }
  return <AdminPage>
    <AdminBreadcrumbs items={[{label:mode === 'questions' ? 'Content' : 'Commerce'},{label:title}]}/>
    <AdminPageHeader title={title} description={mode === 'questions' ? 'Kelola soal, taksonomi, dan review konten.' : 'Kelola manfaat, harga, dan kesiapan produk.'} action={<Link className={adminPrimaryButtonClass} href={`${closeHref}&new=1`}>{mode === 'products' ? 'Tambah produk' : 'Tambah soal'}</Link>}/>
    <AdminFeedbackBanner ok={params.ok} error={params.error}/>
    {mode === 'products' ? <AdminProductsPanel canProducts program={program} track={track} pathname={pathname} activeFilters={activeFilters} pageSummary={pageSummary} pageOutOfRange={Boolean(domainPage.clampTo)} products={domainPage.rows} priceByProduct={priceByProduct} grantByProduct={grantByProduct} editHref={editHref}/> : <AdminQuestionsPanel canQuestions program={program} track={track} pathname={pathname} activeFilters={activeFilters} pageSummary={pageSummary} pageOutOfRange={Boolean(domainPage.clampTo)} questions={domainPage.rows} missingQuestion={false} workspace={workspace} params={params} subjectById={new Map(workspace.catalog.subjects.map(subject=>[subject.id,subject]))} editHref={editHref}/>}
  </AdminPage>
}
