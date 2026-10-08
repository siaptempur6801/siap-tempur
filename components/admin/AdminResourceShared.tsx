import { AdminCard,AdminEmptyState,adminSecondaryButtonClass } from '@/components/admin/AdminUi'
import { adminStatusLabel } from '@/lib/admin-format'
import { adminPageSummary } from '@/lib/admin-pagination'
import type { AdminResourceMode } from '@/lib/admin-resources'
import Link from '@/components/admin/navigation/AdminLink'

export type ViewRow = Record<string, unknown>

export type WorkspaceView = {
    catalog: {
        program: { id: string; code: string; name: string }
        track: { id: string; code: string; name: string }
        subjects: Array<{ id: string; code: string; name: string }>
        examTypes: Array<{ id: string; code: string; name: string }>
    }

}

export type SearchParams = {
    ok?: string
    error?: string
    edit?: string
    program?: string
    track?: string
    page?: string
    q?: string
    status?: string
    subject?: string
    material?: string
    submaterial?: string
    review?: string
    returnTo?: string
    new?: string
}

export type ActiveFilters = { program: string; track: string; q: string; status: string; subject: string; material?: string; submaterial?: string; review?: string; returnTo?: string }
export type PageSummary = ReturnType<typeof adminPageSummary>

export const DOMAIN_SEARCH_PLACEHOLDER = {
    products: 'Cari kode atau nama produk…',
    questions: 'Cari kode soal atau isi pertanyaan…',
} as const

export const DOMAIN_STATUS_OPTIONS: Record<'products' | 'questions', ReadonlyArray<{ value: string; label: string }>> = {
    products: [
        { value: 'DRAFT', label: 'Draft' },
        { value: 'ACTIVE', label: 'Active' },
        { value: 'ARCHIVED', label: 'Archived' },
    ],
    questions: [
        { value: 'draft', label: 'Draft' },
        { value: 'published', label: 'Terbit' },
        { value: 'archived', label: 'Archived' },
        ...['submitted', 'editorial_review', 'academic_review', 'technical_qa', 'revision_required', 'approved', 'rejected'].map((value) => ({ value, label: value === 'submitted' ? 'Diajukan' : adminStatusLabel(value) })),
    ],
}

export type AdminProductsPanelProps = {
    canProducts: boolean
    program: string
    track: string
    pathname: string
    activeFilters: ActiveFilters
    pageSummary: PageSummary | null
    pageOutOfRange: boolean
    products: ViewRow[]
    priceByProduct: Map<string, ViewRow>
    grantByProduct: Map<string, number>
    editHref: (targetMode: AdminResourceMode, id: string) => string
}

export type AdminQuestionsPanelProps = {
    canQuestions: boolean
    program: string
    track: string
    pathname: string
    activeFilters: ActiveFilters
    pageSummary: PageSummary | null
    pageOutOfRange: boolean
    questions: ViewRow[]
    missingQuestion: boolean
    workspace: WorkspaceView
    params: SearchParams
    subjectById: Map<string, { id: string; code: string; name: string }>
    editHref: (targetMode: AdminResourceMode, id: string) => string
}

export function s(value: unknown) { return typeof value === 'string' ? value : value == null ? '' : String(value) }
export function n(value: unknown) { const parsed = Number(value ?? 0); return Number.isFinite(parsed) ? parsed : 0 }
export function nullable(value: unknown) { const valueString = s(value); return valueString || null }
export function lower(value: unknown) { return s(value).toLowerCase() }

export function ContextFields({ program, track }: { program: string; track: string }) {
    return <><input type="hidden" name="program_code" value={program}/><input type="hidden" name="track_code" value={track}/></>
}

export function PermissionEmpty({ permission }: { permission: string }) {
    return <AdminCard><AdminEmptyState title="Akses tidak tersedia" description={`Akun ini tidak memiliki permission ${permission}.`}/></AdminCard>
}

export function PageOutOfRange({ lastPage, href, noun }: { lastPage: number; href: string; noun: string }) {
    return (
        <AdminEmptyState
            title={`Tidak ada ${noun} di halaman ini`}
            description={`Daftar hanya punya ${lastPage} halaman. Nomor halaman di alamat mungkin sudah usang — buka halaman terakhir untuk melihat ${noun} terbaru.`}
            action={<Link className={adminSecondaryButtonClass} href={href}>Ke halaman {lastPage}</Link>}
        />
    )
}
