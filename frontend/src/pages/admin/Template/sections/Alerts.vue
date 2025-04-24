<template>
    <form class="space-y-4" @submit.prevent>
        <FormHeading>Email Alerts</FormHeading>
        <p>
            You can enable alerts to be sent to you via email on the following Audit Log entries
        </p>
        <FeatureUnavailableToTeam v-if="!ffAuthFeatureAvailable" featureName="Email Alerts" />
        <div class="flex flex-col, sm:flex-row sm:ml-4">
            <div class="space-y-4 w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.emailAlerts_crash" type="checkbox" :disabled="!editTemplate && !editable.policy.emailAlerts_crash">
                    Node-RED has crashed
                    <template #append><ChangeIndicator :value="editable.changed.settings.emailAlerts_crash" /></template>
                </FormRow>
            </div>
            <LockSetting v-model="editable.policy.emailAlerts_crash" class="flex justify-end flex-col" :editTemplate="editTemplate" :changed="editable.changed.policy.emailAlerts_crash" />
        </div>
        <div class="flex flex-col, sm:flex-row sm:ml-4">
            <div class="space-y-4 w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.emailAlerts_safe" type="checkbox" :disabled="!editTemplate && !editable.policy.emailAlerts_safe">
                    Node-RED has been placed in Safe Mode
                    <template #append><ChangeIndicator :value="editable.changed.settings.emailAlerts_safe" /></template>
                </FormRow>
            </div>
            <LockSetting v-model="editable.policy.emailAlerts_safe" class="flex justify-end flex-col" :editTemplate="editTemplate" :changed="editable.changed.policy.emailAlerts_safe" />
        </div>
        <div class="flex flex-col, sm:flex-row sm:ml-4">
            <div class="space-y-4 w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.emailAlerts_resource_cpu" type="checkbox" :disabled="!editTemplate && !editable.policy.emailAlerts_resource_cpu">
                    Node-RED CPU usage has exceeded 75% for 5 minutes
                    <template #append><ChangeIndicator :value="editable.changed.settings.emailAlerts_resource_cpu" /></template>
                </FormRow>
            </div>
            <LockSetting v-model="editable.policy.emailAlerts_resource_cpu" class="flex justify-end flex-col" :editTemplate="editTemplate" :changed="editable.changed.policy.emailAlerts_resource_cpu" />
        </div>
        <div class="flex flex-col, sm:flex-row sm:ml-4">
            <div class="space-y-4 w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.emailAlerts_resource_memory" type="checkbox" :disabled="!editTemplate && !editable.policy.emailAlerts_resource_memory">
                    Node-RED memory usage has exceeded 75% for 5 minutes
                    <template #append><ChangeIndicator :value="editable.changed.settings.emailAlerts_resource_memory" /></template>
                </FormRow>
            </div>
            <LockSetting v-model="editable.policy.emailAlerts_resource_memory" class="flex justify-end flex-col" :editTemplate="editTemplate" :changed="editable.changed.policy.emailAlerts_resource_memory" />
        </div>
        <FormHeading>Who to notify</FormHeading>
        <div class="flex flex-col sm:flex-row sm:ml-4">
            <div class="space-y-4 w-full max-w-md sm:mr-8">
                <FormRow>
                    <template #append><ChangeIndicator :value="editable.changed.settings.emailAlerts_recipients" /></template>
                    <template #description>Which group of users to notify</template>
                    <template #input>&nbsp;</template>
                </FormRow>
            </div>
            <LockSetting v-model="editable.policy.emailAlerts_recipients" class="flex justify-end flex-col" :editTemplate="editTemplate" :changed="editable.changed.policy.emailAlerts_recipients" />
        </div>
        <ff-radio-group v-model="editable.settings.emailAlerts_recipients" orientation="vertical" :options="emailOptions" data-el="notify-list" />
    </form>
</template>

<script>
import FormHeading from '../../../../components/FormHeading.vue'
import FormRow from '../../../../components/FormRow.vue'
import FeatureUnavailableToTeam from '../../../../components/banners/FeatureUnavailableToTeam.vue'
import ChangeIndicator from '../components/ChangeIndicator.vue'
import LockSetting from '../components/LockSetting.vue'

export default {
    name: 'TemplateSettingsAlerts',
    components: {
        FormRow,
        FormHeading,
        LockSetting,
        ChangeIndicator,
        FeatureUnavailableToTeam
    },
    props: {
        editTemplate: {
            type: Boolean,
            default: false
        },
        modelValue: {
            type: Object,
            default: null
        },
        team: {
            type: Object,
            default: null
        }
    },
    emits: ['update:modelValue'],
    data () {
        return {
        }
    },
    computed: {
        editable: {
            get () {
                return this.modelValue
            },
            set (localValue) {
                this.$emit('update:modelValue', localValue)
            }
        },
        emailOptions () {
            return [
                {
                    label: 'Owners',
                    value: 'owners',
                    description: 'Email Team Owners',
                    disabled: !this.editTemplate && !this.editable.policy.emailAlerts_recipients
                },
                {
                    label: 'Owners & Members',
                    value: 'both',
                    description: 'Email Team Owners and Members',
                    disabled: !this.editTemplate && !this.editable.policy.emailAlerts_recipients
                },
                {
                    label: 'Members',
                    value: 'members',
                    description: 'Email Team Members',
                    disabled: !this.editTemplate && !this.editable.policy.emailAlerts_recipients
                }
            ]
        },
        ffAuthFeatureAvailable () {
            if (!this.team) {
                // If on the Admin Template view, then this option is available
                return true
            }
            const flag = this.team.type.properties.features?.emailAlerts
            return flag === undefined || flag
        }
    }
}
</script>
