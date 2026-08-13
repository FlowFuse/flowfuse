<template>
    <div class="dashboards-list flex-1 flex flex-col overflow-auto" data-el="dashboards-list">
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
                <img src="@/images/empty-states/team-instances.png">
            </template>
            <template #header>There are no dashboards {{ scope === 'application' ? 'in this application' : 'in this team' }}.</template>
            <template #message>
                <p>Dashboards appear here once an instance has the Dashboard installed.</p>
            </template>
        </EmptyState>
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
import { computed, markRaw, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'

import EmptyState from '@/components/EmptyState.vue'
import InstanceStatusPolling from '@/components/InstanceStatusPolling.vue'
import { useDashboardScope, useDashboards } from '@/composables/Dashboards'
import { useNavigationHelper } from '@/composables/NavigationHelper.js'
import ApplicationLink from '@/pages/application/components/cells/ApplicationLink.vue'
import DeploymentName from '@/pages/application/components/cells/DeploymentName.vue'
import SimpleTextCell from '@/pages/application/components/cells/SimpleTextCell.vue'
import InstanceStatusBadge from '@/pages/instance/components/InstanceStatusBadge.vue'

defineOptions({ name: 'DashboardList' })

const props = defineProps({
    scope: {
        type: String,
        default: 'team'
    }
})

const route = useRoute()
const { navigateTo } = useNavigationHelper()
const { context, fetch, viewerRouteName } = useDashboardScope(props.scope)
const { instances, loading, statusChannelLive, fetchData, instanceUpdated } = useDashboards(fetch)

const columns = computed(() => [
    { label: 'Name', class: ['grow'], key: 'name', sortable: true, component: { is: markRaw(DeploymentName), map: { url: 'url' }, extraProps: { copyable: true } } },
    { label: 'Status', class: ['w-44'], component: { is: markRaw(InstanceStatusBadge), map: { instanceId: 'id', status: 'status' }, extraProps: { instanceType: 'instance' } } },
    ...(props.scope !== 'application'
        ? [{ label: 'Application', class: ['grow-[0.25]'], key: 'application.name', sortable: true, component: { is: markRaw(ApplicationLink), map: { id: 'application.id', name: 'application.name' } } }]
        : []),
    { label: 'Last Updated', class: ['w-60'], key: 'flowLastUpdatedAt', sortable: true, component: { is: markRaw(SimpleTextCell), map: { text: 'flowLastUpdatedSince' } } }
])

function openDashboard (instance: { id: string }, event: MouseEvent) {
    navigateTo({ name: viewerRouteName, params: { ...route.params, instanceId: instance.id } }, event)
}

watch(context, fetchData)
onMounted(fetchData)
</script>
