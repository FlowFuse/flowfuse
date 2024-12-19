<template>
    <form class="space-y-6">
        <TemplateSettingsEnvironment v-model="editable" :readOnly="!hasPermission('device:edit-env')" :editTemplate="false" :helpHeader="'Device Group Environment Variables'">
            <template #helptext>
                <p>Environment variables entered here will be merged with the environment variables defined in the member devices.</p>
                <p>
                    The following rules apply:
                    <ul class="list-disc pl-5">
                        <li>Values set in the Device take precedence over values set in the Device Group.</li>
                        <li>Removing a device from the group will remove these variables from the device.</li>
                        <li>The devices environment variables are never modified, they are only merged at runtime.</li>
                    </ul>
                </p>
                <p>Updating these environment variables will cause devices in the group to be restarted when a change is detected.</p>
            </template>
        </TemplateSettingsEnvironment>
        <div class="ff-banner ff-banner-info w-full max-w-5xl">
            <span>
                <ExclamationCircleIcon class="ff-icon mr-2" />
                <span class="relative top-0.5">Note: Updating environment variables can cause devices in the group to be restarted.</span>
            </span>
        </div>
        <div v-if="hasPermission('device:edit-env')" class="space-x-4 whitespace-nowrap">
            <ff-button :disabled="!unsavedChanges || hasError" @click="saveSettings()">Save Settings</ff-button>
        </div>
    </form>
</template>

<script>
import { ExclamationCircleIcon } from '@heroicons/vue/outline'
import { mapState } from 'vuex'

import applicationApi from '../../../../api/application.js'
import permissionsMixin from '../../../../mixins/Permissions.js'
import alerts from '../../../../services/alerts.js'
import dialog from '../../../../services/dialog.js'
import TemplateSettingsEnvironment from '../../../admin/Template/sections/Environment.vue'

/**
 * @typedef {Object} EnvVar
 * @property {string} name
 * @property {string} value
 */

export default {
    name: 'ApplicationDeviceGroupSettingsEnvironment',
    components: {
        ExclamationCircleIcon,
        TemplateSettingsEnvironment
    },
    mixins: [permissionsMixin],
    beforeRouteLeave: async function (_to, _from, next) {
        if (this.unsavedChanges) {
            const dialogOpts = {
                header: 'Unsaved changes',
                kind: 'danger',
                text: 'You have unsaved changes. Are you sure you want to leave?',
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
    props: {
        application: {
            type: Object,
            required: true
        },
        deviceGroup: {
            type: Object,
            required: true
        }
    },
    emits: ['device-group-updated'],
    data () {
        return {
            hasError: false,
            editable: {
                name: '',
                settings: {
                    /** @type {EnvVar[]} */ env: []
                },
                policy: {},
                changed: {
                    name: false,
                    description: false,
                    settings: {
                        /** @type {EnvVar[]} */ env: []
                    },
                    env: false,
                    policy: {}
                },
                errors: {}
            },
            original: {
                settings: {
                    /** @type {EnvVar[]} */ envMap: {}
                }
            },
            templateEnvValues: {}
        }
    },
    computed: {
        ...mapState('account', ['teamMembership']),
        unsavedChanges () {
            return this.editable.changed.env
        }
    },
    watch: {
        deviceGroup: 'getSettings',
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
                this.editable.changed.env = changed
            }
        }
    },
    mounted () {
        this.getSettings()
    },
    methods: {
        getSettings: async function () {
            if (this.deviceGroup) {
                this.original.settings.envMap = {}
                this.editable.settings.env = []
                const settings = this.deviceGroup.settings
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
            await applicationApi.updateDeviceGroupSettings(this.application.id, this.deviceGroup.id, settings)
            this.$emit('device-group-updated')
            alerts.emit('Device Group settings successfully updated. NOTE: changes will be applied to the devices in the group once they restart.', 'confirmation', 6000)
        }
    }
}
</script>
