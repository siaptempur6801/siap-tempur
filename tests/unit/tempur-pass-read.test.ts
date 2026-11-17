import {beforeEach,afterEach,describe,expect,it,vi} from 'vitest'
const m=vi.hoisted(()=>({client:vi.fn(),from:vi.fn(),select:vi.fn(),eq:vi.fn(),in:vi.fn(),rows:[] as unknown[],error:null as unknown}))
vi.mock('@/lib/utils/supabase/server',()=>({createV2Client:m.client}))
import {getActivePassScopes,PASS_FEATURE_BY_SCOPE} from '@/src/services/tempur-pass.service'
const now=Date.parse('2026-10-08T05:00:00Z')
function grant(overrides:Record<string,unknown>={}){return {starts_at:'2026-10-07T05:00:00Z',expires_at:null,usage_limit:null,usage_count:0,status:'active',features:{code:PASS_FEATURE_BY_SCOPE['tka:smp']},...overrides}}
beforeEach(()=>{vi.clearAllMocks();vi.spyOn(Date,'now').mockReturnValue(now);m.rows=[];m.error=null;const q={select:m.select,eq:m.eq,in:m.in,then:(resolve:(r:unknown)=>unknown)=>Promise.resolve({data:m.rows,error:m.error}).then(resolve)};for(const f of [m.from,m.select,m.eq,m.in])f.mockReturnValue(q);m.client.mockResolvedValue({from:m.from})})
afterEach(()=>vi.restoreAllMocks())
describe('fresh authenticated pass read',()=>{
 it('joins only pass features for the selected user and active statuses',async()=>{m.rows=[grant()];expect(await getActivePassScopes('owner')).toEqual(['tka:smp']);expect(m.from).toHaveBeenCalledExactlyOnceWith('entitlements');expect(m.eq).toHaveBeenCalledExactlyOnceWith('user_id','owner');expect(m.in).toHaveBeenCalledWith('features.code',Object.values(PASS_FEATURE_BY_SCOPE));expect(m.in).toHaveBeenCalledWith('status',['active','ACTIVE']);expect(m.select).toHaveBeenCalledWith('starts_at, expires_at, usage_limit, usage_count, status, features!inner(code)')})
 it.each([{starts_at:null},{starts_at:'invalid'},{starts_at:'2026-10-08T05:00:01Z'},{expires_at:'2026-10-08T05:00:00Z'},{expires_at:'invalid'},{usage_limit:1,usage_count:1},{usage_limit:0,usage_count:0},{features:{code:'other.feature'}}])('rejects unusable or unrelated grants: %j',async overrides=>{m.rows=[grant(overrides)];expect(await getActivePassScopes('owner')).toEqual([])})
 it('deduplicates scopes in their canonical order and preserves unlimited usage',async()=>{m.rows=[grant(),grant({usage_limit:null,usage_count:999}),grant({features:{code:PASS_FEATURE_BY_SCOPE.cpns},usage_limit:2,usage_count:1})];expect(await getActivePassScopes('owner')).toEqual(['cpns','tka:smp'])})
 it('allows availability starting at now and a later expiry',async()=>{m.rows=[grant({starts_at:'2026-10-08T05:00:00Z',expires_at:'2026-10-08T05:00:01Z'})];expect(await getActivePassScopes('owner')).toEqual(['tka:smp'])})
 it('keeps fresh reads rather than persisting user access across calls',async()=>{m.rows=[grant()];expect(await getActivePassScopes('owner')).toEqual(['tka:smp']);m.rows=[];expect(await getActivePassScopes('owner')).toEqual([]);expect(m.from).toHaveBeenCalledTimes(2)})
 it('propagates errors rather than making up an access state',async()=>{m.error=new Error('Database unavailable');await expect(getActivePassScopes('owner')).rejects.toThrow('Database unavailable')})
})
