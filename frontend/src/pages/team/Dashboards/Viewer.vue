<template>
    <div class="ff--immersive-editor-wrapper team-dashboards" :class="{ resizing: isResizing }" data-el="team-dashboards-viewer">
        <DashboardDrawer :home-route="homeRoute" @resizing="v => isResizing = v">
            <ff-loading v-if="loading && instances.length === 0" message="Loading Dashboards..." />
            <ul v-else-if="instances.length" class="team-dashboards--list">
                <li
                    v-for="instance in instances"
                    :key="instance.id"
                    class="team-dashboards--list-item"
                    :class="{ selected: instance.id === selectedId }"
                    data-el="dashboard-list-item"
                    @click="selectDashboard(instance.id)"
                >
                    <span class="team-dashboards--list-item-name">{{ instance.name }}</span>
                    <InstanceStatusBadge :status="instance.status" :instanceId="instance.id" instanceType="instance" />
                </li>
            </ul>
        </DashboardDrawer>

        <div class="ff-layout--immersive--content team-dashboards--content">
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
import DashboardDrawer from '@/components/immersive-editor/DashboardDrawer.vue'
import DrawerTrigger from '@/components/immersive-editor/DrawerTrigger.vue'
import { useTeamDashboards } from '@/composables/TeamDashboards'
import InstanceStatusBadge from '@/pages/instance/components/InstanceStatusBadge.vue'
import { useAccountStore } from '@/stores/account.js'
import { useContextStore } from '@/stores/context.js'
import { useUxDrawersStore } from '@/stores/ux-drawers.js'

defineOptions({ name: 'TeamDashboardViewer' })

const route = useRoute()
const router = useRouter()
const contextStore = useContextStore()
const drawersStore = useUxDrawersStore()

const { instances, instancesMap, loading, statusChannelLive, fetchData, instanceUpdated } = useTeamDashboards()

const selectedId = ref<string | null>(null)
const isResizing = ref(false)

const team = computed(() => contextStore.team)
const drawerOpen = computed(() => drawersStore.editorImmersiveDrawer.state)
const selectedInstance = computed(() => instancesMap.value.get(selectedId.value) || null)
const homeRoute = computed(() => {
    if (!team.value) return null
    return { name: 'team-dashboards', params: { team_slug: team.value.slug } }
})

function ensureTeam () {
    const slug = route.params.team_slug
    if (slug && contextStore.team?.slug !== slug) {
        useAccountStore().setTeam(slug)
    }
}

function selectDashboard (id) {
    selectedId.value = id
    if (route.params.instanceId !== id) {
        router.replace({ name: 'team-dashboards-view', params: { ...route.params, instanceId: id } })
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
watch(() => route.params.team_slug, ensureTeam)
watch(() => route.params.instanceId as string, id => {
    if (id && instancesMap.value.has(id)) {
        selectedId.value = id
    }
})

onMounted(() => {
    ensureTeam()
    contextStore.setIsImmersive(true)
    fetchData()
})

onUnmounted(() => {
    contextStore.setIsImmersive(false)
})
</script>

<style scoped>
.team-dashboards {
    display: flex;
    flex-direction: row;
    flex: 1;
    height: 100%;
    width: 100%;
    overflow: hidden;
}

.team-dashboards--content {
    flex: 1;
    min-width: 0;
    height: 100%;
    position: relative;
}

.team-dashboards--list {
    padding: 12px;
}

.team-dashboards--list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 5px;
    padding: 5px 10px;
    border-radius: 5px;
    color: var(--ff-color-text);
    cursor: pointer;
    transition: background-color 0.15s ease;

    &:hover {
        background: var(--ff-color-bg-surface-raised);
    }

    &.selected {
        background: var(--ff-color-accent-strong);
        color: var(--ff-color-text-on-brand);
    }
}

.team-dashboards--list-item-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
