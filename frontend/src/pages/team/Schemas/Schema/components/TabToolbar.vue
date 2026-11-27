<template>
    <!-- The row above a schema tab's content. Every tab's row is the same height, so the content below starts at the same place on each. -->
    <div class="tab-toolbar flex flex-wrap items-center justify-between gap-4" data-el="schema-tab-toolbar">
        <div class="flex flex-wrap items-center gap-3">
            <slot />
        </div>
        <div class="flex flex-wrap items-center gap-2">
            <slot name="tools" />
        </div>
    </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'TabToolbar' })
</script>

<style scoped>
/* As tall as an outlined button, the tallest control a row holds. A row whose controls are shorter, or that has none, keeps to it too. */
.tab-toolbar {
    min-height: 34px;
}
</style>
