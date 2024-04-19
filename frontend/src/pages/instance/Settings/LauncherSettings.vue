<template>
    <FormHeading class="mb-6">Launcher Settings</FormHeading>
    <form class="space-y-6" data-el="launcher-settings-form">
        <FormRow v-model="input.healthCheckInterval" type="number">
            Health check interval (ms)
            <template #description>
                The interval at which the launcher will check the health of Node-RED. Flows that perform CPU intensive work may require to increase this from the default of 7500ms.
                It is not recommended to set this value lower than 5000ms.
            </template>
        </FormRow>

        <div class="space-x-4 whitespace-nowrap">
            <ff-button size="small" :disabled="!unsavedChanges" data-action="save-settings" @click="saveSettings()">Save settings</ff-button>
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
        project: 'getSettings'
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
        getSettings: function () {
            this.original.healthCheckInterval = this.project?.launcherSettings?.healthCheckInterval
            this.input.healthCheckInterval = this.project?.launcherSettings.healthCheckInterval
        },
        async saveSettings () {
            const launcherSettings = {
                healthCheckInterval: this.input.healthCheckInterval
            }
            try {
                await InstanceApi.updateInstance(this.project.id, { launcherSettings })
                this.$emit('instance-updated')
                alerts.emit('Instance successfully updated. Restart the instance to apply the changes.', 'confirmation')
            } catch (error) {
                if (error.response?.data?.code === 'invalid_heathCheckInterval') {
                    alerts.emit('Invalid health check interval. Please enter a number 5000 or greater', 'warning')
                } else {
                    alerts.emit('Failed to update instance settings. Please try again.', 'warning')
                }
            }
        }
    }
}
</script>
