<template>
    <slot v-if="loading" name="loading">
        <ff-loading />
    </slot>
    <slot v-else />
</template>

<script setup lang="ts">
import { onUnmounted, watch } from 'vue'

import { useUxLoadingStore } from '@/stores/ux-loading.js'

const props = withDefaults(defineProps<{
    loading?: boolean
    loaderKey: string
}>(), {
    loading: false
})

const uxLoading = useUxLoadingStore()

watch(() => props.loading, (isLoading) => {
    if (isLoading) {
        uxLoading.setPageLoader(props.loaderKey)
    } else {
        uxLoading.clearPageLoader(props.loaderKey)
    }
}, { immediate: true })

onUnmounted(() => uxLoading.clearPageLoader(props.loaderKey))
</script>
