<template>
    <div class="forge-badge" :class="'forge-status-' + status">
        <ExclamationCircleIcon v-if="status === 'error'" class="w-4 h-4" />
        <span class="ml-1">{{ label }}</span>
    </div>
</template>

<script>
import { ExclamationIcon, ExclamationCircleIcon, PlayIcon, StopIcon, DotsCircleHorizontalIcon, SupportIcon, CloudDownloadIcon, CloudUploadIcon } from '@heroicons/vue/outline'

export default {
    name: 'ProjectStatusBadge',
    props: ['lastSeenAt'],
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
            if (this.since < 0) {
                return 'never'
            } else if (this.since < 1) {
                return 'running'
            } else {
                return 'error'
            }
        },
        label: function () {
            if (this.since < 0) {
                return 'never'
            } else if (this.since < 1) {
                return 'less than a minute ago'
            } else if (this.since < 2) {
                return `${Math.floor(this.since)} minute ago`
            } else if (this.since < 60) {
                return `${Math.floor(this.since)} minutes ago`
            } else {
                return 'over an hour ago'
            }
        }
    },
    components: {
        ExclamationCircleIcon
    }
}
</script>
