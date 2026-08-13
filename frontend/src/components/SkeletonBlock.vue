<template>
    <div
        class="ff-skeleton-block animate-pulse"
        :style="{ width, height, borderRadius: radius }"
    />
</template>

<script setup>
defineProps({
    width: {
        type: String,
        default: '100%'
    },
    height: {
        type: String,
        default: '20px'
    },
    radius: {
        type: String,
        default: '4px'
    }
})
</script>

<style lang="scss" scoped>
.ff-skeleton-block {
    background-color: var(--ff-color-bg-emphasis);
}
</style>
