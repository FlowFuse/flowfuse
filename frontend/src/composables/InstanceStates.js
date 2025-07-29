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

    const statesMap = {
        running: runningStates,
        error: errorStates,
        stopped: stoppedStates
    }

    const isRunningState = (state) => runningStates.includes(state)
    const isErrorState = (state) => errorStates.includes(state)
    const isStoppedState = (state) => stoppedStates.includes(state)

    const groupBySimplifiedStates = (instanceStateCounts) => {
        return {
            running: instanceStateCounts
                ? Object.keys(instanceStateCounts)
                    .filter(key => runningStates.includes(key))
                    .reduce((total, key) => total + instanceStateCounts[key], 0)
                : 0,
            error: instanceStateCounts
                ? Object.keys(instanceStateCounts)
                    .filter(key => errorStates.includes(key))
                    .reduce((total, key) => total + instanceStateCounts[key], 0)
                : 0,
            stopped: instanceStateCounts
                ? Object.keys(instanceStateCounts)
                    .filter(key => stoppedStates.includes(key))
                    .reduce((total, key) => total + instanceStateCounts[key], 0)
                : 0
        }
    }

    return {
        runningStates,
        isRunningState,
        errorStates,
        isErrorState,
        stoppedStates,
        isStoppedState,
        statesMap,
        groupBySimplifiedStates
    }
}
