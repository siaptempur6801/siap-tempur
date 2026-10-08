import { adminUrlState } from '../admin-workflow'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { expect,test } from '@playwright/test'
import { createWorkflowEvent } from '../admin-workflow'
function wib(minutes:number) {return new Date(Date.now()+(minutes+420)*60000).toISOString().slice(0,16)}
function urlState(value:string) {const url=new URL(value);return `${url.pathname}|${JSON.stringify([...url.searchParams.entries()].sort(([a,av],[b,bv])=>a.localeCompare(b)||av.localeCompare(bv)))}`}
test.describe.configure({retries:0})
test('Assessment → Event / Instansi → Monitoring → Result preserves identifiers, filters and Back',async({page},testInfo)=>{
 test.setTimeout(300000)
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL!,key=process.env.SUPABASE_SERVICE_ROLE_KEY!
 if(new URL(url).hostname.split('.')[0]!=='lpgrivowdcepcxradavu')throw new Error('Staging only')
 const db=createClient(url,key,{auth:{persistSession:false}})
 const {userId}=JSON.parse(readFileSync('playwright/.auth/admin-user-meta.json','utf8')) as {userId:string}
 const suffix=randomUUID().slice(0,8).toUpperCase();const name=`E2E P1 ${suffix}`
 let eventId='',orgId='',batchId='';const attemptIds:string[]=[]
 try {
  const {data:exam,error}=await db.from('exams').select('id,title,program_id,track_id').eq('slug','qa-cpns-mini-tiu').single();if(error)throw error
  const assessmentId=exam.id
  const list=`/admin/assessments?program=CPNS&track=SKD&search=${encodeURIComponent(exam.title)}&type=MINI_TRYOUT&status=active&page=1`
  await page.goto(list);await page.locator(`tr[data-assessment-id="${assessmentId}"]`).getByRole('link',{name:'Lihat',exact:true}).click()
  await expect(page).toHaveURL(new RegExp(`/admin/assessments/${assessmentId}(?:\\?|$)`));await page.getByRole('link',{name:'Distribusi',exact:true}).click()
  await expect(page).toHaveURL(/\/distribution(?:\?|$)/);await page.reload();await expect(page.getByRole('link',{name:'Buat Event',exact:true})).toHaveAttribute('data-assessment-id',assessmentId);await page.screenshot({path:testInfo.outputPath('assessment-distribution.png'),fullPage:true})
  await page.goBack();await expect(page).toHaveURL(new RegExp(`/admin/assessments/${assessmentId}(?:\\?|$)`));await expect(page.locator('html')).toHaveAttribute('data-interaction-guard','ready');await page.getByRole('navigation',{name:'Breadcrumb'}).getByRole('link',{name:'Assessment',exact:true}).click();await expect(page).not.toHaveURL(/\/assessments\/[^?]+/,{timeout:30000});expect(new URL(page.url()).searchParams.get('search')).toBe(exam.title)
  eventId=await createWorkflowEvent(page,`${name} Event`,`E2E-P1-${suffix}`,assessmentId,'CPNS','SKD',wib)
  const {data:sessions,error:sessionError}=await db.from('event_sessions').select('id,exam_id,event_id').eq('event_id',eventId);if(sessionError)throw sessionError;expect(sessions).toHaveLength(1);expect(sessions![0].exam_id).toBe(assessmentId)
  await page.getByRole('link',{name:'Pengaturan',exact:true}).click();await expect(page.getByRole('navigation',{name:'Bagian pengaturan event'})).toBeVisible()
  await page.screenshot({path:testInfo.outputPath('event-settings.png'),fullPage:true})
  await page.getByRole('link',{name:'Sesi & assessment',exact:true}).click();await expect(page.getByRole('heading',{name:'Sesi event',exact:true})).toBeVisible();await expect(page.getByText('Maksimal 20 peserta',{exact:true})).toBeVisible();await page.screenshot({path:testInfo.outputPath('event-sessions.png'),fullPage:true})
  const addSessionDialog=page.getByRole('dialog',{name:'Buat sesi baru'});await page.getByRole('button',{name:'Buat sesi baru',exact:true}).click();await expect(addSessionDialog).toBeVisible();const addAssessmentSelector=addSessionDialog.getByRole('group',{name:'Pilih assessment'});await expect(addAssessmentSelector).toBeVisible();await expect(addAssessmentSelector.getByRole('combobox',{name:'Program'})).toBeVisible();await expect(addAssessmentSelector.getByText('Siap digunakan').first()).toBeVisible();await page.screenshot({path:testInfo.outputPath('event-add-session.png'),fullPage:true});await addSessionDialog.getByRole('button',{name:'Tutup modal'}).click();await expect(addSessionDialog).not.toBeVisible()
  const editSessionDialog=page.getByRole('dialog',{name:`Ubah sesi: ${name} Event`});await page.getByRole('button',{name:'Ubah sesi',exact:true}).first().click();await expect(editSessionDialog).toBeVisible()
  const sessionForm=editSessionDialog.locator('form');await expect(sessionForm).toHaveCount(1);await sessionForm.locator('input[name=name]').fill(`${name} Session Updated`);await sessionForm.locator('input[name=capacity]').fill('21');await expect(sessionForm.locator('input[name=name]')).toHaveValue(`${name} Session Updated`);await expect(sessionForm.locator('input[name=capacity]')).toHaveValue('21');await sessionForm.getByRole('button',{name:'Simpan perubahan sesi',exact:true}).click();await expect(page.getByText('Sesi event tersimpan. Pantau peserta dari event ini.')).toBeVisible();const {data:updatedSession,error:updateError}=await db.from('event_sessions').select('name,capacity').eq('id',sessions![0].id).single();if(updateError)throw updateError;expect(updatedSession).toMatchObject({name:`${name} Session Updated`,capacity:21});await page.reload();await expect(page.getByRole('button',{name:'Ubah sesi',exact:true}).first()).toBeVisible();await expect(page.getByText('Maksimal 21 peserta',{exact:true})).toBeVisible()
  await page.getByRole('link',{name:'Informasi event',exact:true}).click();await expect(page.getByRole('combobox',{name:'Status event',exact:true})).toBeVisible();await expect(page.getByText('Status mengatur tampilan event; jadwal menentukan waktunya.')).toBeVisible()
  await page.getByRole('link',{name:'Ringkasan',exact:true}).click();await expect(page.locator('main h1')).toHaveText(`${name} Event`)
  await page.getByRole('navigation',{name:'Bagian workspace'}).getByRole('link',{name:'Monitoring',exact:true}).click();await expect(page).toHaveURL(new RegExp(`/admin/events/${eventId}/monitoring(?:\\?|$)`));expect(adminUrlState(page.url()).get('event')).toBe(eventId)
  await expect(page.locator('main h1')).toHaveText(`${name} Event`);await expect(page.getByRole('heading',{name:'Monitoring event',exact:true})).toBeVisible();await page.screenshot({path:testInfo.outputPath('event-monitoring.png'),fullPage:true})
  await page.getByRole('navigation',{name:'Bagian monitoring event'}).getByRole('link',{name:'Laporan',exact:true}).click();await expect(page).toHaveURL(new RegExp(`/admin/events/${eventId}/monitoring/reports(?:\\?|$)`));await expect(page.getByRole('heading',{name:'Distribusi nilai',exact:true})).toBeVisible()
  await page.getByRole('navigation',{name:'Bagian monitoring event'}).getByRole('link',{name:'Ringkasan',exact:true}).click();await expect(page).toHaveURL(new RegExp(`/admin/events/${eventId}/monitoring(?:\\?|$)`))
  const registration=await db.from('event_registrations').insert({event_id:eventId,session_id:sessions![0].id,user_id:userId,status:'registered',registration_number:`P1-${suffix}`});if(registration.error)throw registration.error
  const eventAttempt=await db.from('exam_attempts').insert({exam_id:assessmentId,user_id:userId,attempt_number:1,status:'completed',source:'b2c',started_at:new Date(Date.now()-60000).toISOString(),submitted_at:new Date().toISOString(),duration_used_seconds:60,total_score:15,metadata:{eventId,eventSessionId:sessions![0].id}}).select('id').single();if(eventAttempt.error)throw eventAttempt.error;attemptIds.push(eventAttempt.data.id)
  const profile=await db.from('profiles').select('full_name').eq('id',userId).single();if(profile.error)throw profile.error
  await page.goto(`/admin/events/${eventId}/participants?${new URLSearchParams({program:'CPNS',track:'SKD',participant_status:'completed',participant_search:profile.data.full_name,participant_page:'1'})}`)
  const eventReturn=page.url();await expect(page.locator('tr[data-participant-id]')).toHaveCount(1);await page.getByRole('link',{name:'Lihat Hasil',exact:true}).click();await expect(page).toHaveURL(new RegExp(`/admin/monitoring/results/${eventAttempt.data.id}`));await expect(page.getByRole('navigation',{name:'Breadcrumb'})).toContainText(`${name} Event`)
  await page.reload();await page.getByRole('link',{name:'← Kembali ke Monitoring',exact:true}).click();await expect.poll(()=>urlState(page.url())).toBe(urlState(eventReturn))
  await page.getByRole('link',{name:'Lihat Hasil',exact:true}).click();await expect(page).toHaveURL(/\/admin\/monitoring\/results\//);await page.goBack();await expect.poll(()=>urlState(page.url())).toBe(urlState(eventReturn))
  const activeStart=new Date(Date.now()-5*60_000).toISOString(),activeEnd=new Date(Date.now()+30*60_000).toISOString()
  const activate=await db.from('events').update({status:'live',starts_at:activeStart,ends_at:activeEnd}).eq('id',eventId);if(activate.error)throw activate.error
  const activateSession=await db.from('event_sessions').update({starts_at:activeStart,ends_at:activeEnd}).eq('event_id',eventId);if(activateSession.error)throw activateSession.error
  await page.goto(`/admin/events/${eventId}`);await page.getByRole('link',{name:'Pantau event',exact:true}).click();await expect(page).toHaveURL(new RegExp(`/admin/events/${eventId}/monitoring(?:\\?|$)`))
  const endedStart=new Date(Date.now()-2*60*60_000).toISOString(),endedAt=new Date(Date.now()-60*60_000).toISOString()
  const endEvent=await db.from('events').update({status:'closed',starts_at:endedStart,ends_at:endedAt}).eq('id',eventId);if(endEvent.error)throw endEvent.error
  const endSession=await db.from('event_sessions').update({starts_at:endedStart,ends_at:endedAt}).eq('event_id',eventId);if(endSession.error)throw endSession.error
  await page.goto(`/admin/events/${eventId}`);await page.getByRole('link',{name:'Lihat laporan',exact:true}).click();await expect(page).toHaveURL(new RegExp(`/admin/events/${eventId}/monitoring/reports(?:\\?|$)`))
  for(const viewport of [{width:390,height:844},{width:1024,height:768}]){
   await page.setViewportSize(viewport)
   for(const route of [`/admin/events/${eventId}`,`/admin/events/${eventId}/settings`,`/admin/events/${eventId}/settings?settings_section=sessions`,`/admin/events/${eventId}/participants`,`/admin/events/${eventId}/monitoring`,`/admin/events/${eventId}/monitoring/reports`]){
    await page.goto(route);await expect(page.locator('main h1')).toHaveText(`${name} Event`)
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);expect(overflow,`document overflow at ${viewport.width}px on ${route}`).toBeLessThanOrEqual(1)
   }
  }
  // Assessment entry carries the same assessment to an instansi, then the new batch.
  await page.goto(`/admin/assessments?program=CPNS&track=SKD&assessment=${assessmentId}&tab=distribution`)
  await page.getByRole('link',{name:'Tugaskan ke Instansi',exact:true}).click();await expect(page).toHaveURL(/\/admin\/organizations\?/);expect(new URL(page.url()).searchParams.get('exam')).toBe(assessmentId)
  await page.getByRole('link',{name:'Instansi baru',exact:true}).click();await page.getByPlaceholder('Dinas Pendidikan Kota Medan').fill(`${name} Instansi`);await page.getByPlaceholder('DINAS-MEDAN').fill(`E2E-P1-${suffix}`);await page.getByRole('button',{name:'Buat instansi',exact:true}).click()
  await expect(page.locator('main h1')).toHaveText(`${name} Instansi`);orgId=adminUrlState(page.url()).get('org')!;expect(orgId).toBeTruthy()
  await page.getByRole('link',{name:'Batch baru',exact:true}).click();await page.getByPlaceholder('CPNS 2026 Batch A').fill(`${name} Batch`);await page.getByPlaceholder('CPNS-2026-A').fill(`P1-${suffix}`);await page.getByLabel('Status batch').selectOption('active');await page.getByRole('button',{name:'Buat batch',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Assessment untuk batch ini',exact:true})).toBeVisible();batchId=adminUrlState(page.url()).get('batch')!;expect(batchId).toBeTruthy();expect(adminUrlState(page.url()).get('org')).toBe(orgId)
  await expect(page.locator('input[name="exam_id"]')).toHaveValue(assessmentId);await page.reload();await expect(page.locator('input[name="exam_id"]')).toHaveValue(assessmentId)
  const assignmentStart=page.locator('input[name="starts_at"]');const assignmentEnd=page.locator('input[name="due_at"]')
  await assignmentStart.fill('2026-10-08T10:00');await assignmentEnd.fill('2026-10-08T09:00')
  for(const field of [assignmentStart,assignmentEnd]){await expect(field).toHaveAttribute('aria-invalid','true');await expect(field).toHaveAttribute('aria-describedby','assignment-error')}
  await expect(page.getByRole('button',{name:'Review Penugasan',exact:true})).toBeDisabled();await assignmentStart.fill('');await assignmentEnd.fill('')
  await page.getByRole('button',{name:'Review Penugasan',exact:true}).click();await page.getByRole('button',{name:'Jadwalkan assessment',exact:true}).click();await expect(page.locator('[data-assignment-id]')).toHaveCount(1)
  const assignmentId=await page.locator('[data-assignment-id]').getAttribute('data-assignment-id');expect(assignmentId).toBeTruthy()
  const assignment=await db.from('organization_exam_assignments').select('organization_id,batch_id,exam_id').eq('id',assignmentId!).single();if(assignment.error)throw assignment.error;expect(assignment.data).toMatchObject({organization_id:orgId,batch_id:batchId,exam_id:assessmentId})
  await page.getByRole('link',{name:'Lihat Monitoring',exact:true}).click();await expect(page).toHaveURL(/\/monitoring(?:\?|$)/);const monitor=new URL(page.url());expect(adminUrlState(page.url()).get('org')).toBe(orgId);expect(adminUrlState(page.url()).get('batch')).toBe(batchId);expect(adminUrlState(page.url()).get('assignment')).toBe(assignmentId)
  const participant=await db.from('organization_participants').insert({organization_id:orgId,batch_id:batchId,user_id:userId,participant_code:`P1-${suffix}`,full_name_snapshot:`${name} Peserta`,status:'active'}).select('id').single();if(participant.error)throw participant.error
  const attempt=await db.from('exam_attempts').insert({exam_id:assessmentId,user_id:userId,attempt_number:2,status:'completed',source:'organization',organization_id:orgId,batch_id:batchId,assignment_id:assignmentId,participant_id:participant.data.id,started_at:new Date(Date.now()-120000).toISOString(),submitted_at:new Date().toISOString(),duration_used_seconds:120,total_score:20,metadata:{assignmentId}}).select('id').single();if(attempt.error)throw attempt.error;attemptIds.push(attempt.data.id)
  await page.goto(`/admin/organizations?org=${orgId}&batch=${batchId}&tab=overview`);await expect(page.getByRole('heading',{name:'Ringkasan Instansi',exact:true}).locator('..')).toContainText('1 peserta')
  monitor.searchParams.set('q',`${name} Peserta`);monitor.searchParams.set('status','completed');monitor.searchParams.set('page','1');await page.goto(`${monitor.pathname}${monitor.search}`)
  const returnUrl=page.url();await expect(page.locator('tr[data-participant-id]')).toHaveCount(1);await page.getByRole('link',{name:'Lihat Hasil',exact:true}).click()
  await expect(page.locator('main h1')).toContainText(`${name} Peserta`);await expect(page.getByRole('navigation',{name:'Breadcrumb'})).toContainText(`${name} Batch`);await page.screenshot({path:testInfo.outputPath('organization-result.png'),fullPage:true});await page.reload();await page.getByRole('link',{name:'← Kembali ke Monitoring',exact:true}).click();await expect(page).toHaveURL(returnUrl)
  await page.getByRole('link',{name:'Lihat Hasil',exact:true}).click();await expect(page).toHaveURL(/\/admin\/monitoring\/results\//);await page.goBack();await expect(page).toHaveURL(returnUrl)
 } finally {
  if(attemptIds.length)await db.from('exam_attempts').delete().in('id',attemptIds)
  if(eventId){await db.from('event_registrations').delete().eq('event_id',eventId);await db.from('event_sessions').delete().eq('event_id',eventId);await db.from('events').delete().eq('id',eventId)}
  if(orgId){await db.from('organization_participants').delete().eq('organization_id',orgId);await db.from('organization_exam_assignments').delete().eq('organization_id',orgId);await db.from('organization_batches').delete().eq('organization_id',orgId);const result=await db.from('organizations').delete().eq('id',orgId);if(result.error)throw result.error}
 }
})

test('Draft assessment publishes into Event without choosing it again',async({page})=>{
 test.setTimeout(120000)
 if(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0]!=='lpgrivowdcepcxradavu')throw new Error('Staging only')
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}})
 let assessmentId='',eventId=''
 const suffix=randomUUID().slice(0,8).toUpperCase()
 try {
  const {data:base,error}=await db.from('exams').select('program_id,track_id,exam_type_id,duration_seconds,attempt_limit,question_order,result_visibility,access_type').eq('slug','qa-cpns-mini-tiu').single();if(error)throw error
  const {data:exam,error:examError}=await db.from('exams').insert({...base,created_by:JSON.parse(readFileSync('playwright/.auth/admin-user-meta.json','utf8')).userId,title:`E2E P1 Publish ${suffix}`,slug:`e2e-p1-pub-${suffix.toLowerCase()}`,status:'draft'}).select('id').single();if(examError)throw examError;assessmentId=exam.id
  const {data:subject,error:subjectError}=await db.from('subjects').select('id').eq('track_id',base.track_id).eq('code','TIU').single();if(subjectError)throw subjectError
  const section=await db.from('exam_sections').insert({exam_id:assessmentId,subject_id:subject.id,title:'TIU',sort_order:1,question_count:3,duration_seconds:base.duration_seconds});if(section.error)throw section.error
  await page.goto(`/admin/assessments?program=CPNS&track=SKD&assessment=${assessmentId}`)
  await expect(page.getByRole('button',{name:'Publish Assessment',exact:true})).toBeEnabled()
  await Promise.all([
   page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === `/admin/assessments/${assessmentId}`),
   page.getByRole('button',{name:'Publish Assessment',exact:true}).click(),
  ])
  await expect(page).toHaveURL(/\/distribution(?:\?|$)/)
  await expect(page.getByRole('link',{name:'Buat Event',exact:true})).toHaveAttribute('data-assessment-id',assessmentId)
  const {data:published}=await db.from('exams').select('status').eq('id',assessmentId).single();expect(published?.status).toBe('active')
  eventId=await createWorkflowEvent(page,`E2E P1 Publish Event ${suffix}`,`E2E-P1-PUB-${suffix}`,assessmentId,'CPNS','SKD',wib)
  const {data:session}=await db.from('event_sessions').select('exam_id').eq('event_id',eventId).single();expect(session?.exam_id).toBe(assessmentId)
  await page.getByRole('navigation',{name:'Bagian workspace'}).getByRole('link',{name:'Monitoring',exact:true}).click();await expect(page).toHaveURL(new RegExp(`/admin/events/${eventId}/monitoring(?:\\?|$)`));await expect(page.getByRole('heading',{name:'Monitoring event',exact:true})).toBeVisible()
 } finally {
  if(eventId){await db.from('event_sessions').delete().eq('event_id',eventId);await db.from('events').delete().eq('id',eventId)}
  if(assessmentId){await db.from('exam_sections').delete().eq('exam_id',assessmentId);await db.from('exams').delete().eq('id',assessmentId)}
 }
})

