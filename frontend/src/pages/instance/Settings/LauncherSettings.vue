<template>
    <FormHeading class="mb-6">Launcher Settings</FormHeading>
    <form class="space-y-6">
        <FormRow v-model="input.healthCheckInterval" type="number">
            Heath check interval (ms)
            <template #description>
                The interval at which the launcher will check the health of the instance. Default is 7500ms.
                It is not recommended to set this value lower than 5000ms.
            </template>
        </FormRow>

        <div class="space-x-4 whitespace-nowrap">
            <ff-button size="small" :disabled="!unsavedChanges" @click="saveSettings()">Save settings</ff-button>
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
            await InstanceApi.updateInstance(this.project.id, { launcherSettings })
            this.$emit('instance-updated')
            alerts.emit('Instance successfully updated. Restart the instance to apply the changes.', 'confirmation')
        }
    }
}
</script>
