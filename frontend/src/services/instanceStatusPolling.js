
import InstanceApi from '../api/instances.js'

const instancesWithPendingChange = new Map()

const instanceTransitionStates = [
    'loading',
    'installing',
    'starting',
    'stopping',
    'restarting',
    'suspending',
    'importing'
]

export default {
    checkWaitTime: 1000,
    checkInterval: null,

    pollingEnabled: false,

    enablePolling () {
        this.pollingEnabled = true
    },

    disablePolling () {
        clearTimeout(this.checkInterval)
    },

    async refreshInstance (instance) {
        await InstanceApi.getInstance(this.instance.id)
    },

    markPendingChange (instance) {
        instancesWithPendingChange.set(instance.id, true)
    },

    startPollingIfNeeded (instance) {
        if (!this.shouldStartPollingForInstanceStatus(instance)) {
            return
        }

        clearTimeout(this.checkInterval)
        this.checkInterval = setTimeout(async () => {
            await this.refreshInstance(instance)
            this.checkWaitTime *= 1.1

            this.startPollingIfNeeded(instance)

            if (this.instance.id) {
                const wasPendingRestart = this.instance.pendingRestart
                const wasPendingStateChange = this.instance.pendingStateChange
                const wasPendingStatePrevious = this.instance.pendingStatePrevious
                this.instance = data
                this.instance.pendingStatePrevious = wasPendingStatePrevious
                this.instance.pendingStateChange = wasPendingStateChange
            }
        }, this.checkWaitTime)
    },

    shouldStartPollingForInstancesStatuses (instances) {
        return instances.some(instance => this.shouldStartPollingForInstanceStatus(instance))
    },

    shouldStartPollingForInstanceStatus (instance) {
        if (instanceTransitionStates.includes(this.instance.meta.state)) {
            return true
        }

        return false
    }
}