test('CPNS token activation explains Full-only requirements and server rejects a forged active status',async({page})=>{
 test.setTimeout(90000)
 if(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0]!=='lpgrivowdcepcxradavu')throw new Error('Staging only')
 await page.goto('/admin/commerce/products?program=CPNS&track=SKD')
 await page.getByRole('link',{name:'Tambah produk',exact:true}).click()
 const dialog=page.locator('form[data-admin-form]')
 await dialog.locator('[name="product_type"]').selectOption('TOKEN_PACK')
 const readiness=dialog.getByRole('region',{name:'Content Readiness'})
 await expect(readiness).toContainText('Full Tryout');await expect(readiness).not.toContainText('Mini Tryout');await expect(readiness).not.toContainText('Cakupan Drill')
 await expect(dialog.getByRole('button',{name:'Aktifkan Produk',exact:true})).toBeDisabled()
 const code=`E2E_P1_HOLD_${randomUUID().slice(0,8).toUpperCase()}`
 await dialog.locator('[name="code"]').fill(code);await dialog.locator('[name="name"]').fill('E2E P1 Guard');await dialog.locator('[name="price"]').fill('1000');await dialog.locator('[name="token_grant"]').fill('1');await dialog.locator('[name="duration_days"]').fill('7')
 await dialog.locator('[name="status"]').evaluate(element=>{const select=element as HTMLSelectElement;select.querySelector<HTMLOptionElement>('option[value="ACTIVE"]')!.disabled=false;select.value='ACTIVE'})
 await dialog.getByRole('button',{name:'Simpan produk',exact:true}).click()
 await expect(page.getByRole('alert').filter({hasText:'Produk belum dapat diaktifkan.'})).toContainText('Produk belum dapat diaktifkan.',{timeout:30000})
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}})
 const {count,error}=await db.from('products').select('id',{count:'exact',head:true}).eq('code',code);if(error)throw error;expect(count).toBe(0)
})

