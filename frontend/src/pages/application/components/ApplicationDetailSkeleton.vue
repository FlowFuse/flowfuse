<template>
    <div class="ff-application-detail-skeleton" data-el="application-detail-skeleton">
        <div class="ff-application-detail-skeleton--header">
            <SkeletonBlock width="240px" height="20px" />
            <div class="ff-application-detail-skeleton--tabs">
                <SkeletonBlock v-for="n in tabCount" :key="n" width="88px" height="18px" />
            </div>
        </div>
        <div class="ff-application-detail-skeleton--body">
            <div class="ff-application-detail-skeleton--section-head">
                <div class="ff-application-detail-skeleton--section-title">
                    <SkeletonBlock width="180px" height="22px" />
                    <SkeletonBlock width="340px" height="14px" />
                </div>
                <SkeletonBlock width="130px" height="36px" radius="6px" />
            </div>
            <SkeletonBlock height="40px" radius="6px" />
            <div class="ff-application-detail-skeleton--table">
                <SkeletonBlock v-for="n in rowCount" :key="n" height="52px" radius="4px" />
            </div>
        </div>
    </div>
</template>

<script setup>
import SkeletonBlock from '@/components/SkeletonBlock.vue'

defineProps({
    tabCount: {
        type: Number,
        default: 10
    },
    rowCount: {
        type: Number,
        default: 6
    }
})
</script>

<style lang="scss" scoped>
.ff-application-detail-skeleton {
    display: flex;
    flex-direction: column;
    width: 100%;

    &--header {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 16px 12px;
        border-bottom: 1px solid var(--ff-color-border-strong);

        @media (min-width: 768px) {
            padding-left: 24px;
            padding-right: 24px;
        }
    }

    &--tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 24px;
    }

    &--body {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 12px;

        @media (min-width: 768px) {
            padding: 24px;
        }
    }

    &--section-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
    }

    &--section-title {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    &--table {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 4px;
    }
}
</style>
