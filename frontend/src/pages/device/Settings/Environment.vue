<template>
    <form class="space-y-6">
        <TemplateSettingsEnvironment v-model="editable" :editTemplate="false" />
        <div class="space-x-4 whitespace-nowrap">
            <ff-button size="small" :disabled="!unsavedChanges" @click="saveSettings()">Save Settings</ff-button>
        </div>
    </form>
</template>

<script>
import deviceApi from '@/api/devices'
import TemplateSettingsEnvironment from '../../admin/Template/sections/Environment'

export default {
    name: 'DeviceSettingsEnvironment',
    props: ['device'],
    emits: ['device-updated'],
    watch: {
        device: 'getSettings',
        'editable.settings.env': {
            deep: true,
            handler (v) {
                let changed = true
                // let originalCount = 0

                this.editable.settings.env.forEach(field => {
                    if (/^add/.test(field.index)) {
                        changed = true
                    } else {
                        // originalCount++
                        console.log(this.original.settings)
                        // if (this.original.settings.envMap[field.name]) {
                        //     const original = this.original.settings.envMap[field.name]
                        //     if (original.index !== field.index) {
                        //         changed = true
                        //     } else if (original.name !== field.name) {
                        //         changed = true
                        //     } else if (original.value !== field.value) {
                        //         changed = true
                        //     }
                        // } else {
                        //     changed = true
                        // }
                    }
                })
                // if (originalCount !== this.original.settings.env.length) {
                //     changed = true
                // }

                this.unsavedChanges = changed
            }
        }
    },
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
    },
    mounted () {
        this.getSettings()
    },
    methods: {
        getSettings: async function () {
            if (this.device) {
                const settings = await deviceApi.getSettings(this.device.id)
                console.log(settings)
                settings.settings.env.forEach(envVar => {
                    this.editable.settings.env.push(Object.assign({}, envVar))
                    this.original.settings.env.push(Object.assign({}, envVar))
                    this.original.settings.envMap[envVar.name] = envVar
                })
            }
        },
        saveSettings: async function () {
            console.log('save settings')
            const settings = {
                env: []
            }
            this.editable.settings.env.forEach(field => {
                settings.env.push({
                    name: field.name,
                    value: field.value
                })
            })
            deviceApi.updateSettings(this.device.id, { settings })
            this.$emit('deviceUpdated')
        }
    }
}
</script>
