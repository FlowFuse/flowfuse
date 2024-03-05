<template>
    <form class="space-y-4" data-el="http-auth" @submit.prevent>
        <FormHeading>HTTP Node Security</FormHeading>
        <div class="flex flex-col sm:flex-row sm:ml-4">
            <div class="space-y-4 w-full max-w-md sm:mr-8">
                <FormRow>
                    <template #description>Select the type of security to apply to all http routes served by the Node-RED flows. This includes all HTTP In nodes and Node-RED Dashboard.</template>
                    <template #input>&nbsp;</template>
                </FormRow>
            </div>
            <LockSetting v-model="editable.policy.httpNodeAuth_type" class="flex justify-end flex-col" :editTemplate="editTemplate" :changed="editable.changed.policy.httpNodeAuth_type" />
        </div>
        <ff-radio-group v-model="editable.settings.httpNodeAuth_type" orientation="vertical" :options="authOptions1" />
        <div class="flex flex-col sm:flex-row sm:ml-4">
            <div class="space-y-4 w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.httpNodeAuth_user" :disabled="editable.settings.httpNodeAuth_type !=='basic' || !editTemplate && !editable.policy.httpNodeAuth_user" :type="(editTemplate||editable.policy.httpNodeAuth_user)?'text':'uneditable'">
                    HTTP Auth Username
                    <template #append><ChangeIndicator :value="editable.changed.settings.httpNodeAuth_user" /></template>
                </FormRow>
            </div>
            <LockSetting v-model="editable.policy.httpNodeAuth_user" class="flex justify-end flex-col" :editTemplate="editTemplate" :changed="editable.changed.policy.httpNodeAuth_user" />
        </div>
        <div class="flex flex-col sm:flex-row sm:ml-4">
            <div class="space-y-4 w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.httpNodeAuth_pass" :disabled="editable.settings.httpNodeAuth_type !=='basic' || !editTemplate && !editable.policy.httpNodeAuth_pass" :type="(editTemplate||editable.policy.httpNodeAuth_pass)?'password':'uneditable'">
                    HTTP Auth Password
                    <template #append><ChangeIndicator :value="editable.changed.settings.httpNodeAuth_pass" /></template>
                </FormRow>
            </div>
            <LockSetting v-model="editable.policy.httpNodeAuth_pass" class="flex justify-end flex-col" :editTemplate="editTemplate" :changed="editable.changed.policy.httpNodeAuth_pass" />
        </div>
        <FeatureUnavailableToTeam v-if="!ffAuthFeatureAvailable" featureName="FlowFuse User Authentication" />
        <ff-radio-group v-model="editable.settings.httpNodeAuth_type" orientation="vertical" :options="authOptions2" />
    </form>
</template>

<script>
import FormHeading from '../../../../components/FormHeading.vue'
import FormRow from '../../../../components/FormRow.vue'
import FeatureUnavailableToTeam from '../../../../components/banners/FeatureUnavailableToTeam.vue'
import ChangeIndicator from '../components/ChangeIndicator.vue'
import LockSetting from '../components/LockSetting.vue'

export default {
    name: 'TemplateSettingsSecurity',
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
    computed: {
        editable: {
            get () {
                return this.modelValue
            },
            set (localValue) {
                this.$emit('update:modelValue', localValue)
            }
        },
        ffAuthFeatureAvailable () {
            if (!this.team) {
                // If on the Admin Template view, then this option is available
                return true
            }
            const flag = this.team.type.properties.features?.teamHttpSecurity
            return flag === undefined || flag
        },
        authOptions1 () {
            return [
                {
                    label: 'None',
                    value: 'none',
                    disabled: !this.editTemplate && !this.editable.policy.httpNodeAuth_type,
                    description: 'Anyone is able to access the http routes of the application instance'
                },
                {
                    label: 'Basic Authentication',
                    value: 'basic',
                    disabled: !this.editTemplate && !this.editable.policy.httpNodeAuth_type,
                    description: 'Require a username/password to be provided'
                }
            ]
        },
        authOptions2 () {
            return [
                {
                    label: 'FlowFuse User Authentication',
                    value: 'flowforge-user',
                    disabled: !this.ffAuthFeatureAvailable || (!this.editTemplate && !this.editable.policy.httpNodeAuth_type),
                    description: 'Only members of the application instance\'s team will be able to access the routes'
                }
            ]
        }
    }
}
</script>
