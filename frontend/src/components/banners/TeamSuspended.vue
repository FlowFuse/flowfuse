<template>
    <div
        v-if="team.suspended"
        class="ff-banner ff-banner-warning"
        data-el="banner-team-suspended"
    >
        <span>
            <ExclamationCircleIcon class="ff-icon mr-2" />
            This team is suspended.
        </span>
    </div>
</template>

<script>
import { ExclamationCircleIcon } from '@heroicons/vue/outline'
import { mapState } from 'pinia'

import { useContextStore } from '@/stores/context.js'

export default {
    name: 'TeamSuspended',
    components: {
        ExclamationCircleIcon
    },
    computed: {
        ...mapState(useContextStore, ['team'])
    }
}
</script>
