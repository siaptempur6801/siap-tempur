/** Admin URL contract: resources/views in paths, filters and return context in query. */
type AdminRouteWorkspace =
  | 'assessments'
  | 'events'
  | 'organizations'
  | 'questions'
  | 'review'
  | 'products'
  | 'orders'
  | 'users'
  | 'user'
  | 'settings'
  | 'audit'
  | 'monitoring'
  | 'reports'
  | 'result'
  | 'access'
export type AdminRouteState = { workspace: AdminRouteWorkspace; context: Record<string, string> }

const aliases: Array<[string, string]> = [
  ['/admin/assessment/exams', '/admin/assessments'],
  ['/admin/assessment/events', '/admin/events'],
  ['/admin/reports', '/admin/monitoring/reports'],
  ['/admin/results', '/admin/monitoring/results'],
  ['/admin/audit', '/admin/settings/audit'],
  ['/admin/entitlements', '/admin/users/access'],
  ['/admin/content/articles/create', '/admin/content/articles/new'],
]
const assessmentViews = ['questions', 'configuration', 'distribution', 'results']
const eventViews = ['participants', 'monitoring', 'leaderboard', 'settings']
const organizationViews = ['participants', 'batches', 'assignments', 'settings']
const batchViews = ['overview', 'participants', 'assignments', 'settings']
const userViews = ['roles', 'entitlements', 'orders', 'activity']
const id = (value: string) =>
  Boolean(value) &&
  value !== 'new' &&
  !['.', '..'].includes(value) &&
  /^[a-zA-Z0-9._-]+$/.test(value)

