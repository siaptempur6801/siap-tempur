import { createClient } from '@/lib/utils/supabase/server'
import type { AssignmentRow } from '@/lib/organization-exam'

function asObject(value: unknown): Record<string, unknown> {
  return value && !Array.isArray(value) && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {}
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function str(value: unknown): string {
  return value == null ? '' : String(value)
}

function nullableStr(value: unknown): string | null {
  return str(value) || null
}

function num(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function bool(value: unknown): boolean {
  return value === true
}

function toAssignment(row: unknown): AssignmentRow {
  const source = asObject(row)
  return {
    id: str(source.id),
    batch_id: nullableStr(source.batch_id),
    exam_id: str(source.exam_id),
    template_id: nullableStr(source.template_id),
    is_active: bool(source.is_active),
    starts_at: nullableStr(source.starts_at),
    due_at: nullableStr(source.due_at),
    notes: nullableStr(source.notes),
    exam_title: nullableStr(source.exam_title),
    exam_status: nullableStr(source.exam_status),
    question_count: num(source.question_count),
    attempt_count: num(source.attempt_count),
  }
}

/** Read organization assignments that reference shared CPNS/TKA catalog exams. */
class OrganizationExamService {
  async listAssignments(batchId: string): Promise<AssignmentRow[]> {
    const client = await createClient()
    const { data, error } = await client.rpc('admin_list_assignments', { p_batch_id: batchId })
    if (error) throw new Error(error.message)
    return asArray(asObject(data).assignments).map(toAssignment)
  }
}

export const organizationExamService = new OrganizationExamService()
