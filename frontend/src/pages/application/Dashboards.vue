<template>
    <div class="flex-1 flex flex-col" data-el="application-dashboards">
        <DashboardList scope="application" />
    </div>
</template>

<script setup>
import DashboardList from '@/components/dashboard/DashboardList.vue'

defineOptions({ name: 'ApplicationDashboards' })
</script>
