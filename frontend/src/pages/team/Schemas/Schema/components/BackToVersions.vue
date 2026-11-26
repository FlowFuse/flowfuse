<template>
    <ff-button kind="tertiary" :to="{ name: 'team-schema-versions' }" data-action="back-to-versions">
        <template #icon-left><ChevronLeftIcon /></template>
        All versions
    </ff-button>
</template>

<script setup lang="ts">
import { ChevronLeftIcon } from '@heroicons/vue/24/outline'

defineOptions({ name: 'BackToVersions' })
</script>
