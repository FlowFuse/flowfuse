<template>
    <ul class="ff-applications-list" data-el="applications-list-skeleton">
        <li v-for="n in count" :key="n" class="ff-application-skeleton">
            <div class="ff-application-skeleton--header">
                <SkeletonBlock width="200px" height="20px" />
                <div class="ff-application-skeleton--badges">
                    <SkeletonBlock v-for="b in 5" :key="b" width="34px" height="22px" radius="6px" />
                </div>
            </div>
            <div class="ff-application-skeleton--body">
                <div v-for="section in 2" :key="section" class="ff-application-skeleton--section">
                    <SkeletonBlock width="120px" height="14px" />
                    <div class="ff-application-skeleton--tiles">
                        <SkeletonBlock v-for="tile in 3" :key="tile" height="68px" radius="6px" />
                    </div>
                </div>
            </div>
        </li>
    </ul>
</template>

<script setup>
import SkeletonBlock from '@/components/SkeletonBlock.vue'

defineProps({
    count: {
        type: Number,
        default: 4
    }
})
</script>

<style lang="scss" scoped>
.ff-application-skeleton {
    border: 1px solid var(--ff-color-border-strong);
    border-radius: 6px;
    margin-bottom: 12px;
    background-color: var(--ff-color-bg-app);

    &--header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        padding: 12px;
    }

    &--badges {
        display: flex;
        gap: 6px;
    }

    &--body {
        display: flex;
        flex-wrap: wrap;
    }

    &--section {
        flex: 1;
        min-width: 240px;
        padding: 12px;
        padding-top: 6px;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    &--tiles {
        display: flex;
        gap: 8px;

        :deep(.ff-skeleton-block) {
            flex: 1;
        }
    }
}
</style>