test('Question and Product detail preserve search, filters and browser Back',async({page})=>{
 test.setTimeout(120000)
 await page.goto('/admin/content/questions?program=CPNS&track=SKD&status=published&subject=TIU&page=1')
 const question=page.getByRole('link',{name:/^Ubah soal /}).first();await expect(question).toBeVisible()
 const id=adminUrlState((await question.getAttribute('href'))!).get('edit');expect(id).toBeTruthy()
 await question.click();await expect(page).toHaveURL(new RegExp(`/content/questions/${id}/edit(?:\\?|$)`));await page.reload();await expect(page).toHaveURL(new RegExp(`/content/questions/${id}/edit(?:\\?|$)`));await expect(page.locator('html')).toHaveAttribute('data-interaction-guard','ready')
 await page.goBack();await expect(page).not.toHaveURL(/\/edit(?:\?|$)/)
 const returned=new URL(page.url());expect(returned.searchParams.get('subject')).toBe('TIU');expect(returned.searchParams.get('status')).toBe('published');expect(returned.searchParams.get('page')).toBe('1')
 await expect(page.locator('main h1')).toHaveText('Question Bank')
 const reviewLink=page.locator(`tr[data-question-id="${id}"]`).getByRole('link',{name:/^Buka review soal /})
 await reviewLink.click();await expect(page).toHaveURL(new RegExp(`/content/review/${id}(?:\\?|$)`));await page.reload();await page.getByRole('link',{name:'Kembali ke Question Bank',exact:true}).click();await expect(page).toHaveURL(/\/admin\/content\/questions\?/);expect(new URL(page.url()).searchParams.get('subject')).toBe('TIU');expect(new URL(page.url()).searchParams.get('status')).toBe('published')

 await page.goto('/admin/commerce/products?program=CPNS&track=SKD&status=ACTIVE&page=1')
 const product=page.getByRole('link',{name:/^Lihat Produk /}).first();await expect(product).toBeVisible();const productHref=(await product.getAttribute('href'))!
 await product.click();await expect(page).toHaveURL(new RegExp(`/products/${adminUrlState(productHref).get('edit')}/edit(?:\\?|$)`));await page.goBack();await expect(page).not.toHaveURL(/\/edit(?:\?|$)/)
 expect(new URL(page.url()).searchParams.get('status')).toBe('ACTIVE');expect(new URL(page.url()).searchParams.get('page')).toBe('1')
 await page.goto('/admin/content/questions?program=CPNS&track=SKD&status=published')
 await page.getByText('Filter lainnya',{exact:true}).click()
 const material=page.getByRole('combobox',{name:'Filter materi',exact:true});const materialId=await material.locator('option').nth(1).getAttribute('value');expect(materialId).toBeTruthy()
 await material.selectOption(materialId!);await page.getByRole('button',{name:'Terapkan',exact:true}).click();await expect(page).toHaveURL(new RegExp(`material=${materialId}`));await expect(page.locator('main h1')).toHaveText('Question Bank');await expect(page.locator('main table')).toHaveCount(1);await expect(page.getByText('Gagal memuat data.',{exact:true})).toHaveCount(0)

})

