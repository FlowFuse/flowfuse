<template>
    <div class="ff--immersive-editor-wrapper dashboards-viewer" :class="{ resizing: isResizing }" data-el="dashboards-viewer">
        <DashboardDrawer :home-route="homeRoute" @resizing="v => isResizing = v">
            <ff-loading v-if="loading && instances.length === 0" message="Loading Dashboards..." />
            <template v-else-if="instances.length">
                <div class="dashboards-viewer--search">
                    <ff-text-input
                        v-model="searchTerm"
                        class="ff-data-table--search"
                        data-form="search-dashboards"
                        placeholder="Search dashboards..."
                    >
                        <template #icon>
                            <MagnifyingGlassIcon />
                        </template>
                    </ff-text-input>
                </div>
                <ul ref="listRef" class="dashboards-viewer--list">
                    <li
                        v-for="instance in visibleInstances"
                        :key="instance.id"
                        class="dashboards-viewer--list-item"
                        :class="{ selected: instance.id === selectedId }"
                        data-el="dashboard-list-item"
                        @click="selectDashboard(instance.id)"
                    >
                        <span class="dashboards-viewer--list-item-name">{{ instance.name }}</span>
                        <InstanceStatusBadge :status="instance.status" :instanceId="instance.id" instanceType="instance" />
                    </li>
                    <li v-if="visibleInstances.length === 0" class="dashboards-viewer--list-empty">
                        No dashboards match "{{ searchTerm }}".
                    </li>
                </ul>
            </template>
        </DashboardDrawer>

        <div class="ff-layout--immersive--content dashboards-viewer--content">
            <DashboardView v-if="selectedInstance" :instance="selectedInstance" :disable-events="isResizing" />
            <DrawerTrigger :is-hidden="drawerOpen" side="right" @toggle="drawersStore.toggleEditorImmersiveDrawer" />
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
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
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

const route = useRoute()
const router = useRouter()
const contextStore = useContextStore()
const drawersStore = useUxDrawersStore()

const { context, fetch, viewerRouteName, homeRoute, ensureContext } = useDashboardScope(route.meta.scope as string)
const { instances, instancesMap, loading, statusChannelLive, fetchData, instanceUpdated } = useDashboards(fetch)

const selectedId = ref<string | null>(null)
const isResizing = ref(false)
const searchTerm = ref('')
const listRef = ref<HTMLElement | null>(null)

const drawerOpen = computed(() => drawersStore.editorImmersiveDrawer.state)
const selectedInstance = computed(() => instancesMap.value.get(selectedId.value) || null)

const sortedInstances = computed(() => [...instances.value].sort((a, b) => (a.name || '').localeCompare(b.name || '')))
const visibleInstances = computed(() => {
    const term = searchTerm.value.trim().toLowerCase()
    if (!term) return sortedInstances.value
    return sortedInstances.value.filter(instance =>
        (instance.name || '').toLowerCase().includes(term) ||
        (instance.id || '').toLowerCase().includes(term)
    )
})

function selectDashboard (id) {
    selectedId.value = id
    if (route.params.instanceId !== id) {
        router.replace({ name: viewerRouteName, params: { ...route.params, instanceId: id } })
    }
}

function scrollSelectedIntoView () {
    nextTick(() => {
        listRef.value?.querySelector('.dashboards-viewer--list-item.selected')?.scrollIntoView({ block: 'center' })
    })
}

function resolveSelection () {
    if (instancesMap.value.size === 0) {
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
        selectDashboard(sortedInstances.value[0].id)
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

onMounted(async () => {
    ensureContext()
    contextStore.setIsImmersive(true)
    drawersStore.closeRightDrawer({ preserveExpertState: true })
    await fetchData()
    scrollSelectedIntoView()
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

.dashboards-viewer--search {
    position: sticky;
    top: 0;
    z-index: 1;
    padding: 12px 12px 8px;
    background: var(--ff-color-bg-app);
}

.dashboards-viewer--list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0 12px 12px;
}

.dashboards-viewer--list-empty {
    padding: 8px 12px;
    color: var(--ff-color-text-subtle);
    font-size: 0.875rem;
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
