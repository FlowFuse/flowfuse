<template>
    <div v-if="device.ownerType == 'application'">
        <form class="space-y-6 max-w-2xl" @submit.prevent>
            <FormHeading>
                <template #default>
                    Editor
                </template>
            </FormHeading>
            <FormRow v-model="input.nodeRedVersion" type="input" :error="errors.nodeRedVersion" placeholder="latest">
                Node-RED Version
                <template #description>Clear this field to use the Node-RED version specified in the device's active snapshot. Defaults to 'latest' if the snapshot does not specify a version.</template>
            </FormRow>

            <ff-button size="small" :disabled="!changed || hasErrors" @click="save">Save Settings</ff-button>
        </form>
    </div>
    <div v-else>
        Only available to Application bound instances, Instance bound Devices will inherit from the Instance.
    </div>
</template>

<script>

import SemVer from 'semver'
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
            const nrv = this.input.nodeRedVersion
            const validVersions = ['', 'latest', 'next', this.initial.nodeRedVersion]
            if (!validVersions.includes(nrv)) {
                this.errors.nodeRedVersion = SemVer.valid(nrv) ? '' : 'Invalid version'
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
            settings.editor = {
                nodeRedVersion: this.input.nodeRedVersion ? this.input.nodeRedVersion : undefined
            }
            deviceApi.updateSettings(this.device.id, settings)
            this.$emit('device-updated')
            alerts.emit('Device settings successfully updated.', 'confirmation', 6000)
            this.initial.nodeRedVersion = this.input.nodeRedVersion
        }
    }
}
</script>
