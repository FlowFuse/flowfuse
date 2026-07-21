<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Dashboards">
                <template #context>
                    A list of Node-RED instances with Dashboards belonging to this Team.
                </template>
            </ff-page-header>
        </template>
        <div class="flex-1 flex flex-col overflow-auto">
            <ff-loading v-if="loading && instances.length === 0" message="Loading Dashboards..." />
            <ff-data-table
                v-else-if="instances.length"
                data-el="dashboards-table"
                :columns="columns"
                :rows="instances"
                :show-search="true"
                search-placeholder="Search Dashboards..."
                :rows-selectable="true"
                @row-selected="openDashboard"
            />
            <EmptyState v-else>
                <template #img>
                    <img src="../../../images/empty-states/team-instances.png">
                </template>
                <template #header>There are no dashboards in this team.</template>
                <template #message>
                    <p>Dashboards appear here once an instance has the Dashboard installed.</p>
                </template>
            </EmptyState>
        </div>
        <template v-if="!statusChannelLive">
            <InstanceStatusPolling
                v-for="instance in instances"
                :key="instance.id"
                :instance="instance"
                @instance-updated="instanceUpdated"
            />
        </template>
    </ff-page>
</template>

<script setup lang="ts">
import { markRaw, onMounted } from 'vue'

import EmptyState from '@/components/EmptyState.vue'
import InstanceStatusPolling from '@/components/InstanceStatusPolling.vue'
import { useNavigationHelper } from '@/composables/NavigationHelper.js'
import { useTeamDashboards } from '@/composables/TeamDashboards'
import ApplicationLink from '@/pages/application/components/cells/ApplicationLink.vue'
import DeploymentName from '@/pages/application/components/cells/DeploymentName.vue'
import SimpleTextCell from '@/pages/application/components/cells/SimpleTextCell.vue'
import InstanceStatusBadge from '@/pages/instance/components/InstanceStatusBadge.vue'

import { useContextStore } from '@/stores/context.js'

defineOptions({ name: 'TeamDashboards' })

const contextStore = useContextStore()
const { navigateTo } = useNavigationHelper()
const { instances, loading, statusChannelLive, fetchData, instanceUpdated } = useTeamDashboards()

const columns = [
    { label: 'Name', class: ['grow'], key: 'name', sortable: true, component: { is: markRaw(DeploymentName), map: { url: 'url' }, extraProps: { copyable: true } } },
    { label: 'Status', class: ['w-44'], component: { is: markRaw(InstanceStatusBadge), map: { instanceId: 'id', status: 'status' }, extraProps: { instanceType: 'instance' } } },
    { label: 'Application', class: ['grow-[0.25]'], key: 'application.name', sortable: true, component: { is: markRaw(ApplicationLink), map: { id: 'application.id', name: 'application.name' } } },
    { label: 'Last Updated', class: ['w-60'], key: 'flowLastUpdatedAt', sortable: true, component: { is: markRaw(SimpleTextCell), map: { text: 'flowLastUpdatedSince' } } }
]

function openDashboard (instance: { id: string }, event: MouseEvent) {
    navigateTo({
        name: 'team-dashboards-view',
        params: { team_slug: contextStore.team.slug, instanceId: instance.id }
    }, event)
}

onMounted(fetchData)
</script>
