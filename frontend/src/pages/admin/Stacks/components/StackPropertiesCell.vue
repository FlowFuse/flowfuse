<template>
    <div>
        <div v-for="(value, key) in settings.stacks.properties" :key="key">
            <div class="font-medium">{{ value.label }}</div>
            <div v-if="value === undefined" class="pl-2">{{ properties[key] }}</div>
            <div v-else class="pl-2">-</div>
        </div>
    </div>
</template>
<script>

import { mapState } from 'pinia'

import { useAccountSettingsStore } from '@/stores/account-settings.js'

export default {
    name: 'StackPropertiesCell',
    props: {
        properties: {
            type: Object,
            required: true
        }
    },
    computed: {
        ...mapState(useAccountSettingsStore, ['settings'])
    }
}
</script>
