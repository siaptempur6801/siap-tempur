'use client'

import { useEffect, useState } from 'react'
import XPRewardPopup from './XPRewardPopup'

interface XPInfo {
    xpEarned: number
    previousXP: number
    newXP: number
    previousLevel: number
    newLevel: number
    newLevelName: string
    leveledUp: boolean
    progress: number
    xpToNext: number
    streakCount?: number
    isStreak?: boolean
}

interface ResultXPWrapperProps {
    children: React.ReactNode
    xpInfo: XPInfo
    disablePopup?: boolean
}

export default function ResultXPWrapper({ children, xpInfo, disablePopup }: ResultXPWrapperProps) {
    const [showPopup, setShowPopup] = useState(false)
    const [hasShown, setHasShown] = useState(false)

    useEffect(() => {
        // Only show popup once per session
        if (!hasShown && xpInfo.xpEarned > 0 && !disablePopup) {
            // Small delay to let the page render first
            const timer = setTimeout(() => {
                setShowPopup(true)
                setHasShown(true)
            }, 500)
            return () => clearTimeout(timer)
        }
    }, [disablePopup, hasShown, xpInfo.xpEarned])

    return (
        <>
            {children}
            <XPRewardPopup
                show={showPopup}
                xpEarned={xpInfo.xpEarned}
                previousXP={xpInfo.previousXP}
                newXP={xpInfo.newXP}
                previousLevel={xpInfo.previousLevel}
                newLevel={xpInfo.newLevel}
                newLevelName={xpInfo.newLevelName}
                progress={xpInfo.progress}
                xpToNext={xpInfo.xpToNext}
                streakCount={xpInfo.streakCount}
                isStreak={xpInfo.isStreak}
                onClose={() => setShowPopup(false)}
            />
        </>
    )
}

