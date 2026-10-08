import { createAdminClient,createV2AdminClient } from '@/lib/utils/supabase/server'
import { PERMISSIONS } from '@/src/auth/permissions'
import 'server-only'
import { adminResourceCounts } from './admin-resource-counts.service'
import { adminDirectoryService } from './admin-directory.service'
import { AuthorizationError,authorizationService } from './authorization.service'
async function userActor() {const actor=await authorizationService.requireAuthenticated();if(!actor.permissions.some(p=>p===PERMISSIONS.USER_READ || p===PERMISSIONS.USER_MANAGE))throw new AuthorizationError();return actor}
export async function getAdminUserIdentity(userId:string) {
 await userActor();const db=await createV2AdminClient()
 const result=await db.auth.admin.getUserById(userId);if(result.error)throw result.error
 return {email:result.data.user.email || null,lastActivity:result.data.user.last_sign_in_at || null}
}
export async function getAdminUserRoles(userId:string) {
 await userActor();const db=await createAdminClient()
 const [bindings,roles]=await Promise.all([db.from('user_roles').select('role_id').eq('user_id',userId),adminDirectoryService.listRoles()]);if(bindings.error)throw bindings.error
 const ids=(bindings.data || []).map(b=>String(b.role_id)),roleRows=ids.length?await db.from('roles').select('id,code').in('id',ids):{data:[],error:null};if(roleRows.error)throw roleRows.error
 const codes=new Set((roleRows.data || []).map(r=>String(r.code)));return roles.filter(r=>codes.has(r.code))
}
export async function getAdminUserActivity(userId:string) {
 await userActor();const db=await createAdminClient()
 const {data,error}=await db.from('exam_attempts').select('id,status,started_at,submitted_at,total_score,exams(title)').eq('user_id',userId).order('started_at',{ascending:false}).limit(25);if(error)throw error
 return data || []
}
export async function getAdminUserAccessCounts(userIds:string[]) {
 await authorizationService.requirePermission(PERMISSIONS.ENTITLEMENT_MANAGE)
 return adminResourceCounts('user_entitlements', userIds)
}
