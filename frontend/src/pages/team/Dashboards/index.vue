<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Dashboards">
                <template #context>
                    A list of Node-RED instances with Dashboards belonging to this Team.
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
