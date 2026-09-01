'use client'

import { track } from '@vercel/analytics'

export type ProductEventName =
    | 'px_landing_cta'
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
    surface: 'landing' | 'auth' | 'dashboard' | 'exam' | 'result' | 'pass'
    cta: string
    mode: 'latihan_fokus' | 'mini_tryout' | 'full_tryout' | 'event'
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
        const cleanProperties = Object.fromEntries(
            Object.entries(properties).filter((entry): entry is [string, AnalyticsValue] => {
                const value = entry[1]
                return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
            }),
        )

        track(eventName, cleanProperties)
    } catch {
        // Analytics must never block navigation, authentication, learning, or payment flows.
    }
}
