<template>
    <component :is="variant" v-if="team" />
</template>

<script setup>
import { computed } from 'vue'

import Dashboard from '@/pages/team/Home/Dashboard/index.vue'
import Expert from '@/pages/team/Home/Expert/index.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'

defineOptions({ name: 'TeamHomeSwitch' })

const contextStore = useContextStore()
const settingsStore = useAccountSettingsStore()

const team = computed(() => contextStore.team)
const variant = computed(() => (
    settingsStore.featuresCheck?.isExpertAssistantFeatureEnabled ? Expert : Dashboard
))
</script>
