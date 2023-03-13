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

export default {
    name: 'DeviceLastSeenBadge',
    props: ['lastSeenAt', 'lastSeenMs', 'lastSeenSince'],
    computed: {
        since: function () {
            if (!this.lastSeenAt) {
                return -1
            } else if (typeof this.lastSeenMs === 'number') {
                return this.lastSeenMs / 1000.0 / 60.0
            } else {
                return -1
            }
        },
        status: function () {
            // re-uses the status from last known status in order to get respective colour styling
            if (!this.lastSeenAt) {
                return 'never'
            } else if (this.since < 1.5) {
                return 'running' // green
            } else if (this.since < 3) {
                return 'safe' // yellow
            } else {
                return 'error' // red
            }
        },
        label: function () {
            if (!this.lastSeenAt) {
                return 'never'
            } else {
                return this.lastSeenSince || 'unknown'
            }
        }
    },
    components: {
        ExclamationCircleIcon
    }
}
</script>
