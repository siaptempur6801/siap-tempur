#!/usr/bin/env node
/** Reproducible Question Bank regression gate. Only localhost + verified staging.
 * Start the built app first: npm run start -- --hostname 127.0.0.1 --port 3105
 * Run: npm run test:question-bank
 * Fixtures belong only to this run and are removed in finally; screenshots go to OS temp.
 * Browser plugin unavailable in the development session: repo Playwright is used.
 */
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url)
require('@next/env').loadEnvConfig(process.cwd())
const {createClient}=require('@supabase/supabase-js')
const {chromium,expect}=require('@playwright/test')
const url=process.env.NEXT_PUBLIC_SUPABASE_URL
if(!url || new URL(url).hostname!=='lpgrivowdcepcxradavu.supabase.co') throw Error('Question Bank gate requires verified staging')
const base=process.env.QB_BASE_URL || 'http://127.0.0.1:3105'
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw Error('Question Bank gate requires a local app connected to staging')
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const admin=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})
const check=({data,error})=>{if(error)throw Error(error.message);return data}
const fixtures={users:[],questions:[]}
const browsers=[]
async function launchBrowser(){ const browser=await chromium.launch();browsers.push(browser);return browser }
const evidenceDir=fs.mkdtempSync(path.join(os.tmpdir(),'question-bank-qa-'))
async function databaseTests() {


 for(const roleCode of ['ADMIN','FINANCE']) {
  const email=`qb-qa-${crypto.randomUUID()}@example.invalid`,password=`QbQA!${crypto.randomUUID()}`;
  const {user}=check(await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:'Question Bank QA'}}));
  fixtures.users.push({id:user.id,email,password,role:roleCode});
  check(await admin.from('profiles').update({status:'active'}).eq('id',user.id));
  const role=check(await admin.from('roles').select('id').eq('code',roleCode).single());
  check(await admin.from('user_roles').insert({user_id:user.id,role_id:role.id}));
 }
 const client=createClient(url,key,{auth:{persistSession:false}});const fin=createClient(url,key,{auth:{persistSession:false}});
 check(await client.auth.signInWithPassword(fixtures.users[0])); check(await fin.auth.signInWithPassword(fixtures.users[1]));
 const payload={operation:'save',id:null,program:'CPNS',track:'SKD',subject:'TIU',questionType:'single_choice',stem:'QA |x|\n$\\frac{1}{2}$',difficulty:'medium',explanation:'Penjelasan |x|\nbaris kedua',sourceReference:'Question Bank QA',cognitiveLevel:'reasoning',estimatedSeconds:60,stimulusId:null,knowledgeNodeId:null,changeReason:'QA initial',expectedVersion:0,expectedUpdatedAt:'',options:[{key:'A',content:'|x|\nA',isCorrect:true,score:5},{key:'B',content:'B',isCorrect:false,score:0}]};
 const saved=check(await client.rpc('mutate_question_bank',{p_payload:payload}));fixtures.questions.push(saved.id);
 const load=()=>client.rpc('get_question_bank_editor',{p_program:'CPNS',p_track:'SKD',p_id:saved.id}).then(check);
 const editor=await load();assert.equal(editor.options[0].content,payload.options[0].content);assert.equal(editor.explanation,payload.explanation);console.log('PASS lossless save/read and authenticated RPC');
 const denied=await fin.rpc('mutate_question_bank',{p_payload:payload});assert.match(denied.error.message,/QUESTION_ACCESS_DENIED/);
 assert.ok((await fin.rpc('get_question_bank_editor',{p_program:'CPNS',p_track:'SKD',p_id:saved.id})).error);console.log('PASS FINANCE read/write denied');
 const anon=createClient(url,key,{auth:{persistSession:false}});assert.ok((await anon.rpc('get_question_bank_editor',{p_program:'CPNS',p_track:'SKD',p_id:saved.id})).error);console.log('PASS anonymous denied');
 const current={...payload,id:saved.id,expectedVersion:editor.question.version,expectedUpdatedAt:editor.question.updated_at};
 const conflicts=await Promise.all([client.rpc('mutate_question_bank',{p_payload:{...current,stem:'Concurrent winner 1'}}),client.rpc('mutate_question_bank',{p_payload:{...current,stem:'Concurrent winner 2'}})]);
 assert.equal(conflicts.filter(r=>!r.error).length,1);assert.match(conflicts.find(r=>r.error).error.message,/QUESTION_VERSION_CONFLICT/);console.log('PASS concurrent update: exactly one succeeds');
 const updated=await load();assert.equal(updated.options[0].id,editor.options[0].id);assert.equal(updated.question.version,2);assert.ok(updated.versions.length);console.log('PASS option IDs and version history preserved');
 const change={...current,expectedVersion:updated.question.version,expectedUpdatedAt:updated.question.updated_at};
 assert.ok((await client.rpc('mutate_question_bank',{p_payload:{...change,program:'TKA',track:'SMP'}})).error);console.log('PASS cross-context mutation rejected');
 assert.ok((await client.rpc('mutate_question_bank',{p_payload:{...change,operation:'publish'}})).error);console.log('PASS unreviewed publication rejected');
 assert.ok((await client.rpc('mutate_question_bank',{p_payload:{...change,options:[]}})).error);
 assert.deepEqual((await load()).question,updated.question);console.log('PASS invalid update does not change data');
 for(const imageUrl of ['HTTPS://example.org/a.png','https://example.org/a b.png']) {
   const rejected=await client.rpc('mutate_question_bank',{p_payload:{...payload,options:[{...payload.options[0],imageUrl},payload.options[1]]}});
   assert.ok(rejected.error,`image URL harus ditolak SQL: ${imageUrl}`);
 }
 console.log('PASS image URL contract matches SQL');
 const archived=check(await client.rpc('mutate_question_bank',{p_payload:{...change,operation:'archive'}}));assert.equal(archived.status,'archived');
 const revised=check(await client.rpc('mutate_question_bank',{p_payload:{...change,operation:'revise',expectedVersion:archived.version,expectedUpdatedAt:archived.updated_at}}));assert.equal(revised.status,'draft');console.log('PASS archive and restore draft');
 const audits=check(await admin.from('audit_logs').select('action').eq('entity_id',saved.id));assert.ok(audits.some(a=>a.action==='CREATE_QUESTION'));assert.ok(audits.some(a=>a.action==='UPDATE_QUESTION'));assert.ok(audits.some(a=>a.action==='ARCHIVE_QUESTION'));console.log('PASS transaction audit trail');

 for (const trackCode of ['SD','SMP','SMA']) {
   const program=check(await admin.from('programs').select('id').eq('code','TKA').single());
   const track=check(await admin.from('tracks').select('id').eq('program_id',program.id).eq('code',trackCode).single());
   const subject=check(await admin.from('subjects').select('code').eq('track_id',track.id).limit(1).single());
   const multiple=[...payload.options,{key:'C',content:'C',isCorrect:true,score:1}];
   const item=check(await client.rpc('mutate_question_bank',{p_payload:{...payload,program:'TKA',track:trackCode,subject:subject.code,questionType:'multiple_choice',options:multiple}}));
   fixtures.questions.push(item.id);
   const invalid=await client.rpc('mutate_question_bank',{p_payload:{...payload,program:'TKA',track:trackCode,subject:subject.code,questionType:'multiple_choice'}});
   assert.ok(invalid.error);
 }
 const category=[...payload.options.map(o=>({...o,responseGroup:'G1'})),...payload.options.map(o=>({...o,key:o.key+'2',responseGroup:'G2'}))];
 const categoryQuestion=check(await client.rpc('mutate_question_bank',{p_payload:{...payload,questionType:'category',options:category}}));fixtures.questions.push(categoryQuestion.id);
 assert.ok((await client.rpc('mutate_question_bank',{p_payload:{...payload,questionType:'category'}})).error);
 console.log('PASS TKA SD/SMP/SMA, multiple choice and category contracts');
 // Fixture placeholder riwayat: staging tidak punya baris seperti ini (produksi
 // punya 2 dari cutover), jadi dibuat untuk run ini agar jalur "ditandai dan
 // tidak dapat diedit" benar-benar diuji, bukan hanya diasumsikan.
 const cpnsProgram=check(await admin.from('programs').select('id').eq('code','CPNS').single());
 const skdTrack=check(await admin.from('tracks').select('id').eq('program_id',cpnsProgram.id).eq('code','SKD').single());
 const skdSubject=check(await admin.from('subjects').select('id').eq('track_id',skdTrack.id).limit(1).single());
 const placeholder=check(await admin.from('questions').insert({
   question_code:`LEGACY-HISTORY-QA-${crypto.randomUUID().slice(0,8).toUpperCase()}`,
   program_id:cpnsProgram.id,track_id:skdTrack.id,subject_id:skdSubject.id,
   question_type:'single_choice',stem:'[Legacy history placeholder] QA fixture',
   difficulty:'medium',status:'draft',version:1,author_id:fixtures.users[0].id,
   source_type:'legacy_history_placeholder',
 }).select('id,question_code').single());
 fixtures.questions.push(placeholder.id);fixtures.placeholder=placeholder;
 fixtures.saved=await load();fixtures.payload=payload;return fixtures;
}
async function browserTests(f) {

 const browser=await launchBrowser();const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error') errors.push(m.text())});
 await page.goto(base+'/login?returnTo=%2Fadmin%2Fcontent%2Fquestions');await page.locator('input[type=email]').fill(f.users[0].email);await page.locator('input[type=password]').fill(f.users[0].password);await page.getByRole('button',{name:'Masuk',exact:true}).click();await page.waitForURL(/\/admin\/content\/questions/);await expect(page).toHaveTitle(/Question Bank/); console.log('PASS login and page identity');
 await page.goto(base+'/admin/content/questions?program=CPNS&track=SKD&subject=UNKNOWN');await expect(page.getByRole('heading',{name:'Question Bank',exact:true})).toBeVisible();await expect(page.getByText('Terjadi kesalahan',{exact:true})).not.toBeVisible();console.log('PASS unknown subject filter stays usable');
 // Placeholder riwayat: ditandai, tanpa tautan Edit, dan modalnya menampilkan
 // penjelasan alih-alih form yang bisa disimpan.
 await page.goto(base+`/admin/content/questions?program=CPNS&track=SKD&q=${f.placeholder.question_code}`);
 await expect(page.getByText('Placeholder riwayat',{exact:true})).toBeVisible();
 await expect(page.getByText('Terkunci',{exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:`Ubah soal ${f.placeholder.question_code}`})).toHaveCount(0);
 await page.goto(base+`/admin/content/questions?program=CPNS&track=SKD&edit=${f.placeholder.id}`);
 const placeholderDialog=page.getByRole('dialog');
 await expect(placeholderDialog.getByText(/placeholder riwayat/i).first()).toBeVisible();
 await expect(placeholderDialog.getByLabel('Pertanyaan',{exact:true})).toHaveCount(0);
 console.log('PASS legacy placeholder ditandai dan tidak dapat diedit');
 await expect(page.locator('main h1')).toHaveText('Question Bank');
 // Deliberately absent from the filtered list, reproducing the previous fallback-answer corruption.
 const edit=base+`/admin/content/questions?program=CPNS&track=SKD&q=does-not-match&page=99&subject=TIU&edit=${f.questions[0]}`;
 await page.goto(edit);let dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await expect(dialog.getByRole('navigation',{name:'Bagian form soal'})).toBeVisible();await expect(dialog.getByLabel('Isi opsi A',{exact:true})).toHaveValue('|x|\nA');console.log('PASS guided editor and edit outside current list preserve original options');
 await dialog.getByLabel('Pertanyaan',{exact:true}).fill('Browser QA |x|\n$\\frac{1}{2}$');await dialog.getByLabel('Alasan perubahan',{exact:true}).fill('Browser regression');
 await dialog.getByLabel('Jawaban benar A',{exact:true}).uncheck();await dialog.getByRole('button',{name:'Simpan draf',exact:true}).click();await expect(dialog.getByRole('alert').filter({hasText:'tepat satu'})).toBeVisible();await expect(dialog.getByLabel('Pertanyaan',{exact:true})).toHaveValue('Browser QA |x|\n$\\frac{1}{2}$');console.log('PASS server validation retains entered text');
 await expect(dialog.getByRole('button',{name:'Simpan draf',exact:true})).toBeEnabled();await dialog.getByLabel('Jawaban benar A',{exact:true}).check();await expect.poll(async()=>JSON.parse(await dialog.locator('input[name=options]').inputValue())[0].isCorrect).toBe(true);await dialog.getByRole('button',{name:'Pratinjau',exact:true}).click();await expect(dialog.getByRole('heading',{name:'Periksa tampilan sebelum disimpan'})).toBeVisible();await expect(dialog.getByText('Memuat pratinjau…',{exact:true})).toHaveCount(0);await page.screenshot({path:path.join(evidenceDir, 'validation-preview.png')});
 const invalidFields=await dialog.locator('form').first().evaluate(form=>Array.from(form.elements).filter(el=>'checkValidity' in el&&!el.checkValidity()).map(el=>el.getAttribute('aria-label')||el.getAttribute('name')||el.tagName));assert.deepEqual(invalidFields,[]);
 await dialog.getByRole('button',{name:'Simpan draf',exact:true}).click();try{await page.waitForURL(u=>!u.searchParams.has('edit')&&u.searchParams.has('ok'),{timeout:10000})}catch(error){throw Error(`Save did not redirect. URL=${page.url()} alerts=${JSON.stringify(await dialog.getByRole('alert').allTextContents())} buttonDisabled=${await dialog.getByRole('button',{name:'Simpan draf',exact:true}).isDisabled()}`,{cause:error})}const url=new URL(page.url());expect(url.searchParams.get('page')).toBe('99');expect(url.searchParams.get('q')).toBe('does-not-match');expect(url.searchParams.get('subject')).toBe('TIU');console.log('PASS save preserves search, subject and page');
 // Both tabs open the same version; the second save must keep its unsaved changes.
 await page.goto(edit);await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('navigation',{name:'Bagian form soal'})).toBeVisible();await page.screenshot({path:path.join(evidenceDir, 'desktop.png')});const other=await context.newPage();await other.goto(edit);await expect(other.getByRole('dialog')).toBeVisible();
 await page.getByLabel('Pertanyaan',{exact:true}).fill('Winner edit');await page.getByLabel('Alasan perubahan',{exact:true}).fill('First tab');await page.getByRole('button',{name:'Simpan draf',exact:true}).click();await page.waitForURL(u=>u.searchParams.has('ok'));
 await other.getByLabel('Pertanyaan',{exact:true}).fill('My unsaved second-tab work');await other.getByLabel('Alasan perubahan',{exact:true}).fill('Second tab');await other.getByRole('button',{name:'Simpan draf',exact:true}).click();await expect(other.getByRole('dialog').getByRole('alert')).toContainText('sudah berubah', { timeout: 30000 });await expect(other.getByLabel('Pertanyaan',{exact:true})).toHaveValue('My unsaved second-tab work');console.log('PASS browser conflict keeps unsaved work');await other.close();
 for(const width of [390,1024]) {await page.setViewportSize({width,height:844});await page.goto(edit);await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('navigation',{name:'Bagian form soal'})).toBeVisible();const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);expect(overflow).toBe(false);const modalOverflow=await page.getByRole('dialog').evaluate(e=>e.scrollWidth>e.clientWidth);expect(modalOverflow).toBe(false);await page.screenshot({path:path.join(evidenceDir, `${width}.png`)});console.log('PASS responsive viewport',width);}
 await page.goto(base+'/admin/content/questions?program=CPNS&track=SKD&edit=invalid');await expect(page.getByRole('alert').filter({hasText:'Soal tidak ditemukan'})).toBeVisible();await expect(page.getByRole('dialog')).not.toBeVisible();console.log('PASS invalid ID cannot silently open replacement form');

 await page.goto(base+'/admin/content/questions?program=CPNS&track=SKD');
 await page.getByRole('button',{name:'Tambah soal',exact:true}).click();
 await page.getByLabel('Pertanyaan',{exact:true}).fill('QA browser-created |x|');
 for(const letter of ['A','B','C','D']) await page.getByLabel('Isi opsi '+letter,{exact:true}).fill(letter+' |x|\nbaris kedua');
 await page.getByLabel('Jawaban benar A',{exact:true}).check();
 await page.getByLabel('Pembahasan',{exact:true}).fill('Pembahasan dibuat lewat browser.');
 await page.getByRole('button',{name:'Tutup modal',exact:true}).click();
 const closeConfirm=page.getByRole('alertdialog');await expect(closeConfirm).toBeVisible();
 await closeConfirm.getByRole('button',{name:'Batal',exact:true}).click();await expect(closeConfirm).toHaveCount(0);
 await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByLabel('Pertanyaan',{exact:true})).toHaveValue('QA browser-created |x|');
 await page.getByRole('button',{name:'Simpan draf',exact:true}).click();await page.waitForURL(u=>u.searchParams.has('ok'));
 const created=check(await admin.from('questions').select('id,status').eq('author_id',f.users[0].id).eq('stem','QA browser-created |x|').single());assert.equal(created.status,'draft');
 console.log('PASS browser creation and unsaved-close protection');
 // Unggah gambar: pertanyaan & opsi (bucket question-images, folder questions/<uid>).
 const pngFixture=path.join(os.tmpdir(), `qb-upload-${Date.now()}.png`);
 fs.writeFileSync(pngFixture, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64'));
 await page.goto(base+'/admin/content/questions?program=CPNS&track=SKD');
 await page.getByRole('button',{name:'Tambah soal',exact:true}).click();
 const uploadDialog=page.getByRole('dialog');
 await uploadDialog.getByLabel('Pertanyaan',{exact:true}).fill('Uji unggah gambar');
 await uploadDialog.locator('input[data-upload-target="stem"]').setInputFiles(pngFixture);
 await expect.poll(async()=>uploadDialog.getByLabel('Pertanyaan',{exact:true}).inputValue(),{timeout:30000}).toContain('[[image:https://');
 await uploadDialog.locator('input[data-upload-target="option-A"]').setInputFiles(pngFixture);
 await expect.poll(async()=>{const rows=JSON.parse(await uploadDialog.locator('input[name=options]').inputValue());return rows[0].imageUrl||''},{timeout:30000}).toMatch(/^https:\/\//);
 console.log('PASS unggah gambar pertanyaan & opsi');
 const authState = await context.storageState();
 console.log('Console errors:',JSON.stringify(errors));expect(errors).toEqual([]);await browser.close(); return authState;
}
async function workflowTests(f,authState) {

 const user={email:`qb-review-${crypto.randomUUID()}@example.invalid`,password:`QbQA!${crypto.randomUUID()}`,role:'CONTENT_REVIEWER'};const created=check(await admin.auth.admin.createUser({email:user.email,password:user.password,email_confirm:true,user_metadata:{full_name:'Question Bank Reviewer QA'}}));user.id=created.user.id;f.users.push(user);check(await admin.from('profiles').update({status:'active'}).eq('id',user.id));const role=check(await admin.from('roles').select('id').eq('code',user.role).single());check(await admin.from('user_roles').insert({user_id:user.id,role_id:role.id}));
 const author=createClient(url,key,{auth:{persistSession:false}});check(await author.auth.signInWithPassword(f.users[0]));const reviewer=createClient(url,key,{auth:{persistSession:false}});check(await reviewer.auth.signInWithPassword(user));const id=f.questions[0];
 check(await author.rpc('submit_question_for_review',{p_question_id:id}));
 for(let i=0;i<3;i++){check(await author.rpc('assign_question_reviewer',{p_question_id:id,p_reviewer_id:user.id}));check(await reviewer.rpc('review_question_stage',{p_question_id:id,p_decision:'approve',p_notes:'QA review stage '+i}));}
 const editor=check(await author.rpc('get_question_bank_editor',{p_program:'CPNS',p_track:'SKD',p_id:id}));assert.equal(editor.question.status,'approved');
 f.saved=editor;console.log('PASS official workflow: submit -> editorial -> academic -> technical QA -> approved');

 const browser=await launchBrowser(); const context=await browser.newContext({storageState:authState}); const page=await context.newPage();
 await page.goto(base+`/admin/content/questions?program=CPNS&track=SKD&edit=${id}`);
 const dialog=page.getByRole('dialog'); await expect(dialog.getByLabel('Pertanyaan',{exact:true})).toBeDisabled();
 await dialog.getByRole('button',{name:'Terbitkan soal',exact:true}).click();await dialog.getByLabel('Alasan tindakan').fill('QA publish approved');
 await dialog.getByRole('button',{name:'Konfirmasi tindakan',exact:true}).click();await page.waitForURL(u=>u.searchParams.has('ok'));
 assert.equal(check(await author.rpc('get_question_bank_editor',{p_program:'CPNS',p_track:'SKD',p_id:id})).question.status,'published');
 console.log('PASS browser publication only after all review stages');
 await page.goto(base+`/admin/content/questions?program=CPNS&track=SKD&edit=${id}`);
 await page.getByRole('button',{name:'Kembalikan ke draf',exact:true}).click();await page.getByLabel('Alasan tindakan').fill('QA new revision');await page.getByRole('button',{name:'Konfirmasi tindakan',exact:true}).click();await page.waitForURL(u=>u.searchParams.has('ok'));
 assert.equal(check(await author.rpc('get_question_bank_editor',{p_program:'CPNS',p_track:'SKD',p_id:id})).question.status,'draft');
 console.log('PASS published content locked; explicit return to draft works'); await browser.close();
}

async function cleanup() {
    const ids=fixtures.users.map(u=>u.id)
    if(!ids.length) return
    const questions=check(await admin.from('questions').select('id').in('author_id',ids)).map(q=>q.id)
    if(questions.length) {
        check(await admin.from('content_reviews').delete().eq('entity_type','question').in('entity_id',questions))
        check(await admin.from('audit_logs').delete().eq('entity_type','question').in('entity_id',questions))
        check(await admin.from('questions').delete().in('id',questions))
    }
    for(const id of ids) {
        const {data: uploaded}=await admin.storage.from('question-images').list(`questions/${id}`)
        if(uploaded?.length) await admin.storage.from('question-images').remove(uploaded.map(f=>`questions/${id}/${f.name}`))
        const wallets=check(await admin.from('wallets').select('id').eq('user_id',id)).map(w=>w.id)
        if(wallets.length) check(await admin.from('wallet_transactions').delete().in('wallet_id',wallets))
        for(const [table,column] of [['audit_logs','actor_user_id'],['user_roles','user_id'],['user_tracks','user_id'],['wallets','user_id']]) check(await admin.from(table).delete().eq(column,id))
        check(await admin.from('profiles').delete().eq('id',id))
        check(await admin.auth.admin.deleteUser(id))
    }
    console.log('PASS all disposable fixtures removed')
}
try {
    const f=await databaseTests()
    const state=await browserTests(f)
    await workflowTests(f,state)
    console.log(`Question Bank gate passed. Screenshots: ${evidenceDir}`)
} catch(error) { console.error('GATE FAILURE:', error); throw error } finally { await cleanup(); for(const browser of browsers) await browser.close() }
