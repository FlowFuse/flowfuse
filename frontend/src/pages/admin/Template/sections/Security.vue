<template>
    <form class="space-y-4" @submit.prevent>
        <FormHeading class="pt-8">HTTP Node Security</FormHeading>
        <div class="flex flex-col sm:flex-row sm:ml-4">
            <div class="space-y-4 w-full max-w-md sm:mr-8">
                <FormRow>
                    <template #description>Select the type of security to apply to all http routes served by the Node-RED flows. This includes all HTTP In nodes and Node-RED Dashboard.</template>
                    <template #input>&nbsp;</template>
                </FormRow>
            </div>
            <LockSetting class="flex justify-end flex-col" :editTemplate="editTemplate" v-model="editable.policy.httpNodeAuth_type" :changed="editable.changed.policy.httpNodeAuth_type"></LockSetting>
        </div>
        <ff-radio-group v-model="editable.settings.httpNodeAuth_type" orientation="vertical" :options="authOptions1"></ff-radio-group>
        <div class="flex flex-col sm:flex-row sm:ml-4">
            <div class="space-y-4 w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.httpNodeAuth_user" :disabled="editable.settings.httpNodeAuth_type !=='basic' || !editTemplate && !editable.policy.httpNodeAuth_user" :type="(editTemplate||editable.policy.httpNodeAuth_user)?'text':'uneditable'">
                    HTTP Auth Username
                    <template #append><ChangeIndicator :value="editable.changed.settings.httpNodeAuth_user"></ChangeIndicator></template>
                </FormRow>
            </div>
            <LockSetting class="flex justify-end flex-col" :editTemplate="editTemplate" v-model="editable.policy.httpNodeAuth_user" :changed="editable.changed.policy.httpNodeAuth_user"></LockSetting>
        </div>
        <div class="flex flex-col sm:flex-row sm:ml-4">
            <div class="space-y-4 w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.httpNodeAuth_pass" :disabled="editable.settings.httpNodeAuth_type !=='basic' || !editTemplate && !editable.policy.httpNodeAuth_pass" :type="(editTemplate||editable.policy.httpNodeAuth_pass)?'password':'uneditable'">
                    HTTP Auth Password
                    <template #append><ChangeIndicator :value="editable.changed.settings.httpNodeAuth_pass"></ChangeIndicator></template>
                </FormRow>
            </div>
            <LockSetting class="flex justify-end flex-col" :editTemplate="editTemplate" v-model="editable.policy.httpNodeAuth_pass" :changed="editable.changed.policy.httpNodeAuth_pass"></LockSetting>
        </div>

        <ff-radio-group v-model="editable.settings.httpNodeAuth_type" orientation="vertical" :options="authOptions2"></ff-radio-group>
    </form>
</template>

<script>
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import LockSetting from '../components/LockSetting'
import ChangeIndicator from '../components/ChangeIndicator'
export default {
    name: 'TemplateSettingsSecurity',
    props: ['editTemplate', 'modelValue'],
    computed: {
        editable: {
            get () {
                return this.modelValue
            },
            set (localValue) {
                this.$emit('update:modelValue', localValue)
            }
        },
        authOptions1 () {
            return [
                {
                    label: 'None',
                    value: 'none',
                    disabled: !this.editTemplate && !this.editable.policy.httpNodeAuth_type,
                    description: 'Anyone is able to access the http routes of the project'
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
                    label: 'FlowForge User Authentication',
                    value: 'flowforge-user',
                    disabled: !this.editTemplate && !this.editable.policy.httpNodeAuth_type,
                    description: 'Only members of the project\'s team will be able to access the routes'
                }
            ]
        }
    },
    components: {
        FormRow,
        FormHeading,
        LockSetting,
        ChangeIndicator
    }
}
</script>
