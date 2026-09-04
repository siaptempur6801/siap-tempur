'use client'

import { useCallback, useEffect, useState } from 'react'
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
    xpInfo: XPInfo | null
    rewardKey: string
    showReward?: boolean
    disablePopup?: boolean
}

export default function ResultXPWrapper({ children, xpInfo, rewardKey, showReward = true, disablePopup }: ResultXPWrapperProps) {
    const [showPopup, setShowPopup] = useState(false)
    const closePopup = useCallback(() => setShowPopup(false), [])

    useEffect(() => {
        if (!showReward || !xpInfo || xpInfo.xpEarned <= 0 || disablePopup) return

        const storageKey = `siap-tempur:xp-reward:v1:${rewardKey}`
        try {
            if (window.sessionStorage.getItem(storageKey)) return
        } catch {
            // Reward still works when browser storage is unavailable.
        }

        const timer = window.setTimeout(() => {
            try {
                window.sessionStorage.setItem(storageKey, 'shown')
            } catch {
                // XP remains server-derived when browser storage is unavailable.
            }
            setShowPopup(true)
        }, 350)

        return () => window.clearTimeout(timer)
    }, [disablePopup, rewardKey, showReward, xpInfo])

    return (
        <>
            {children}
            {xpInfo ? (
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
                    onClose={closePopup}
                />
            ) : null}
        </>
    )
}
