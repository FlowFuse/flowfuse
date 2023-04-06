import {
    isRef,
    watchEffect
} from 'vue'

import InstanceApi from '../api/instances.js'

const instanceTransitionStates = [
    'loading',
    'installing',
    'starting',
    'stopping',
    'restarting',
    'suspending',
    'importing'
]

export function useInstanceStatusPolling (instance) {
    function shouldStartPolling (instance) {
        if (instance.pendingStateChange) {
            return true
        }

        if (instanceTransitionStates.includes(instance.meta.state)) {
            return true
        }

        return false
    }

    function startPollingIfNeeded () {
        if (!shouldStartPolling(instance)) {
            instance.pendingStateChange = false

            return false
        }

        debugger

        this.checkWaitTime = 1000
        clearTimeout(this.checkInterval)
        this.checkInterval = setTimeout(async () => {
            this.checkWaitTime *= 1.1

            if (instance.id) {
                const data = await InstanceApi.getInstance(instance.id)
                const wasPendingStateChange = instance.pendingStateChange
                instance = data
                instance.pendingStateChange = wasPendingStateChange
            }
        }, this.checkWaitTime)
    }

    if (isRef(instance)) {
        watchEffect(startPollingIfNeeded)
    } else {
        startPollingIfNeeded()
    }
}
