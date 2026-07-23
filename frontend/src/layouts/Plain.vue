<template>
    <div class="ff-layout--plain">
        <div class="ff-header">
            <!-- Mobile: Icon-only logo -->
            <img class="ff-logo lg:hidden" src="/ff-minimal-red.svg" alt="FlowFuse">
            <!-- Desktop: Full wordmark logo -->
            <img class="ff-logo hidden lg:block" src="/ff-logo--wordmark--light.svg" alt="FlowFuse">
        </div>
        <div class="ff-layout--plain--wrapper">
            <!-- <LeftDrawer /> -->
            <div class="ff-view">
                <div id="platform-banner" />
                <slot />
            </div>
            <transition name="page-fade">
                <div v-if="overlay" class="ff-dialog-container z-100!" />
            </transition>
        </div>
    </div>
</template>

<script>
import { mapState } from 'pinia'

import { useUxStore } from '@/stores/ux.js'

export default {
    name: 'ff-layout-plain',
    computed: {
        ...mapState(useUxStore, ['overlay'])
    }
}
</script>
