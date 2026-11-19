<template>
    <div class="ff-layout--plain">
        <div class="ff-header">
            <router-link :to="homeLink" class="ff-logo-wrapper">
                <!-- Mobile: Icon-only logo -->
                <img class="ff-logo lg:hidden" src="/ff-minimal-red.svg" alt="FlowFuse">
                <!-- Desktop: Full wordmark logo -->
                <img class="ff-logo hidden lg:block" :src="wordmarkLogo" alt="FlowFuse">
            </router-link>
            <!-- Teleport target for page-level header actions (e.g. the
                 onboarding escape hatch) -->
            <div id="plain-layout-actions" class="ff-plain-layout-actions" />
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

import navigationMixin from '../mixins/Navigation.js'

import { useThemeStore } from '@/stores/theme.ts'
import { useUxStore } from '@/stores/ux.js'

export default {
    name: 'ff-layout-plain',
    mixins: [navigationMixin],
    computed: {
        ...mapState(useUxStore, ['overlay']),
        ...mapState(useThemeStore, ['effective']),
        wordmarkLogo () {
            return this.effective === 'dark' ? '/ff-logo--wordmark--dark.svg' : '/ff-logo--wordmark--light.svg'
        }
    }
}
</script>

<style scoped lang="scss">
.ff-plain-layout-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0 1.5rem;
}
</style>
