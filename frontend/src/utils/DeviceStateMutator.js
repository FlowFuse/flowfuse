export class DeviceStateMutator {
    constructor (device) {
        this.device = device
    }

    /**
     * assume server has processed state change
     * @param {*} newstate
     */
    setStateOptimistically (newState) {
        this.device.optimisticStateChange = true
        this.device.pendingStateChange = false

        if (newState) {
            this.prevState = this.device.status
            this.device.status = newState
        }
    }

    /**
     * Load latest state from server
     * @param {*} newState
    */
    setStateAsPendingFromServer (newState = null) {
        this.device.optimisticStateChange = false
        this.device.pendingStateChange = true

        if (newState) {
            this.prevState = this.device.status
            this.device.status = newState
        }
    }

    /**
     * Return instance to original state
     * @param {*} prevState
     */
    restoreState () {
        this.clearState()
        this.device.status = this.prevState
    }

    /**
     * Clear all state flags
     */
    clearState () {
        this.device.optimisticStateChange = false
        this.device.pendingStateChange = false
    }
}