test('mobile sidebar traps focus and restores its trigger on Escape',async({page},testInfo)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/admin/assessments?program=CPNS&track=SKD')
 const trigger=page.getByRole('button',{name:'Buka menu',exact:true});await trigger.focus();await page.keyboard.press('Enter')
 const dialog=page.getByRole('dialog',{name:'Menu admin',exact:true});await expect(dialog).toBeVisible();await page.screenshot({path:testInfo.outputPath('mobile-sidebar.png'),fullPage:true})
 await expect.poll(()=>dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true)
 await page.keyboard.press('Shift+Tab');await expect.poll(()=>dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true)
 await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(trigger).toBeFocused()
 await expect(page.getByRole('link',{name:'Buat Assessment',exact:true}).first()).toBeVisible()
})

test('Order → Payment detail → User Entitlements preserves Orders filters and Back',async({page})=>{
 test.setTimeout(90000)
 if(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0]!=='lpgrivowdcepcxradavu')throw new Error('Staging only')
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}})
 const {userId}=JSON.parse(readFileSync('playwright/.auth/admin-user-meta.json','utf8')) as {userId:string}
 const number=`E2E-INNER-${randomUUID().slice(0,8).toUpperCase()}`
 let orderId=''
 try {
  const {data:order,error}=await db.from('orders').insert({order_number:number,user_id:userId,status:'pending',subtotal:15000,discount_amount:0,total_amount:15000,currency:'IDR'}).select('id').single();if(error)throw error;orderId=order.id
  const {data:product,error:productError}=await db.from('products').select('id,name').eq('status','ACTIVE').limit(1).single();if(productError)throw productError
  const item=await db.from('order_items').insert({order_id:orderId,product_id:product.id,quantity:1,unit_price:15000,total:15000,discount:0});if(item.error)throw item.error
  const payment=await db.from('payments').insert({order_id:orderId,provider:'midtrans',amount:15000,status:'pending',payment_method:'bank_transfer'});if(payment.error)throw payment.error
  const list=`/admin/commerce/orders?${new URLSearchParams({q:number,status:'pending',payment:'pending',page:'1'})}`
  await page.goto(list);await expect(page.getByRole('row').filter({hasText:number})).toContainText(product.name)
  await page.getByRole('row').filter({hasText:number}).getByRole('link',{name:'Lihat Order',exact:true}).click()
  await expect(page.locator('main h1')).toHaveText(`Order ${number}`)
  await expect(page.getByRole('region',{name:'Pembayaran order'})).toContainText('midtrans')
  await expect(page.getByRole('region',{name:'Pembayaran order'})).toContainText('bank_transfer')
  await expect(page.getByRole('heading',{name:'Granted Access',exact:true})).toBeVisible()
  await page.getByRole('link',{name:'Kembali ke Orders',exact:true}).click();await expect(page).toHaveURL(new URL(list,process.env.BASE_URL).toString())
  await page.getByRole('row').filter({hasText:number}).getByRole('link',{name:'Lihat Order',exact:true}).click()
  await page.getByText('Customer',{exact:true}).locator('..').getByRole('link').click()
  await page.getByRole('navigation',{name:'User detail views'}).getByRole('link',{name:'Entitlements',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Entitlements',exact:true})).toBeVisible()
 } finally {
  if(orderId){await db.from('payments').delete().eq('order_id',orderId);await db.from('order_items').delete().eq('order_id',orderId);const r=await db.from('orders').delete().eq('id',orderId);if(r.error)throw r.error}
 }
})


