<template>
    <div
        v-ff-tooltip:bottom="lastSeenAt ? 'Last seen at ' + lastSeenAt : 'Never seen'"
        class="forge-badge" :class="'forge-status-' + status"
    >
        <ExclamationCircleIcon v-if="status === 'error'" class="w-4 h-4" />
        <span class="ml-1">{{ label }}</span>
    </div>
</template>

<script>
import { ExclamationCircleIcon } from '@heroicons/vue/outline'

import DeviceStatus from '../../../services/device-status.js'
import daysSince from '../../../utils/daysSince.js'

export default {
    name: 'DeviceLastSeenBadge',
    props: ['lastSeenAt', 'lastSeenMs', 'lastSeenSince'],
    computed: {
        status: function () {
            // re-uses the status from last known status in order to get respective colour styling
            return DeviceStatus.lastSeenStatus(this.lastSeenAt, this.lastSeenMs).class
        },
        label: function () {
            if (!this.lastSeenAt) {
                return 'never'
            } else {
                return daysSince(this.lastSeenAt, true) || 'unknown'
            }
        }
    },
    components: {
        ExclamationCircleIcon
    }
}
</script>
