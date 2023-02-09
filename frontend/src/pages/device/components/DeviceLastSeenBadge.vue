<template>
    <div class="forge-badge" :class="'forge-status-' + status">
        <ExclamationCircleIcon v-if="status === 'error'" class="w-4 h-4" />
        <span class="ml-1">{{ label }}</span>
    </div>
</template>

<script>
import { ExclamationCircleIcon } from '@heroicons/vue/outline'

export default {
    name: 'ProjectStatusBadge',
    props: ['lastSeenAt', 'lastSeenSince'],
    computed: {
        since: function () {
            if (this.lastSeenAt) {
                const now = new Date()
                const lastSeen = new Date(this.lastSeenAt)

                const mins = ((now.getTime() - lastSeen.getTime()) / 1000) / 60

                return mins
            } else {
                return -1
            }
        },
        status: function () {
            // re-uses the status from last known status in order to get respective colour styling
            if (this.since < 0) {
                return 'never' // green
            } else if (this.since < 1.5) {
                return 'running'
            } else if (this.since < 3) {
                return 'safe' // yellow
            } else {
                return 'error' // red
            }
        },
        label: function () {
            if (this.since < 0) {
                return 'never'
            } else {
                return this.lastSeenSince
            }
        }
    },
    components: {
        ExclamationCircleIcon
    }
}
</script>
