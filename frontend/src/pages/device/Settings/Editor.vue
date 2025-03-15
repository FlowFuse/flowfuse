<template>
    <div v-if="deviceOwnerType == 'application'">
        <form class="space-y-6 max-w-2xl" @submit.prevent>
            <FormHeading>
                <template #default>
                    Editor
                </template>
            </FormHeading>

            <!-- Node-RED Version -->
            <FormRow :error="errors.nodeRedVersion">
                Node-RED Version
                <template #description>
                    Clear this field to use the Node-RED version specified in the Remote Instance's active snapshot. Defaults to 'latest' if the snapshot does not specify a version.
                </template>
                <template #input>
                    <div class="flex flex-wrap">
                        <input v-model="input.nodeRedVersion" type="text" class="ff-input ff-text-input w-full" placeholder="latest">
                    </div>
                </template>
            </FormRow>
            <div class="ff-description !mt-0 max-w-sm italic">NOTE: {{ versionChangeFootnote }}</div>

            <!-- Save -->
            <ff-button size="small" :disabled="!changed || hasErrors" @click="save">Save Settings</ff-button>
        </form>
    </div>
    <div v-else>
        Only available to Application bound instances, Instance bound Devices will inherit from the Instance.
    </div>
</template>

<script>

import semver from 'semver'
import { mapState } from 'vuex'

import deviceApi from '../../../api/devices.js'
import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'
import permissionsMixin from '../../../mixins/Permissions.js'
import alerts from '../../../services/alerts.js'

export default {
    name: 'DeviceSettingsEditor',
    components: {
        FormHeading,
        FormRow
    },
    mixins: [permissionsMixin],
    props: {
        device: {
            type: Object,
            required: true
        }
    },
    emits: ['device-updated'],
    data () {
        return {
            input: {
                nodeRedVersion: ''
            },
            errors: {
                nodeRedVersion: ''
            },
            initial: {
                nodeRedVersion: ''
            },
            hasErrors: false
        }
    },
    computed: {
        ...mapState('account', ['teamMembership']),
        changed () {
            const changed = this.initial.nodeRedVersion !== this.input.nodeRedVersion
            return changed
        },
        deviceOwnerType: function () {
            return this.device?.ownerType || ''
        },
        versionChangeFootnote: function () {
            if (!this.device?.agentVersion || semver.lte(this.device.agentVersion, '2.4.0')) {
                return 'The device will be updated to the specified version the next time a snapshot is deployed'
            }
            return 'The device will be updated to the specified version and restarted upon saving the settings'
        }
    },
    watch: {
        'input.nodeRedVersion' () {
            this.validate()
        }
    },
    mounted () {
        this.getSettings()
    },
    methods: {
        validate: function () {
            this.errors.nodeRedVersion = ''
            this.hasErrors = false
            const nodeRedVersion = (this.input.nodeRedVersion || '').trim()
            const validVersions = ['', 'latest', 'next', this.initial.nodeRedVersion]
            if (!validVersions.includes(nodeRedVersion)) {
                this.errors.nodeRedVersion = semver.valid(nodeRedVersion) ? '' : 'Invalid version'
            }
            this.hasErrors = !!this.errors.nodeRedVersion
            return !this.hasErrors
        },
        getSettings: async function () {
            if (this.device) {
                const settings = await deviceApi.getSettings(this.device.id)
                if (settings.editor?.nodeRedVersion) {
                    this.input.nodeRedVersion = settings.editor.nodeRedVersion
                    this.initial.nodeRedVersion = settings.editor.nodeRedVersion
                }
            }
        },
        save: async function () {
            const settings = {} // await deviceApi.getSettings(this.device.id)
            const nodeRedVersion = (this.input.nodeRedVersion || '').trim() || undefined
            settings.editor = {
                nodeRedVersion
            }
            deviceApi.updateSettings(this.device.id, settings)
            this.$emit('device-updated')
            alerts.emit('Device settings successfully updated.', 'confirmation', 6000)
            this.initial.nodeRedVersion = this.input.nodeRedVersion
        }
    }
}
</script>
