'use client'

import { track } from '@vercel/analytics'

export type ProductEventName =
    | 'px_landing_cta'
    | 'px_landing_nav'
    | 'px_landing_scroll'
    | 'px_auth_intent'
    | 'px_auth_success'
    | 'px_dashboard_action'
    | 'px_exam_start'
    | 'px_exam_complete'
    | 'px_result_action'
    | 'px_package_view'
    | 'px_package_select'
    | 'px_checkout_state'

export type ProductAnalyticsProperties = Partial<{
    program: 'cpns' | 'tka_smp'
    surface: 'landing' | 'auth' | 'dashboard' | 'exam' | 'diagnostic' | 'result' | 'pass'
    cta: string
    mode: 'latihan_fokus' | 'mini_tryout' | 'full_tryout' | 'diagnostic' | 'event'
    section: string
    depth: 25 | 50 | 75 | 90
    package_days: 30 | 90
    payment_state: 'opened' | 'success' | 'pending' | 'error' | 'closed' | 'verifying'
    auth_method: 'email' | 'google'
}>

type AnalyticsValue = string | number | boolean

export function trackProductEvent(
    eventName: ProductEventName,
    properties: ProductAnalyticsProperties = {},
) {
    try {
        const cleanProperties: Record<string, AnalyticsValue> = {}

        for (const [key, value] of Object.entries(properties)) {
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                cleanProperties[key] = value
            }
        }

        track(eventName, cleanProperties)
    } catch {
        // Analytics must never block navigation, authentication, learning, or payment flows.
    }
}