<template>
    <FormHeading class="mb-6">Launcher Settings</FormHeading>
    <form class="space-y-6" data-el="launcher-settings-form">
        <FormRow v-model="input.healthCheckInterval" type="number" :error="errors.healthCheckInterval">
            Health check interval (ms)
            <template #description>
                The interval at which the launcher will check the health of Node-RED.
                Flows that perform CPU intensive work may need to increase this from the default of 7500ms.
            </template>
        </FormRow>

        <div class="space-x-4 whitespace-nowrap">
            <ff-button size="small" :disabled="!unsavedChanges || !validateFormInputs()" data-action="save-settings" @click="saveSettings()">Save settings</ff-button>
        </div>
    </form>
</template>

<script>

import { useRouter } from 'vue-router'

import { mapState } from 'vuex'

import InstanceApi from '../../../api/instances.js'
import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'
import permissionsMixin from '../../../mixins/Permissions.js'
import alerts from '../../../services/alerts.js'

export default {
    name: 'LauncherSettings',
    components: {
        FormRow,
        FormHeading
    },
    mixins: [permissionsMixin],
    inheritAttrs: false,
    props: {
        project: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-updated'],
    data () {
        return {
            mounted: false,
            original: {
                healthCheckInterval: null
            },
            input: {
                healthCheckInterval: null
            },
            errors: {
                healthCheckInterval: ''
            }

        }
    },
    computed: {
        ...mapState('account', ['team', 'teamMembership']),
        unsavedChanges: function () {
            return this.original.healthCheckInterval !== this.input.healthCheckInterval
        }
    },
    watch: {
        project: 'getSettings',
        'input.healthCheckInterval': function (value) {
            if (this.mounted) {
                this.validateFormInputs()
            }
        }
    },
    mounted () {
        this.checkAccess()
        this.getSettings()
        this.mounted = true
    },
    methods: {
        checkAccess: function () {
            if (!this.hasPermission('project:edit')) {
                useRouter().push({ replace: true, path: 'general' })
            }
        },
        validateFormInputs () {
            if (!this.unsavedChanges) {
                this.errors.healthCheckInterval = ''
            } else {
                const hci = parseInt(this.input.healthCheckInterval)
                if (isNaN(hci) || hci < 5000) {
                    this.errors.healthCheckInterval = 'Health check interval must be 5000 or greater'
                } else {
                    this.errors.healthCheckInterval = ''
                }
            }
            return !this.errors.healthCheckInterval
        },
        getSettings: function () {
            this.original.healthCheckInterval = this.project?.launcherSettings?.healthCheckInterval
            this.input.healthCheckInterval = this.project?.launcherSettings.healthCheckInterval
        },
        async saveSettings () {
            const launcherSettings = {
                healthCheckInterval: this.input.healthCheckInterval
            }
            if (!this.validateFormInputs()) {
                alerts.emit('Please correct the errors before saving.', 'error')
                return
            }
            await InstanceApi.updateInstance(this.project.id, { launcherSettings })
            this.$emit('instance-updated')
            alerts.emit('Instance successfully updated. Restart the instance to apply the changes.', 'confirmation')
        }
    }
}
</script>
