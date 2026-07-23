<template>
    <div class="ff--immersive-editor-wrapper dashboards-viewer" :class="{ resizing: isResizing }" data-el="dashboards-viewer">
        <DashboardDrawer :home-route="homeRoute" @resizing="v => isResizing = v">
            <ff-loading v-if="loading && instances.length === 0" message="Loading Dashboards..." />
            <ul v-else-if="instances.length" class="dashboards-viewer--list">
                <li
                    v-for="instance in instances"
                    :key="instance.id"
                    class="dashboards-viewer--list-item"
                    :class="{ selected: instance.id === selectedId }"
                    data-el="dashboard-list-item"
                    @click="selectDashboard(instance.id)"
                >
                    <span class="dashboards-viewer--list-item-name">{{ instance.name }}</span>
                    <InstanceStatusBadge :status="instance.status" :instanceId="instance.id" instanceType="instance" />
                </li>
            </ul>
        </DashboardDrawer>

        <div class="ff-layout--immersive--content dashboards-viewer--content">
            <DashboardView v-if="selectedInstance" :instance="selectedInstance" :disable-events="isResizing" />
            <DrawerTrigger :is-hidden="drawerOpen" @toggle="drawersStore.toggleEditorImmersiveDrawer" />
        </div>

        <template v-if="!statusChannelLive">
            <InstanceStatusPolling
                v-for="instance in instances"
                :key="instance.id"
                :instance="instance"
                @instance-updated="instanceUpdated"
            />
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import InstanceStatusPolling from '@/components/InstanceStatusPolling.vue'
import DashboardView from '@/components/dashboard/index.vue'
import DashboardDrawer from '@/components/drawers/dashboard/DashboardDrawer.vue'
import DrawerTrigger from '@/components/immersive-editor/DrawerTrigger.vue'
import { useDashboardScope, useDashboards } from '@/composables/Dashboards'
import InstanceStatusBadge from '@/pages/instance/components/InstanceStatusBadge.vue'
import { useContextStore } from '@/stores/context.js'
import { useUxDrawersStore } from '@/stores/ux-drawers.js'

defineOptions({ name: 'DashboardViewer' })

const props = defineProps({
    scope: {
        type: String,
        default: 'team'
    }
})

const route = useRoute()
const router = useRouter()
const contextStore = useContextStore()
const drawersStore = useUxDrawersStore()

const { context, fetch, viewerRouteName, homeRoute, ensureContext } = useDashboardScope(props.scope)
const { instances, instancesMap, loading, statusChannelLive, fetchData, instanceUpdated } = useDashboards(fetch)

const selectedId = ref<string | null>(null)
const isResizing = ref(false)

const drawerOpen = computed(() => drawersStore.editorImmersiveDrawer.state)
const selectedInstance = computed(() => instancesMap.value.get(selectedId.value) || null)

function selectDashboard (id) {
    selectedId.value = id
    if (route.params.instanceId !== id) {
        router.replace({ name: viewerRouteName, params: { ...route.params, instanceId: id } })
    }
}

function resolveSelection () {
    const ids = Array.from(instancesMap.value.keys())
    if (ids.length === 0) {
        selectedId.value = null
        return
    }
    if (selectedId.value && instancesMap.value.has(selectedId.value)) {
        return
    }
    const paramId = route.params.instanceId as string
    if (paramId && instancesMap.value.has(paramId)) {
        selectedId.value = paramId
    } else {
        selectDashboard(ids[0])
    }
}

watch(instances, resolveSelection)
watch(context, fetchData)
watch(() => route.params, ensureContext, { deep: true })
watch(() => route.params.instanceId as string, id => {
    if (id && instancesMap.value.has(id)) {
        selectedId.value = id
    }
})

onMounted(() => {
    ensureContext()
    contextStore.setIsImmersive(true)
    fetchData()
})

onUnmounted(() => {
    contextStore.setIsImmersive(false)
})
</script>

<style scoped>
.dashboards-viewer {
    display: flex;
    flex-direction: row;
    flex: 1;
    height: 100%;
    width: 100%;
    overflow: hidden;
}

.dashboards-viewer--content {
    flex: 1;
    min-width: 0;
    height: 100%;
    position: relative;
}

.dashboards-viewer--list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px;
}

.dashboards-viewer--list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 40px;
    padding: 8px 12px;
    border-radius: 6px;
    color: var(--ff-color-text);
    cursor: pointer;
    transition: background-color 0.15s ease;

    &:hover {
        background: var(--ff-color-bg-surface-raised);
    }

    &.selected {
        background: var(--ff-color-bg-surface-raised);
    }

    &.selected .dashboards-viewer--list-item-name {
        font-weight: 600;
    }
}

.dashboards-viewer--list-item-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
