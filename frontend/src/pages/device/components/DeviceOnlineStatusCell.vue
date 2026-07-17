<template>
    <div
        v-ff-tooltip:left="tooltip"
        class="forge-badge"
        :class="'forge-status-' + onlineStatus"
        :data-el="`device-online-status-${onlineStatus}`"
    >
        <SignalIcon v-if="onlineStatus === 'online'" class="w-4 h-4" />
        <SignalSlashIcon v-else-if="onlineStatus === 'offline'" class="w-4 h-4" />
        <MinusCircleIcon v-else class="w-4 h-4" />
        <span class="ml-1 whitespace-nowrap">{{ label }}</span>
    </div>
</template>

<script setup lang="ts">
import { MinusCircleIcon, SignalIcon, SignalSlashIcon } from '@heroicons/vue/24/outline'
import { computed } from 'vue'

import { capitalize } from '../../../composables/strings/String.js'
import daysSince from '../../../utils/daysSince'

type OnlineStatus = 'online' | 'offline' | 'not-seen'

const props = withDefaults(defineProps<{
    onlineStatus?: OnlineStatus
    status?: string | null
    lastSeenAt?: string | null
}>(), {
    onlineStatus: 'not-seen',
    status: null,
    lastSeenAt: null
})

const LABELS: Record<OnlineStatus, string> = {
    online: 'Online',
    offline: 'Offline',
    'not-seen': 'Never Seen'
}

const label = computed(() => LABELS[props.onlineStatus] || 'Unknown')

const tooltip = computed(() => {
    if (props.onlineStatus === 'not-seen' || !props.lastSeenAt) {
        return 'Never seen'
    }
    const reported = props.status ? capitalize(props.status) : 'Unknown'
    return `Last seen: ${daysSince(props.lastSeenAt, true)} · Last reported: ${reported}`
})
</script>
