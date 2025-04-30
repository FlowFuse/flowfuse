<template>
    <template v-if="neverConnected && hasPermission('device:edit')">
        <ff-button kind="secondary" @click="finishSetup">
            <template #icon-left><ExclamationIcon class="ff-icon" /></template>
            Finish Setup
        </ff-button>
    </template>
    <DeviceLastSeenBadge v-else :lastSeenAt="lastSeenAt" :lastSeenSince="lastSeenSince" />
</template>

<script>
import { ExclamationIcon } from '@heroicons/vue/outline'

import usePermissions from '../../../composables/Permissions.js'

import deviceActionsMixin from '../../../mixins/DeviceActions.js'

import DeviceLastSeenBadge from './DeviceLastSeenBadge.vue'

export default {
    components: {
        ExclamationIcon,
        DeviceLastSeenBadge
    },
    mixins: [deviceActionsMixin],
    inheritAttrs: false,
    props: {
        id: {
            type: String,
            required: true
        },
        lastSeenAt: {
            type: String,
            default: null
        },
        lastSeenSince: {
            type: String,
            default: null
        },
        lastSeenMs: {
            type: Number,
            default: null
        }
    },
    setup () {
        const { hasPermission } = usePermissions()
        return { hasPermission }
    },
    computed: {
        neverConnected () {
            return !this.lastSeenAt && !this.lastSeenSince
        }
    },
    methods: {
        finishSetup () {
            // ideally, we'd show the credentials dialog here, but we don't have access to this.devices
            // so for now, let's just redirect to the device page and we'll fix this better later
            this.$router.push({
                name: 'Device',
                params: { id: this.id }
            })
            // eventually we can do deviceAction('updateCredentials', id, devices)
        }
    }
}
</script>