/** Decode path context for existing domain services; route context wins over query input. */
export function adminRouteState(pathname: string): AdminRouteState | null {
  const parts = pathname
    .split('/')
    .filter(Boolean)
    .map((p) => {
      try {
        return decodeURIComponent(p)
      } catch {
        return ''
      }
    })
  if (parts[0] !== 'admin') return null
  const [, resource, ...rest] = parts
  const state = (
    workspace: AdminRouteWorkspace,
    context: Record<string, string> = {},
  ): AdminRouteState => ({ workspace, context })
  const monitor = (tail: string[], context: Record<string, string>) =>
    tail.length === 0
      ? state('monitoring', context)
      : tail.length === 1 && tail[0] === 'reports'
        ? state('reports', context)
        : null
  if (resource === 'assessments' || resource === 'events') {
    const workspace = resource
    const key = resource === 'assessments' ? 'assessment' : 'event'
    if (!rest.length) return state(workspace)
    if (rest.length === 1 && rest[0] === 'new') return state(workspace, { new: '1' })
    if (!id(rest[0])) return null
    if (rest.length === 1) return state(workspace, { [key]: rest[0] })
    if (rest.length === 2 && rest[1] === 'edit')
      return state(workspace, { [key]: rest[0], edit: rest[0] })
    if (
      rest.length === 2 &&
      (resource === 'assessments' ? assessmentViews : eventViews).includes(rest[1])
    )
      return state(workspace, { [key]: rest[0], tab: rest[1] })
    if (
      resource === 'events' &&
      rest.length === 3 &&
      rest[1] === 'monitoring' &&
      rest[2] === 'reports'
    )
      return state('events', { event: rest[0], tab: 'monitoring', monitoring_section: 'reports' })
    return null
  }
  if (resource === 'organizations') {
    if (rest[0] === 'export') return null // Binary route handler, not a workspace.
    if (!rest.length) return state('organizations')
    if (rest.length === 1 && rest[0] === 'new') return state('organizations', { new: '1' })
    if (!id(rest[0])) return null
    const context = { org: rest[0] }
    if (rest.length === 1) return state('organizations', context)
    if (rest.length === 2 && organizationViews.includes(rest[1]))
      return state('organizations', { ...context, tab: rest[1] })
    if (rest[1] !== 'batches') return null
    if (rest.length === 3 && rest[2] === 'new')
      return state('organizations', { ...context, batch: 'new' })
    if (!rest[2] || !id(rest[2])) return null
    const batch = { ...context, batch: rest[2] }
    if (rest.length === 3) return state('organizations', batch)
    if (rest.length === 4 && batchViews.includes(rest[3]))
      return state('organizations', { ...batch, tab: rest[3] })
    if (rest[3] === 'monitoring') return monitor(rest.slice(4), batch)
    if (rest[3] === 'assignments' && rest[4] && id(rest[4]) && rest[5] === 'monitoring')
      return monitor(rest.slice(6), { ...batch, assignment: rest[4] })
    return null
  }
  if (resource === 'content' && ['questions', 'review'].includes(rest[0])) {
    const workspace = rest[0] as 'questions' | 'review'
    const tail = rest.slice(1)
    if (!tail.length) return state(workspace)
    if (tail.length === 1 && tail[0] === 'new') return state(workspace, { new: '1' })
    if (workspace === 'review' && tail.length === 1 && tail[0] === 'bulk')
      return state(workspace, { bulk: '1' })
    if (
      tail[0] &&
      id(tail[0]) &&
      ((workspace === 'review' && tail.length === 1) ||
        (workspace === 'questions' && tail.length === 2 && tail[1] === 'edit'))
    )
      return state(workspace, { [workspace === 'review' ? 'question' : 'edit']: tail[0] })
    return null
  }
  if (resource === 'commerce') {
    if (rest[0] === 'orders' && rest.length === 1) return state('orders')
    if (rest[0] === 'products') {
      if (rest.length === 1) return state('products')
      if (rest.length === 2 && rest[1] === 'new') return state('products', { new: '1' })
      if (rest.length === 3 && id(rest[1]) && rest[2] === 'edit')
        return state('products', { edit: rest[1] })
    }
    return null
  }
  if (resource === 'users') {
    if (!rest.length) return state('users')
    if (rest.length === 1 && rest[0] === 'roles') return state('users', { tab: 'roles' })
    if (rest.length === 1 && rest[0] === 'access') return state('access')
    if (!id(rest[0])) return null
    if (rest.length === 1) return state('user', { userId: rest[0] })
    if (rest.length === 2 && userViews.includes(rest[1]))
      return state('user', { userId: rest[0], tab: rest[1] })
  }
  if (resource === 'settings') {
    if (!rest.length) return state('settings')
    if (rest.length === 1 && rest[0] === 'audit') return state('audit')
    if (rest.length === 2 && rest[0] === 'flags' && rest[1] === 'new')
      return state('settings', { flag: 'new' })
    if (rest.length === 3 && rest[0] === 'flags' && id(rest[1]) && rest[2] === 'edit')
      return state('settings', { flag: rest[1] })
  }
  if (resource === 'monitoring') {
    if (!rest.length) return state('monitoring')
    if (rest.length === 1 && rest[0] === 'reports') return state('reports')
    if (rest.length === 2 && rest[0] === 'results' && id(rest[1]))
      return state('result', { attemptId: rest[1] })
  }
  return null
}

