type LiveStateTarget = {
    status?: string
    meta?: { state?: string } & Record<string, unknown>
    optimisticStateChange?: boolean
    pendingStateChange?: boolean
}

type ApplyLiveStateOptions = {
    device?: boolean
    clearFlags?: boolean
}

export function applyLiveState<T extends LiveStateTarget> (obj: T, state: string, { device = false, clearFlags = false }: ApplyLiveStateOptions = {}): T {
    const next = device
        ? { ...obj, status: state }
        : { ...obj, status: state, meta: { ...(obj.meta || {}), state } }
    if (clearFlags) {
        next.optimisticStateChange = false
        next.pendingStateChange = false
    }
    return next
}
