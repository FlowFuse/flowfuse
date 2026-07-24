<template>
    <dashboard-view :instance="instance" />
</template>

<script>

import DashboardView from '@/components/dashboard/index.vue'

export default {
    name: 'InstanceDashboard',
    components: { DashboardView },
    inheritAttrs: false,
    props: {
        instance: {
            required: true,
            type: Object
        }
    },
}
</script>
