import {PERMISSIONS, type PermissionCode} from '@/src/auth/permissions'
/** Catalog resources share list/editor composition; Event and Orders own their workflows. */
export type AdminResourceMode='products'|'questions'
export const ADMIN_RESOURCE_ROUTES:Record<AdminResourceMode,string>={products:'/admin/commerce/products',questions:'/admin/content/questions'}
export const ADMIN_RESOURCE_COPY:Record<AdminResourceMode,{title:string}>={products:{title:'Products'},questions:{title:'Question Bank'}}
export const ADMIN_RESOURCE_PERMISSIONS:Record<AdminResourceMode,readonly PermissionCode[]>={products:[PERMISSIONS.PRODUCT_MANAGE],questions:[PERMISSIONS.QUESTION_MANAGE]}
