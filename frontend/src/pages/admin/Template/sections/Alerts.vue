<template>
    <form class="space-y-4" @submit.prevent>
        <FormHeading>{{ $t('ui.emailAlerts') }}</FormHeading>
        <p>
            {{ $t('ui.youCanEnableAlertsToBeSentToYouViaEmailOnTheFoll') }}
        </p>
        <FeatureUnavailableToTeam v-if="!ffAuthFeatureAvailable" :featureName="$t('ui.emailAlerts')" />
        <div class="flex flex-col, sm:flex-row sm:ml-4">
            <div class="space-y-4 w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.emailAlerts_crash" type="checkbox" :disabled="!editTemplate && !editable.policy.emailAlerts_crash">
                    {{ $t('ui.nodeRedHasCrashed') }}
                    <template #append><ChangeIndicator :value="editable.changed.settings.emailAlerts_crash" /></template>
                </FormRow>
            </div>
            <LockSetting v-model="editable.policy.emailAlerts_crash" class="flex justify-end flex-col" :editTemplate="editTemplate" :changed="editable.changed.policy.emailAlerts_crash" />
        </div>
        <div class="flex flex-col, sm:flex-row sm:ml-4">
            <div class="space-y-4 w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.emailAlerts_safe" type="checkbox" :disabled="!editTemplate && !editable.policy.emailAlerts_safe">
                    {{ $t('ui.nodeRedHasBeenPlacedInSafeMode') }}
                    <template #append><ChangeIndicator :value="editable.changed.settings.emailAlerts_safe" /></template>
                </FormRow>
            </div>
            <LockSetting v-model="editable.policy.emailAlerts_safe" class="flex justify-end flex-col" :editTemplate="editTemplate" :changed="editable.changed.policy.emailAlerts_safe" />
        </div>
        <div class="flex flex-col, sm:flex-row sm:ml-4">
            <div class="space-y-4 w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.emailAlerts_resource_cpu" type="checkbox" :disabled="!editTemplate && !editable.policy.emailAlerts_resource_cpu">
                    {{ $t('ui.nodeRedCpuUsageHasExceeded75For5Minutes') }}
                    <template #append><ChangeIndicator :value="editable.changed.settings.emailAlerts_resource_cpu" /></template>
                </FormRow>
            </div>
            <LockSetting v-model="editable.policy.emailAlerts_resource_cpu" class="flex justify-end flex-col" :editTemplate="editTemplate" :changed="editable.changed.policy.emailAlerts_resource_cpu" />
        </div>
        <div class="flex flex-col, sm:flex-row sm:ml-4">
            <div class="space-y-4 w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.emailAlerts_resource_memory" type="checkbox" :disabled="!editTemplate && !editable.policy.emailAlerts_resource_memory">
                    {{ $t('ui.nodeRedMemoryUsageHasExceeded75For5Minutes') }}
                    <template #append><ChangeIndicator :value="editable.changed.settings.emailAlerts_resource_memory" /></template>
                </FormRow>
            </div>
            <LockSetting v-model="editable.policy.emailAlerts_resource_memory" class="flex justify-end flex-col" :editTemplate="editTemplate" :changed="editable.changed.policy.emailAlerts_resource_memory" />
        </div>
        <FormHeading>{{ $t('ui.whoToNotify') }}</FormHeading>
        <div class="flex flex-col sm:flex-row sm:ml-4">
            <div class="space-y-4 w-full max-w-md sm:mr-8">
                <FormRow>
                    <template #append><ChangeIndicator :value="editable.changed.settings.emailAlerts_recipients" /></template>
                    <template #description>{{ $t('ui.whichGroupOfUsersToNotify') }}</template>
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
import { t } from '../../../../i18n.js'
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
                    label: t('ui.owners'),
                    value: 'owners',
                    description: t('ui.emailTeamOwners'),
                    disabled: !this.editTemplate && !this.editable.policy.emailAlerts_recipients
                },
                {
                    label: t('ui.ownersMembers'),
                    value: 'both',
                    description: t('ui.emailTeamOwnersAndMembers'),
                    disabled: !this.editTemplate && !this.editable.policy.emailAlerts_recipients
                },
                {
                    label: t('ui.members'),
                    value: 'members',
                    description: t('ui.emailTeamMembers'),
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
