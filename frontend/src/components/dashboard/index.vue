<template>
    <div class="instance-dashboard" data-el="instance-dashboard">
        <EmptyState v-if="!isRunning">
            <template #img>
                <img src="@/images/empty-states/no-access_dashboard-only.png" alt="no-dashboard">
            </template>
            <template #header>Dashboard not available</template>
            <template #message>
                <p>The instance must be running to view the dashboard.</p>
            </template>
        </EmptyState>
        <iframe v-else :src="dashboardURL" />
    </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'

import EmptyState from '@/components/EmptyState.vue'
import { removeSlashes } from '@/composables/strings/String.js'

defineOptions({ name: 'DashboardView' })

const props = defineProps<{
    instance: Record<string, any>
}>()

const router = useRouter()

const isRunning = computed(() => props.instance?.meta?.state === 'running')

const hasDashboard = computed(() => !!props.instance?.settings?.dashboard2UI)

const dashboardURL = computed(() => {
    if (!isRunning.value || !hasDashboard.value) {
        return null
    }
    const baseURL = new URL(removeSlashes(props.instance.url, false, true))
    baseURL.pathname = removeSlashes(props.instance.settings.dashboard2UI, true, false)
    return baseURL.toString()
})

watch(hasDashboard, (value) => {
    if (!value) {
        router.push({ name: 'instance-overview', params: { id: props.instance.id } })
    }
}, { immediate: true })
</script>

<style scoped>
.instance-dashboard {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
}

.instance-dashboard iframe {
    flex: 1;
    width: 100%;
    border: none;
}
</style>
