<template>
    <ff-page>
        <template #header>
            <ff-page-header>
                <template #breadcrumbs>
                    <ff-nav-breadcrumb>Home</ff-nav-breadcrumb>
                </template>
            </ff-page-header>
        </template>

        <div class="ff-expert-home" data-el="expert-home">
            <HomeGreeting />
        </div>
    </ff-page>
</template>

<script setup>
import { onBeforeUnmount, onMounted } from 'vue'

import HomeGreeting from './components/HomeGreeting.vue'

import { useContextStore } from '@/stores/context.js'
import { useProductExpertStore } from '@/stores/product-expert.js'
import { useUxDrawersStore } from '@/stores/ux-drawers.js'

defineOptions({ name: 'TeamHomeExpert' })

const contextStore = useContextStore()
const expertStore = useProductExpertStore()
const drawersStore = useUxDrawersStore()

onMounted(() => {
    drawersStore.suppressExpertDrawer()
    if (drawersStore.rightDrawer.state) {
        drawersStore.closeRightDrawer({ preserveExpertState: true })
    }
})

onBeforeUnmount(() => {
    drawersStore.releaseExpertDrawer()
    if (!contextStore.isImmersiveEditor && drawersStore.rightDrawer.expertState.open) {
        expertStore.openAssistantDrawer({ openPinned: drawersStore.rightDrawer.expertState.pinned })
    }
})
</script>

<style scoped lang="scss">
.ff-expert-home {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    padding: 24px 22px 28px;
    container-type: inline-size;
    container-name: expert-home;
}
</style>
