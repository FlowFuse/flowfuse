export class InstanceStateMutator {
    constructor (instance) {
        this.instance = instance
    }

    /**
     * assume server has processed state change
     * @param {*} newstate
     */
    setStateOptimistically (newState) {
        this.instance.optimisticStateChange = true
        this.instance.pendingStateChange = false

        if (newState) {
            this.prevState = this.instance.meta.state
            this.instance.meta.state = newState
        }
    }

    /**
     * Load latest state from server
     * @param {*} newState
    */
    setStateAsPendingFromServer (newState = null) {
        this.instance.optimisticStateChange = false
        this.instance.pendingStateChange = true

        if (newState) {
            this.prevState = this.instance.meta.state
            this.instance.meta.state = newState
        }
    }

    /**
     * Return instance to original state
     * @param {*} prevState
     */
    restoreState () {
        this.clearState()
        this.instance.meta.state = this.prevState
    }

    /**
     * Clear all state flags
     */
    clearState () {
        this.instance.optimisticStateChange = false
        this.instance.pendingStateChange = false
    }
}
