import {beforeEach, describe, expect, it, vi} from 'vitest'
vi.mock('server-only',()=>({}))
const m=vi.hoisted(()=>({actor:vi.fn(),catalog:vi.fn(),client:vi.fn(),from:vi.fn(),counts:vi.fn(),queue:vi.fn(),error:null as Error|null}))
vi.mock('@/lib/utils/supabase/server',()=>({createAdminClient:m.client}))
vi.mock('@/src/services/authorization.service',()=>({authorizationService:{requirePermission:m.actor}}))
vi.mock('@/src/services/catalog-context.service',()=>({catalogContextService:{resolve:m.catalog}}))
vi.mock('@/src/services/content-review.service',()=>({contentReviewService:{getReviewCounts:m.counts,getReviewQueue:m.queue}}))
import {getAdminDashboard} from '@/src/services/admin-dashboard.service'
import {PERMISSIONS} from '@/src/auth/permissions'
const context={programCode:'CPNS',trackCode:'SKD'}
const catalog={program:{id:'program',code:'CPNS'},track:{id:'track',code:'SKD'},subjects:[]}
const counts={counts:{total:10,draft:2,published:8,approved:0,revisionRequired:0,editorial:0,academic:0,technical:0,unassigned:0,assignedToMe:0}}
const queue={questions:[],subjectById:new Map()}
beforeEach(()=>{
 vi.clearAllMocks();m.error=null
 m.actor.mockResolvedValue({permissions:[PERMISSIONS.ADMIN_ACCESS,PERMISSIONS.EXAM_MANAGE,PERMISSIONS.EVENT_MANAGE,PERMISSIONS.CONTENT_READ]})
 m.catalog.mockResolvedValue(catalog);m.counts.mockResolvedValue(counts);m.queue.mockResolvedValue(queue)
 const query:Record<string,unknown>={};for(const key of ['select','eq','not','gte','lte','order','limit'])query[key]=vi.fn(()=>query)
 query.then=(resolve:(result:unknown)=>unknown)=>Promise.resolve({data:[],count:7,error:m.error}).then(resolve)
 m.from.mockReturnValue(query);m.client.mockResolvedValue({from:m.from})
})
describe('dashboard panel isolation',()=>{
 it('starts the queue while KPI counts are pending and resolves the home without waiting for the queue',async()=>{
  let resolveCounts!:(value:typeof counts)=>void
  let resolveQueue!:(value:typeof queue)=>void
  m.counts.mockReturnValue(new Promise(resolve=>{resolveCounts=resolve}))
  m.queue.mockReturnValue(new Promise(resolve=>{resolveQueue=resolve}))
  const home=getAdminDashboard(context)
  await vi.waitFor(()=>{expect(m.counts).toHaveBeenCalled();expect(m.queue).toHaveBeenCalledWith(context,catalog)})
  resolveCounts(counts)
  const data=await home
  expect(data.activeAssessments).toBe(7);expect(data.review).toEqual(counts)
  resolveQueue(queue);expect(await data.reviewQueue).toEqual({data:queue})
 })
 it('contains an early queue failure without losing independent operational metrics',async()=>{
  m.queue.mockRejectedValue(new Error('Review unavailable'))
  const data=await getAdminDashboard(context)
  expect(data.activeEvents).toBe(7);expect(data.review).toEqual(counts)
  expect(await data.reviewQueue).toEqual({data:null})
 })
 it('does not read content or operational resources for an actor with only workspace access',async()=>{
  m.actor.mockResolvedValue({permissions:[PERMISSIONS.ADMIN_ACCESS]})
  const data=await getAdminDashboard(context)
  expect(m.queue).not.toHaveBeenCalled();expect(m.counts).not.toHaveBeenCalled();expect(m.from).not.toHaveBeenCalled()
  expect(data.activeAssessments).toBe(0);expect(await data.reviewQueue).toEqual({data:null})
 })
 it('keeps a KPI query failure visible rather than substituting made-up metrics',async()=>{
  m.error=new Error('Metrics unavailable')
  await expect(getAdminDashboard(context)).rejects.toThrow('Metrics unavailable')
 })
})
