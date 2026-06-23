export const TRANSITION_STATES = ['loading', 'installing', 'starting', 'stopping', 'restarting', 'suspending', 'importing', 'rollback'] as const

export type TransitionState = typeof TRANSITION_STATES[number]

export function isTransitionState (state?: string | null): boolean {
    return (TRANSITION_STATES as readonly string[]).includes(state ?? '')
}
