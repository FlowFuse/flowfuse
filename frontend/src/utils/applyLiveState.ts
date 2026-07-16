type LiveStateTarget = {
    status?: string
    meta?: { state?: string } & Record<string, unknown>
    optimisticStateChange?: boolean
    pendingStateChange?: boolean
}

type ApplyLiveStateOptions = {
    device?: boolean
    clearFlags?: boolean
    versions?: Record<string, string>
}

export function applyLiveState<T extends LiveStateTarget> (obj: T, state: string, { device = false, clearFlags = false, versions }: ApplyLiveStateOptions = {}): T {
    const next = device
        ? { ...obj, status: state }
        : { ...obj, status: state, meta: { ...(obj.meta || {}), state, ...(versions ? { versions } : {}) } }
    if (clearFlags) {
        next.optimisticStateChange = false
        next.pendingStateChange = false
    }
    return next
}
