import { adminRouteState } from '@/lib/admin-routes'
import type { SupabaseClient } from '@supabase/supabase-js'
import { expect,type Page } from '@playwright/test'
export async function openAssessmentDistribution(page:Page,examId?:string,program='CPNS',track='SKD') {
 await page.goto(`/admin/assessments?program=${program}&track=${track}${examId?`&assessment=${examId}&tab=distribution`:''}`)
 if(!examId) {await page.locator('tr[data-assessment-id]').filter({hasText:'Siap'}).first().getByRole('link',{name:'Lihat',exact:true}).click();await page.getByRole('link',{name:'Distribution',exact:true}).click()}
}
export async function createWorkflowEvent(page:Page,title:string,code:string,examId:string,program:string,track:string,wib:(minutes:number)=>string) {
 await openAssessmentDistribution(page,examId,program,track)
 await page.getByRole('link',{name:'Buat Event',exact:true}).click()
 await expect(page.locator('input[name="next_exam_id"]')).toHaveValue(examId)
 const form=page.locator('form').filter({has:page.locator('input[name="code"]')})
 await form.locator('[name="code"]').fill(code);await form.locator('[name="title"]').fill(title);await form.locator('[name="status"]').selectOption('live')
 await form.locator('[name="registration_start"]').fill(wib(-60));await form.locator('[name="registration_end"]').fill(wib(120));await form.locator('[name="starts_at"]').fill(wib(-30));await form.locator('[name="ends_at"]').fill(wib(240));await form.locator('[name="capacity"]').fill('20')
 await form.getByRole('button',{name:'Review Event',exact:true}).click();await form.getByRole('button',{name:'Buat Event',exact:true}).click()
 await expect(page.getByRole('status').filter({hasText:'Event tersimpan.'})).toBeVisible({timeout:30000})
 const eventId=adminUrlState(page.url()).get('event');if(!eventId)throw new Error('Event context was lost after create')
 return eventId
}

/** Await persisted autosave before a navigation that cancels pending requests. */
export async function waitForSavedFirstAnswer(db:SupabaseClient,attemptId:string) {
 const {data:question,error}=await db.from('attempt_questions').select('id').eq('attempt_id',attemptId).eq('position',1).single();if(error)throw error
 await expect.poll(async()=>{
  const {data:answer,error}=await db.from('attempt_answers').select('id,answered_at,selected_option_id').eq('attempt_question_id',question.id).maybeSingle();if(error)throw error
  if(!answer?.answered_at)return false
  if(answer.selected_option_id)return true
  const {count,error:optionsError}=await db.from('attempt_answer_options').select('option_id',{count:'exact',head:true}).eq('attempt_answer_id',answer.id);if(optionsError)throw optionsError
  return (count || 0)>0
 },{timeout:30_000}).toBe(true)
}
/** Full TKA always uses the custom confirmation; do not swallow a missed click. */
export async function finishFullTkaSection(page:Page,label:'Selesaikan bagian'|'Kirim tryout') {
 const trigger=page.getByRole('button',{name:label,exact:true})
 await expect(trigger).toBeEnabled();await expect(trigger).not.toHaveAttribute('data-press-lock','true');await trigger.click()
 const confirm=page.getByTestId('tka-section-confirm');await expect(confirm).toBeVisible({timeout:15_000});await expect(confirm).toBeEnabled();await confirm.click()
}

/** Assert URL state using the same route contract; IDs are no longer query filters. */
export function adminUrlState(href: string) {
 const url = new URL(href, 'http://local')
 const params = new URLSearchParams(url.searchParams)
 for(const [key,value] of Object.entries(adminRouteState(url.pathname)?.context || {})) params.set(key,value)
 return params
}
