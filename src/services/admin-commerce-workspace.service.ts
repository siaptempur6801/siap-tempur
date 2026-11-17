import { adminOffset,parseAdminPage } from '@/lib/admin-pagination'
import { escapePostgrestValue } from '@/lib/postgrest-filter'
import { createAdminClient } from '@/lib/utils/supabase/server'
import { PERMISSIONS } from '@/src/auth/permissions'
import 'server-only'
import { AuthorizationError,authorizationService } from './authorization.service'

async function commerceActor() {
  const actor = await authorizationService.requireAuthenticated()
  if (!actor.permissions.some(p => p === PERMISSIONS.ORDER_READ || p === PERMISSIONS.PAYMENT_MANAGE)) throw new AuthorizationError()
  return actor
}
export async function listAdminOrders(filters: { q?: string; status?: string; payment?: string; page?: string; user?: string } = {}) {
  await commerceActor()
  const db = await createAdminClient(), page = parseAdminPage(filters.page)
  const apply = (query: ReturnType<ReturnType<typeof db.from>['select']>) => {
    if (filters.q) query = query.ilike('order_number', `%${escapePostgrestValue(filters.q)}%`)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.user) query = query.eq('user_id', filters.user)
    if (filters.payment) query=query.eq('payments.status',filters.payment)
    return query
  }
  // Join the payment relation on the server; never truncate a global ID list.
  const counted=apply(db.from('orders').select(filters.payment?'id,payments!inner(status)':'id', {count:'exact',head:true}))
  const totalResult = await counted
  if (totalResult.error) throw totalResult.error
  const total = totalResult.count || 0
  if (adminOffset(page) >= total) return {rows:[],total,page}
  const query = apply(db.from('orders').select(`id,order_number,user_id,status,total_amount,currency,paid_at,created_at${filters.payment?',payments!inner(status)':''}`))
  const result = await query.order('created_at',{ascending:false}).order('id').range(adminOffset(page),adminOffset(page)+24)
  if (result.error) throw result.error
  const orders = (result.data || []) as {id:string;order_number:string;user_id:string;status:string;total_amount:number;currency:string;paid_at:string|null;created_at:string}[], ids = orders.map(o=>String(o.id)), users = [...new Set(orders.map(o=>String(o.user_id)))]
  const [profiles, items, payments] = await Promise.all([
    db.from('profiles').select('id,full_name,display_name').in('id',users),
    db.from('order_items').select('id,order_id,product_id,quantity,unit_price,total,products(name)').in('order_id',ids),
    db.from('payments').select('id,order_id,status,created_at').in('order_id',ids).order('created_at',{ascending:false}),
  ])
  for (const r of [profiles,items,payments]) if(r.error) throw r.error
  const names = new Map((profiles.data || []).map(p=>[String(p.id),String(p.full_name || p.display_name || 'Pengguna')]))
  return { rows: orders.map(o=>({...o, customer_name:names.get(String(o.user_id)) || 'Pengguna', product_names:(items.data || []).filter(i=>i.order_id===o.id).map(i=>String((i.products as unknown as {name:string})?.name || 'Produk')).join(', '), payment_status:payments.data?.find(p=>p.order_id===o.id)?.status || 'pending'})), total, page }
}
export async function getAdminOrderResources(orderId: string, userId: string) {
  const actor = await commerceActor(), db = await createAdminClient()
  const [customer, items] = await Promise.all([
    db.from('profiles').select('id,full_name,display_name').eq('id',userId).maybeSingle(),
    db.from('order_items').select('id,quantity,unit_price,total,products(name,description)').eq('order_id',orderId),
  ])
  for (const r of [customer,items]) if(r.error) throw r.error
  const ids = (items.data || []).map(i=>String(i.id))
  const grants = actor.permissions.includes(PERMISSIONS.ENTITLEMENT_MANAGE) && ids.length ? await db.from('entitlements').select('id,status,expires_at,features(name)').eq('user_id',userId).eq('source_type','order_item').in('source_id',ids) : {data:[],error:null}
  if(grants.error) throw grants.error
  return {customer:customer.data,items:items.data || [],grants:grants.data || [],canAccess:actor.permissions.includes(PERMISSIONS.ENTITLEMENT_MANAGE)}
}
