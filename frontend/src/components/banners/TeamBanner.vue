<template>
    <div v-if="visible" class="ff-banner ff-banner-info" data-el="banner-team-type">
        <span class="flex items-center">
            <InformationCircleIcon class="ff-icon mr-2 shrink-0" />
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span v-html="html" />
        </span>
        <XMarkIcon v-if="dismissible" class="ff-icon cursor-pointer shrink-0" @click="dismiss" />
    </div>
</template>

<script setup lang="ts">
import { InformationCircleIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { computed } from 'vue'

import { sanitize } from '@/composables/strings/String.js'
import { useUxStore } from '@/stores/ux.js'

const props = defineProps<{ team: { id: string, type: { properties: { teamBanner?: string, teamBannerDismissible?: boolean } } } }>()

const uxStore = useUxStore()

const banner = computed(() => props.team.type.properties.teamBanner)
const dismissible = computed(() => props.team.type.properties.teamBannerDismissible !== false)
const html = computed(() => banner.value ? sanitize(banner.value, { targetBlank: true }) : '')
const visible = computed(() => !!html.value && !(dismissible.value && uxStore.dismissedTeamBanners[props.team.id] === banner.value))

function dismiss () {
    uxStore.dismissTeamBanner(props.team.id, banner.value)
}
</script>
