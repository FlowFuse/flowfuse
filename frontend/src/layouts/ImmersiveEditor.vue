<template>
    <div class="ff-layout--immersive" :class="{ 'ff-layout--immersive--fullscreen': editorImmersiveDrawer.fullscreen }">
        <PageHeader v-show="!editorImmersiveDrawer.fullscreen" />
        <div class="ff-layout--immersive--wrapper">
            <slot />
        </div>
        <PlatformDialog />
        <PlatformAlerts />
    </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'

import PageHeader from '../components/PageHeader.vue'
import PlatformAlerts from '../components/PlatformAlerts.vue'
import PlatformDialog from '../components/dialogs/PlatformDialog.vue'

import { useUxDrawersStore } from '@/stores/ux-drawers.js'

defineOptions({ name: 'FfLayoutImmersiveEditor' })

const drawersStore = useUxDrawersStore()
const { editorImmersiveDrawer } = storeToRefs(drawersStore)
</script>

<style lang="scss">
.ff-layout--immersive {
    height: 100vh;
    display: flex;
    flex-direction: column;

    &--wrapper {
        display: flex;
        flex-direction: row;
        flex: 1;
        height: calc(100vh - 60px);
        margin-top: 60px;
    }

    &--fullscreen &--wrapper {
        height: 100vh;
        margin-top: 0;
    }

    @media screen and (max-width: 1023px) {
        .ff-header {
            padding-left: 16px;
        }
    }
}
</style>
