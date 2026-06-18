type MutableBooleanRef = {
    current: boolean
}

export function acquireSingleFlightLock(lock: MutableBooleanRef) {
    if (lock.current) return false

    lock.current = true
    return true
}

export function releaseSingleFlightLock(lock: MutableBooleanRef) {
    lock.current = false
}
