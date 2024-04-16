<template>
    <form class="space-y-6">
        <TemplateSettingsEnvironment :readOnly="!hasPermission('device:edit-env')" v-model="editable" :editTemplate="false" />
        <div v-if="hasPermission('device:edit-env')" class="space-x-4 whitespace-nowrap">
            <ff-button size="small" :disabled="!unsavedChanges || hasError" @click="saveSettings()">Save Settings</ff-button>
        </div>
    </form>
</template>

<script>
import { mapState } from 'vuex'

import deviceApi from '../../../api/devices.js'
import permissionsMixin from '../../../mixins/Permissions.js'
import alerts from '../../../services/alerts.js'
import dialog from '../../../services/dialog.js'
import TemplateSettingsEnvironment from '../../admin/Template/sections/Environment.vue'

export default {
    name: 'DeviceSettingsEnvironment',
    props: ['device'],
    emits: ['device-updated'],
    mixins: [permissionsMixin],
    beforeRouteLeave: async function (_to, _from, next) {
        if (this.unsavedChanges) {
            const dialogOpts = {
                header: 'Unsaved changes',
                kind: 'danger',
                html: '<p>You have unsaved changes. Are you sure you want to leave?</p>',
                confirmLabel: 'Yes, lose changes'
            }
            const answer = await dialog.showAsync(dialogOpts)
            if (answer === 'confirm') {
                next()
            } else {
                next(false)
            }
        } else {
            next()
        }
    },
    watch: {
        device: 'getSettings',
        'editable.settings.env': {
            deep: true,
            handler (v) {
                let changed = false
                let error = false

                this.editable.settings?.env.forEach(field => {
                    // if we do not recognise the env var name from our original settings,
                    // or if we do recognise it, but the value is different
                    if (!this.original.settings.envMap[field.name] || field.value !== this.original.settings.envMap[field.name].value) {
                        changed = true
                    }
                    // there is an issue with he key/value
                    if (field.error) {
                        error = true
                    }
                })

                // some env vars have been deleted
                if (this.editable.settings.env.length !== Object.keys(this.original.settings.envMap).length) {
                    changed = true
                }

                this.hasError = error
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
            hasError: false,
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
            original: {
                settings: {
                    envMap: {}
                }
            },
            templateEnvValues: {}
        }
    },
    computed: {
        ...mapState('account', ['teamMembership'])
    },
    mounted () {
        this.getSettings()
    },
    methods: {
        getSettings: async function () {
            if (this.device) {
                this.original.settings.envMap = {}
                this.editable.settings.env = []
                const settings = await deviceApi.getSettings(this.device.id)
                settings.env?.forEach(envVar => {
                    this.editable.settings.env.push(Object.assign({}, envVar))
                    // make a map of the key:value so it's easier to check for changes
                    this.original.settings.envMap[envVar.name] = envVar
                })
            }
        },
        saveSettings: async function () {
            const settings = {
                env: []
            }
            this.editable.settings.env.forEach(field => {
                settings.env.push({
                    name: field.name,
                    value: field.value
                })
            })
            deviceApi.updateSettings(this.device.id, settings)
            this.$emit('device-updated')
            alerts.emit('Device settings successfully updated. NOTE: changes will be applied once the device restarts.', 'confirmation', 6000)
        }
    }
}
</script>
