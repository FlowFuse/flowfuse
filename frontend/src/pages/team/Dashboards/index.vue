<template>
    <ff-page>
        <template #header>
            <ff-page-header :title="$t('ui.dashboards')">
                <template #context>
                    {{ $t('ui.aListOfNodeRedInstancesWithDashboardsBelongingTo') }}
                </template>
            </ff-page-header>
        </template>
        <DashboardList scope="team" />
    </ff-page>
</template>

<script setup>
import DashboardList from '@/components/dashboard/DashboardList.vue'

defineOptions({ name: 'TeamDashboards' })
</script>
