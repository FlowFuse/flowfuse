<template>
    <!-- The row above a schema tab's content. It is as tall as the controls in it, which are the same size on every tab. -->
    <div class="flex flex-wrap items-center justify-between gap-4" data-el="schema-tab-toolbar">
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
