export function useInstanceStates () {
    const runningStates = [
        'importing',
        'connected',
        'info',
        'success',
        'pushing',
        'pulling',
        'loading',
        'updating',
        'installing',
        'safe',
        'protected',
        'running',
        'warning',
        'starting'
    ]
    const errorStates = ['error', 'crashed']
    const stoppedStates = [
        'stopping',
        'restarting',
        'suspending',
        'rollback',
        'stopped',
        'suspended',
        'offline',
        'unknown'
    ]

    const isRunningState = (state) => runningStates.includes(state)
    const isErrorState = (state) => errorStates.includes(state)
    const isStoppedState = (state) => stoppedStates.includes(state)

    return {
        runningStates,
        isRunningState,
        errorStates,
        isErrorState,
        stoppedStates,
        isStoppedState
    }
}
