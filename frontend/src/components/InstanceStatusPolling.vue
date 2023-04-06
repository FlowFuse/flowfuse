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
            clearTimeout(this.checkInterval)
            if (!this.shouldCheckForUpdate(this.instance)) {
                this.checkWaitTime = 1000
                return
            }

            this.scheduleUpdate(this.instance.id)
        },

        scheduleUpdate () {
            this.checkInterval = setTimeout(async () => {
                this.checkWaitTime *= 1.15

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
            if (instance.meta?.state && instanceTransitionStates.includes(instance.meta.state)) {
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

<!-- eslint-disable-next-line vue/valid-template-root -->
<template />
