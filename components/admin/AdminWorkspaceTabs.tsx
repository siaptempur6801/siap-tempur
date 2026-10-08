'use client'

import { PERMISSIONS } from '@/src/auth/permissions';
import { usePathname,useSearchParams } from 'next/navigation';
import { AdminTabs } from './navigation/AdminTabs';
import { adminRouteState } from '@/lib/admin-routes'

/** Secondary navigation stays inside its workspace, including legacy routes. */
export default function AdminWorkspaceTabs({ workspace, permissions }: { workspace: 'monitoring' | 'settings' | 'users'; permissions: string[] }) {
    const pathname = usePathname()
    const params = useSearchParams()
    const pathContext = adminRouteState(pathname)?.context
    const has = (...codes: string[]) => codes.some(code => permissions.includes(code))
    const context = new URLSearchParams()
    for (const key of ['program', 'track', 'event', 'org', 'batch', 'assignment', 'exam', 'q', 'status', 'page', 'returnTo']) {
        const value = pathContext?.[key] ?? params.get(key)
        if (value) context.set(key, value)
    }
    const reportsHref = `/admin/monitoring/reports${context.size ? `?${context}` : ''}`
    const tabs = workspace === 'monitoring' ? [
        { label: 'Monitoring', href: `/admin/monitoring${context.size ? `?${context}` : ''}`, active: !pathname.endsWith('/monitoring/reports'), visible: has(PERMISSIONS.EVENT_MANAGE, PERMISSIONS.ORGANIZATION_MANAGE, PERMISSIONS.REPORT_READ) },
        { label: 'Reports', href: reportsHref, active: pathname.endsWith('/monitoring/reports'), visible: has(PERMISSIONS.REPORT_READ) },
    ] : workspace === 'settings' ? [
        { label: 'General', href: '/admin/settings', active: pathname === '/admin/settings', visible: has(PERMISSIONS.SETTINGS_MANAGE) },
        { label: 'Audit Log', href: '/admin/settings/audit', active: pathname === '/admin/settings/audit', visible: has(PERMISSIONS.AUDIT_READ) },
    ] : [
        { label: 'Users', href: '/admin/users', active: pathContext?.tab !== 'roles', visible: has(PERMISSIONS.USER_READ, PERMISSIONS.USER_MANAGE, PERMISSIONS.ENTITLEMENT_MANAGE) },
        { label: 'Roles & Permissions', href: '/admin/users/roles', active: pathContext?.tab === 'roles', visible: has(PERMISSIONS.USER_READ, PERMISSIONS.USER_MANAGE) },
    ]
    const visible = tabs.filter(tab => tab.visible)
    return <AdminTabs label={`${workspace === 'monitoring' ? 'Monitoring' : workspace === 'settings' ? 'Settings' : 'Users'} views`} active={visible.find(tab => tab.active)?.label || ''} tabs={visible.map(tab => ({id:tab.label,label:tab.label,href:tab.href}))}/>
}
