export const PERMISSIONS = {
  ADMIN_ACCESS: 'admin.access',
  AUDIT_READ: 'audit.read',
  CONTENT_ASSIGN: 'content.assign',
  CONTENT_CREATE: 'content.create',
  CONTENT_PUBLISH: 'content.publish',
  CONTENT_READ: 'content.read',
  CONTENT_REVIEW: 'content.review',
  CONTENT_UPDATE: 'content.update',
  ENTITLEMENT_MANAGE: 'entitlement.manage',
  EVENT_MANAGE: 'event.manage',
  EXAM_MANAGE: 'exam.manage',
  NOTIFICATION_MANAGE: 'notification.manage',
  ORDER_READ: 'order.read',
  ORGANIZATION_MANAGE: 'organization.manage',
  PAYMENT_MANAGE: 'payment.manage',
  PRODUCT_MANAGE: 'product.manage',
  QUESTION_MANAGE: 'question.manage',
  REPORT_READ: 'report.read',
  ROLE_MANAGE: 'role.manage',
  SETTINGS_MANAGE: 'settings.manage',
  USER_MANAGE: 'user.manage',
  USER_READ: 'user.read',
} as const

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export const ROLE_CODES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  CONTENT_EDITOR: 'CONTENT_EDITOR',
  CONTENT_REVIEWER: 'CONTENT_REVIEWER',
  FINANCE: 'FINANCE',
  SUPPORT: 'SUPPORT',
  SCHOOL_ADMIN: 'SCHOOL_ADMIN',
} as const

export type RoleCode = (typeof ROLE_CODES)[keyof typeof ROLE_CODES]
