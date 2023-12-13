<template>
    <form class="space-y-4 max-w-2xl" @submit.prevent>
        <FormHeading>Email Alerts</FormHeading>
        <p>
            You can enable alerts to be sent to you via email on the following Audit Log entries
        </p>
        <div class="flex flex-col, sm:flex-row">
            <div class="space-y-4 w-full sm:mr-8">
                <FormRow v-model="crashed" type="checkbox">
                    Node-RED has crashed
                    <template #append><ChangeIndicator /></template>
                </FormRow>
            </div>
        </div>
        <div class="flex flex-col, sm:flex-row">
            <div class="space-y-4 w-full sm:mr-8">
                <FormRow v-model="safeMode" type="checkbox">
                    Node-RED has been placed in Safe Mode
                    <template #append><ChangeIndicator /></template>
                </FormRow>
            </div>
        </div>
        <FormHeading>Email Addresses</FormHeading>
        <ff-radio-group v-model="email" orientation="vertical" :options="emailOptions" />
        
        <div class="space-x-4 whitespace-nowrap">
            <ff-button size="small" :disabled="!unsavedChanges" @click="saveSettings()">Save settings</ff-button>
        </div>
    </form>
</template>

<script>
import { useRouter } from 'vue-router'

import { mapState } from 'vuex'

import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'
import permissionsMixin from '../../../mixins/Permissions.js'
import ChangeIndicator from '../../admin/Template/components/ChangeIndicator.vue'

export default {
    name: 'InstanceSettingsAlerts',
    components: {
        FormRow,
        FormHeading,
        ChangeIndicator
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
            unsavedChanges: false,
            mounted: false,
            crashed: false,
            safeMode: false,
            email: 'owners',
            editable: {
                name: '',
                settings: {},
                policy: {},
                errors: {}
            },
            original: {}
        }
    },
    computed: {
        ...mapState('account', ['team', 'teamMembership', 'features']),
        emailOptions () {
            return [
                {
                    label: 'Owners',
                    value: 'owners',
                    description: 'Email Team Owners'
                },
                {
                    label: 'Owners & Members',
                    value: 'both',
                    description: 'Email Team Owners and Members'
                },
                {
                    label: 'Members',
                    value: 'members',
                    description: 'Email Team Members'
                }
            ]
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
        getSettings: function () {
        },
        saveSettings: function () {
        }
    }
}
</script>