test('Instansi form saves selected status independently from the list filter',async({page})=>{
 test.setTimeout(90000)
 if(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0]!=='lpgrivowdcepcxradavu')throw new Error('Staging only')
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}})
 const suffix=randomUUID().slice(0,8).toUpperCase(),name=`E2E Inner Status ${suffix}`,code=`E2E-STATUS-${suffix}`
 try {
  await page.goto('/admin/organizations?status=active&tab=overview&new=1')
  await page.getByPlaceholder('Dinas Pendidikan Kota Medan').fill(name);await page.getByPlaceholder('DINAS-MEDAN').fill(code)
  await page.getByRole('combobox',{name:'Status instansi',exact:true}).selectOption('inactive')
  await page.getByRole('button',{name:'Buat instansi',exact:true}).click()
  await expect(page.locator('main h1')).toHaveText(name)
  const {data,error}=await db.from('organizations').select('status').eq('code',code).single();if(error)throw error
  expect(data.status).toBe('inactive');expect(new URL(page.url()).searchParams.get('status')).toBe('active')
 } finally {const {error}=await db.from('organizations').delete().eq('code',code);if(error)throw error}
})


test('Review opens as a task queue and restores queue filters from detail',async({page})=>{
 const list='/admin/content/review?program=CPNS&track=SKD&view=needs_review&page=1'
 await page.goto(list)
 for(const name of ['Needs Review','Blocked','Approved','Rejected'])await expect(page.getByRole('link',{name,exact:true})).toBeVisible()
 const queue=page.getByRole('region',{name:'Antrean Review',exact:true})
 await expect(queue).toBeVisible();await expect(queue.getByRole('row').first()).toContainText('Issue / Next Action')
 await queue.getByRole('link',{name:'Buka Review',exact:true}).first().click()
 await expect(page).toHaveURL(/\/content\/review\/[^/?]+(?:\?|$)/);await expect(page.getByRole('heading',{name:'Periksa isi soal',exact:true})).toBeVisible()
 await page.getByRole('link',{name:'Kembali ke antrean',exact:true}).click()
 await expect(page).toHaveURL(new URL(list,process.env.BASE_URL).toString());await expect(queue).toBeVisible()
 await page.getByRole('link',{name:'Approved',exact:true}).click();await expect(page).toHaveURL(/view=approved/)
 await expect(page.getByRole('link',{name:'Approved',exact:true})).toHaveAttribute('aria-current','page')
})


test('admin signout confirmation restores keyboard focus on desktop and mobile',async({page})=>{
 await page.goto('/admin')
 const trigger=page.getByRole('button',{name:'Keluar',exact:true});await trigger.focus();await page.keyboard.press('Enter')
 const dialog=page.getByRole('alertdialog',{name:'Keluar dari admin?',exact:true})
 await expect(dialog).toBeVisible();await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(trigger).toBeFocused()
 await page.setViewportSize({width:390,height:844});const menu=page.getByRole('button',{name:'Buka menu',exact:true})
 await menu.click();await page.getByRole('dialog',{name:'Menu admin',exact:true}).getByRole('button',{name:'Keluar',exact:true}).click()
 await expect(dialog).toBeVisible();await expect(page.getByRole('dialog',{name:'Menu admin',exact:true})).not.toBeVisible()
 await expect.poll(()=>dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true)
 await dialog.getByRole('button',{name:'Batal',exact:true}).click();await expect(dialog).not.toBeVisible();await expect(menu).toBeFocused()
})
