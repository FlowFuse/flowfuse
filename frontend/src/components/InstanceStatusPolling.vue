<script>
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

const instancesWithPendingStateChange = new Set()

export default {
    props: {
        instance: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-updated'],
    data () {
        return {
            checkInterval: null,
            checkWaitTime: 1000
        }
    },
    watch: {
        instance: 'checkForUpdateIfNeeded',
        'instance.pendingStateChange': 'checkForUpdateIfNeeded',
        'instance.meta.state': 'checkForUpdateIfNeeded'
    },
    mounted () {
        this.checkForUpdateIfNeeded()
    },
    unmounted () {
        clearTimeout(this.checkInterval)
    },
    methods: {
        checkForUpdateIfNeeded () {
            console.log("Checking if ", this.instance.id, " needs to be updated...")

            clearTimeout(this.checkInterval)

            if (!this.shouldCheckForUpdate(this.instance)) {
                instancesWithPendingStateChange.delete(this.instance.id)
                return
            }

            this.scheduleUpdate(this.instance.id)
        },

        scheduleUpdate () {
            console.log("Checking ", this.instance.id, " for update in " + this.checkWaitTime/1000 + "seconds...")

            this.checkInterval = setTimeout(async () => {
                this.checkWaitTime *= 1.2

                if (this.instance.id) {
                    const data = await InstanceApi.getInstance(this.instance.id)
                    this.$emit('instance-updated', data)
                }
            }, this.checkWaitTime)
        },

        shouldCheckForUpdate (instance) {
            // Server has not received state change request yet, no need to check for update
            if (instance.optimisticStateChange) {
                return false
            }

            // If instance is in a transition state, check for update
            if (instanceTransitionStates.includes(instance.meta.state)) {
                return true
            }

            // Otherwise, if instance is known to have a pending state change, check for update
            if (instance.pendingStateChange) {
                return true
            }

            return false
        }
    }
}
</script>

<template></template>