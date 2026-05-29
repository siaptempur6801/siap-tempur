import { useState, useEffect, useRef } from 'react'

export function useExamTimer({
    endTime,
    hasFinished,
    onShowWarning5Min,
    onShowWarning1Min,
    onTimeExpired
}: {
    endTime?: string
    hasFinished: boolean
    onShowWarning5Min: () => void
    onShowWarning1Min: () => void
    onTimeExpired: () => void
}) {
    const [timeLeft, setTimeLeft] = useState('01:40:00')
    const [timeLeftMs, setTimeLeftMs] = useState(0)
    const warning5ShownRef = useRef(false)
    const warning1ShownRef = useRef(false)
    const expiredHandledRef = useRef(false)

    // Store callbacks in refs to avoid dependency churn
    const callbacksRef = useRef({ onShowWarning5Min, onShowWarning1Min, onTimeExpired })
    
    useEffect(() => {
        callbacksRef.current = { onShowWarning5Min, onShowWarning1Min, onTimeExpired }
    }, [onShowWarning5Min, onShowWarning1Min, onTimeExpired])

    useEffect(() => {
        warning5ShownRef.current = false
        warning1ShownRef.current = false
        expiredHandledRef.current = false
    }, [endTime])

    useEffect(() => {
        if (!endTime || hasFinished) return

        const tick = () => {
            const now = Date.now()
            const end = new Date(endTime).getTime()
            const diff = end - now

            if (diff <= 0) {
                setTimeLeft('00:00:00')
                setTimeLeftMs(0)

                if (!expiredHandledRef.current) {
                    expiredHandledRef.current = true
                    callbacksRef.current.onTimeExpired()
                }
                return
            }

            setTimeLeftMs(diff)

            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((diff % (1000 * 60)) / 1000)

            setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)

            if (diff <= 5 * 60 * 1000 && diff > 60 * 1000 && !warning5ShownRef.current) {
                warning5ShownRef.current = true
                callbacksRef.current.onShowWarning5Min()
            }

            if (diff <= 60 * 1000 && !warning1ShownRef.current) {
                warning1ShownRef.current = true
                callbacksRef.current.onShowWarning1Min()
            }
        }

        tick()
        const interval = window.setInterval(tick, 1000)
        return () => window.clearInterval(interval)
    }, [endTime, hasFinished])

    return { timeLeft, timeLeftMs }
}
