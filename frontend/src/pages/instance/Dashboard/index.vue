<template>
    <dashboard-view :instance="instance" />
</template>

<script setup lang="ts">
import DashboardView from '@/components/dashboard/index.vue'

defineOptions({
    name: 'InstanceDashboard',
    inheritAttrs: false
})

defineProps<{
    instance: Record<string, any>
}>()
</script>
