import type { assessmentReadiness } from '@/src/services/admin-assessment-ux.service';
import type { adminExamsService } from '@/src/services/admin-exams.service';
import type { ReactNode } from 'react';
export type AdminExamsSearchParams = { ok?: string; error?: string; edit?: string; assessment?: string; new?: string; tab?: string; search?: string; q?: string; domain?: string; type?: string; status?: string; level?: string; question_page?: string; page?: string; program?: string; track?: string }
export type AssessmentWorkspaceProps = {
 data: Awaited<ReturnType<typeof adminExamsService.getWorkspace>>
 params: AdminExamsSearchParams
 program: string
 track: string
 permissions: Set<string>
 readiness: Map<string,Awaited<ReturnType<typeof assessmentReadiness>>>
 eligibleIds: Set<string>
 listHref: string
 href: (extra:Record<string,string>)=>string
 form: (exam?: Awaited<ReturnType<typeof adminExamsService.getWorkspace>>['exams'][number])=>ReactNode
 filters: {search?:string;type?:string;status?:string;page?:string;id?:string}
 listQuery: URLSearchParams
}