/** Normalize links, action return destinations and bookmarks with one implementation. */
export function adminHref(href: string, depth = 0): string {
  if (!(href === '/admin' || href.startsWith('/admin/') || href.startsWith('/admin?'))) return href
  const url = new URL(href, 'http://admin.local')
  if (['/admin/organizations/export', '/admin/monitoring/export'].includes(url.pathname))
    return href
  let path = url.pathname.replace(/\/$/, '') || '/'
  for (const [before, after] of aliases)
    if (path === before || path.startsWith(`${before}/`)) {
      path = after + path.slice(before.length)
      break
    }
  if (path === '/admin/commerce') path = '/admin/commerce/orders'
  const q = url.searchParams
  const parsed = adminRouteState(path)
  for (const [key, value] of Object.entries(parsed?.context || {})) q.set(key, value)
  const take = (key: string) => {
    const value = q.get(key)
    q.delete(key)
    return value
  }
  const segment = (value: string) => encodeURIComponent(value)
  if (parsed?.workspace === 'assessments') {
    const creating = take('new') === '1',
      selected = take('assessment'),
      editing = take('edit'),
      tab = take('tab')
    path = '/admin/assessments'
    if (creating) path += '/new'
    else if (selected || editing)
      path += `/${segment((selected || editing)!)}${editing ? '/edit' : tab && assessmentViews.includes(tab) ? `/${tab}` : ''}`
  } else if (parsed?.workspace === 'events') {
    const creating = take('new') === '1',
      editing = take('edit'),
      selected = take('event') || editing || take('session_event'),
      tab = take('tab') || (editing ? 'settings' : ''),
      monitoringSection = take('monitoring_section')
    q.delete('edit')
    q.delete('session_event')
    path = '/admin/events'
    if (creating) path += '/new'
    else if (selected)
      path += `/${segment(selected)}${tab && eventViews.includes(tab) ? `/${tab}` : ''}${tab === 'monitoring' && monitoringSection === 'reports' ? '/reports' : ''}`
  } else if (parsed?.workspace === 'organizations') {
    const creating = take('new') === '1',
      org = take('org'),
      batch = take('batch'),
      tab = take('tab')
    path = '/admin/organizations'
    if (creating) path += '/new'
    else if (org) {
      path += `/${segment(org)}`
      if (batch)
        path += `/batches/${segment(batch)}${batch !== 'new' && tab && batchViews.includes(tab) ? `/${tab}` : batch !== 'new' && q.has('exam') ? '/assignments' : ''}`
      else if (tab && organizationViews.includes(tab)) path += `/${tab}`
    }
  } else if (parsed?.workspace === 'questions' || parsed?.workspace === 'products') {
    const creating = take('new') === '1',
      selected = take('edit')
    path =
      parsed.workspace === 'questions' ? '/admin/content/questions' : '/admin/commerce/products'
    if (creating) path += '/new'
    else if (selected) path += `/${segment(selected)}/edit`
  } else if (parsed?.workspace === 'review') {
    const creating = take('new') === '1',
      selected = take('question'),
      bulk = take('bulk') === '1'
    path = '/admin/content/review'
    if (creating) path += '/new'
    else if (selected) path += `/${segment(selected)}`
    else if (bulk) path += '/bulk'
  } else if (parsed?.workspace === 'users' && take('tab') === 'roles') path = '/admin/users/roles'
  else if (parsed?.workspace === 'user') {
    const selected = take('userId')!,
      tab = take('tab')
    path = `/admin/users/${segment(selected)}${tab && userViews.includes(tab) ? `/${tab}` : ''}`
  } else if (parsed?.workspace === 'settings') {
    const flag = take('flag')
    path = '/admin/settings'
    if (flag) path += `/flags/${segment(flag)}${flag === 'new' ? '' : '/edit'}`
  }
  if (parsed?.workspace === 'monitoring' || parsed?.workspace === 'reports') {
    const event = take('event'),
      org = take('org'),
      batch = take('batch'),
      assignment = take('assignment')
    const reports = parsed.workspace === 'reports'
    path = '/admin/monitoring'
    if (event) q.set('event', event)
    else if (org && batch)
      path = `/admin/organizations/${segment(org)}/batches/${segment(batch)}${assignment ? `/assignments/${segment(assignment)}` : ''}/monitoring`
    else {
      if (org) q.set('org', org)
      if (batch) q.set('batch', batch)
      if (assignment) q.set('assignment', assignment)
    }
    if (reports) path += '/reports'
  }
  if (parsed?.workspace === 'result') q.delete('attemptId')
  if (depth < 3)
    for (const key of ['returnTo', 'return_to']) {
      const value = q.get(key)
      if (value) q.set(key, adminHref(value, depth + 1))
    }
  return `${path}${q.size ? `?${q}` : ''}${url.hash}`
}

/** Shared primary workspace paths. Resource links normalize through adminHref. */
export const adminRoutes = {
  assessments: '/admin/assessments',
  events: '/admin/events',
  organizations: '/admin/organizations',
  orders: '/admin/commerce/orders',
}
