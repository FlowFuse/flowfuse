import { useInstanceStates } from '../composables/InstanceStates.js'

import type { Device } from '@/types'
import { Maybe } from '@/types/common/types'

type MutableDevice = Device & {
    optimisticStateChange?: boolean
    pendingStateChange?: boolean
}

export class DeviceStateMutator {
    device: MutableDevice
    prevState?: string

    constructor (device: MutableDevice) {
        this.device = device
    }

    // assume the server has processed the state change
    setStateOptimistically (newState?: string) {
        this.device.optimisticStateChange = true
        this.device.pendingStateChange = false

        if (newState) {
            this.prevState = this.device.status
            this.device.status = newState
        }
    }

    // load latest state from the server
    setStateAsPendingFromServer (newState: Maybe<string> = null) {
        const { isTransitionState } = useInstanceStates()
        if (!newState && !isTransitionState(this.device.status)) {
            return
        }
        this.device.optimisticStateChange = false
        this.device.pendingStateChange = true

        if (newState) {
            this.prevState = this.device.status
            this.device.status = newState
        }
    }

    // return the device to its original state
    restoreState () {
        this.clearState()
        this.device.status = this.prevState
    }

    // clear all state flags
    clearState () {
        this.device.optimisticStateChange = false
        this.device.pendingStateChange = false
    }
}
