<template>
    <div
        v-ff-tooltip:bottom="'Developer Mode: Enabled'"
        class="forge-badge forge-badge-devmode"
    >
        <BeakerIcon class="w-4 h-4" />
        <span class="ml-1">Developer Mode</span>
    </div>
</template>

<script>
import { BeakerIcon } from '@heroicons/vue/outline'

export default {
    name: 'DeviceDeveloperModeBadge',
    components: {
        BeakerIcon
    }
}
</script>
