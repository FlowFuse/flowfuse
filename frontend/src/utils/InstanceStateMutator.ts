import { isTransitionState } from './stateTransitions.js'

import type { Instance } from '@/types'
import { Maybe } from '@/types/common/types'

type MutableInstance = Instance & {
    meta?: { state?: string } & Record<string, unknown>
    optimisticStateChange?: boolean
    pendingStateChange?: boolean
}

export class InstanceStateMutator {
    instance: MutableInstance
    prevState?: string

    constructor (instance: MutableInstance) {
        this.instance = instance
    }

    // assume the server has processed the state change
    setStateOptimistically (newState?: string) {
        this.instance.optimisticStateChange = true
        this.instance.pendingStateChange = false

        if (newState) {
            this.prevState = this.instance.meta.state
            this.instance.meta.state = newState
        }
    }

    // load latest state from the server
    setStateAsPendingFromServer (newState: Maybe<string> = null) {
        if (!newState && !isTransitionState(this.instance.meta?.state)) {
            return
        }
        this.instance.optimisticStateChange = false
        this.instance.pendingStateChange = true

        if (newState) {
            this.prevState = this.instance.meta.state
            this.instance.meta.state = newState
        }
    }

    // return the instance to its original state
    restoreState () {
        this.clearState()
        this.instance.meta.state = this.prevState
    }

    // clear all state flags
    clearState () {
        this.instance.optimisticStateChange = false
        this.instance.pendingStateChange = false
    }
}
