<template>
    <form class="space-y-6">
        <TemplateSettingsEnvironment v-model="editable" :editTemplate="false" />
        <div class="space-x-4 whitespace-nowrap">
            <ff-button size="small" :disabled="!unsavedChanges" @click="saveSettings()">Save Settings</ff-button>
        </div>
    </form>
</template>

<script>

import TemplateSettingsEnvironment from '../../admin/Template/sections/Environment'

export default {
    name: 'DeviceSettingsEnvironment',
    props: ['device'],
    emits: ['device-updated'],
    watch: { },
    components: {
        TemplateSettingsEnvironment
    },
    data () {
        return {
            unsavedChanges: false,
            editable: {
                name: '',
                settings: { env: [] },
                policy: {},
                changed: {
                    name: false,
                    description: false,
                    settings: {},
                    policy: {}
                },
                errors: {}
            },
            original: {},
            templateEnvValues: {}
        }
    }
}
</script>
