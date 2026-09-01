'use client'

import Link from 'next/link'
import { forwardRef, type ComponentProps } from 'react'
import {
    trackProductEvent,
    type ProductAnalyticsProperties,
    type ProductEventName,
} from '@/lib/product-analytics'

type TrackedLinkProps = ComponentProps<typeof Link> & {
    eventName: ProductEventName
    eventProperties?: ProductAnalyticsProperties
}

const TrackedLink = forwardRef<HTMLAnchorElement, TrackedLinkProps>(function TrackedLink(
    { eventName, eventProperties, onClick, ...props },
    ref,
) {
    return (
        <Link
            {...props}
            ref={ref}
            onClick={(event) => {
                trackProductEvent(eventName, eventProperties)
                onClick?.(event)
            }}
        />
    )
})

export default TrackedLink
