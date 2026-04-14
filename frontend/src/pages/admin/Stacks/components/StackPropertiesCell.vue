<template>
    <div>
        <div v-for="(value, key) in settings.stacks.properties" :key="key">
            <div class="font-medium">{{ value.label }}</div>
            <div class="pl-2">{{ properties[key] }}</div>
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
