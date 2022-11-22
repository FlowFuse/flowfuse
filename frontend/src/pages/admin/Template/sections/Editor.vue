<template>
    <form class="space-y-4" @submit.prevent>
        <FormHeading>Editor</FormHeading>
        <div class="flex flex-col sm:flex-row">
            <div class="w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.disableEditor" type="checkbox" :disabled="!editTemplate && !editable.policy.disableEditor">
                    Disable editor
                    <template #description>
                        Disable the editor for this project. The only way to modify the running flows will be to re-enable the editor and restart the project, or use the Admin API.
                    </template>
                    <template #append><ChangeIndicator :value="editable.changed.settings.disableEditor"></ChangeIndicator></template>
                </FormRow>
            </div>
            <LockSetting :editTemplate="editTemplate" v-model="editable.policy.disableEditor" :changed="editable.changed.policy.disableEditor"></LockSetting>
        </div>
        <div class="flex flex-col sm:flex-row">
            <div class="w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.disableTours" type="checkbox" :disabled="!editTemplate && !editable.policy.disableTours">
                    Disable Welcome Tour
                    <template #description>
                        Disable the Welcome Tour when accessing the editor the first time.
                    </template>
                    <template #append><ChangeIndicator :value="editable.changed.settings.disableTours"></ChangeIndicator></template>
                </FormRow>
            </div>
            <LockSetting :editTemplate="editTemplate" v-model="editable.policy.disableTours" :changed="editable.changed.policy.disableTours"></LockSetting>
        </div>
        <div class="flex flex-col sm:flex-row">
            <div class="w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.httpAdminRoot" :error="editable.errors.httpAdminRoot" :disabled="!editTemplate && editable.policy.httpAdminRoot === false" type="text">
                    Editor URL Path
                    <template #description>
                        The path used to serve the editor
                    </template>
                    <template #append><ChangeIndicator :value="editable.changed.settings.httpAdminRoot"></ChangeIndicator></template>
                </FormRow>
            </div>
            <LockSetting class="flex justify-end flex-col" :editTemplate="editTemplate" v-model="editable.policy.httpAdminRoot" :changed="editable.changed.policy.httpAdminRoot"></LockSetting>
        </div>
        <div class="flex flex-col sm:flex-row">
            <div class="w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.dashboardUI" :error="editable.errors.dashboardUI" :disabled="!editTemplate && !editable.policy.dashboardUI" type="text">
                    Dashboard URL Path
                    <template #description>
                        The path used to serve the node-red-dashboard UI
                    </template>
                    <template #append><ChangeIndicator :value="editable.changed.settings.dashboardUI"></ChangeIndicator></template>
                </FormRow>
            </div>
            <LockSetting class="flex justify-end flex-col" :editTemplate="editTemplate" v-model="editable.policy.dashboardUI" :changed="editable.changed.policy.dashboardUI"></LockSetting>
        </div>
        <div class="flex flex-col sm:flex-row">
            <div class="w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.codeEditor" :disabled="!editTemplate && !editable.policy.codeEditor" type="select" :options="[{label:'monaco', value:'monaco'},{label:'ace', value:'ace'}]">
                    Code Editor
                    <template #append><ChangeIndicator :value="editable.changed.settings.codeEditor"></ChangeIndicator></template>
                </FormRow>
            </div>
            <LockSetting class="flex justify-end flex-col" :editTemplate="editTemplate" v-model="editable.policy.codeEditor" :changed="editable.changed.policy.codeEditor"></LockSetting>
        </div>
        <div class="flex flex-col sm:flex-row">
            <div class="w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.header_title" :error="editable.errors.header_title" :disabled="!editTemplate && !editable.policy.header_title" type="text">
                    Editor Title
                    <template #description>
                        The title to show in the header
                    </template>
                    <template #append><ChangeIndicator :value="editable.changed.settings.header_title"></ChangeIndicator></template>
                </FormRow>
            </div>
            <LockSetting class="flex justify-end flex-col" :editTemplate="editTemplate" v-model="editable.policy.header_title" :changed="editable.changed.policy.header_title"></LockSetting>
        </div>
        <div class="flex flex-col sm:flex-row">
            <div class="w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.timeZone" :disabled="!editTemplate && !editable.policy.timeZone" type="select" :options="timezones">
                    Time Zone
                    <template #append><ChangeIndicator :value="editable.changed.settings.timeZone"></ChangeIndicator></template>
                </FormRow>
            </div>
            <LockSetting class="flex justify-end flex-col" :editTemplate="editTemplate" v-model="editable.policy.timeZone" :changed="editable.changed.policy.timeZone"></LockSetting>
        </div>
        <FormHeading class="pt-8">HTTP Nodes</FormHeading>
        <div class="flex flex-col sm:flex-row">
            <div class="space-y-4 w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.httpNodeAuth_user" :disabled="!editTemplate && !editable.policy.httpNodeAuth_user" :type="(editTemplate||editable.policy.httpNodeAuth_user)?'text':'uneditable'">
                    HTTP Auth Username
                    <template #append><ChangeIndicator :value="editable.changed.settings.httpNodeAuth_user"></ChangeIndicator></template>
                </FormRow>
            </div>
            <LockSetting class="flex justify-end flex-col" :editTemplate="editTemplate" v-model="editable.policy.httpNodeAuth_user" :changed="editable.changed.policy.httpNodeAuth_user"></LockSetting>
        </div>
        <div class="flex flex-col sm:flex-row">
            <div class="space-y-4 w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.httpNodeAuth_pass" :disabled="!editTemplate && !editable.policy.httpNodeAuth_pass" :type="(editTemplate||editable.policy.httpNodeAuth_pass)?'password':'uneditable'">
                    HTTP Auth Password
                    <template #append><ChangeIndicator :value="editable.changed.settings.httpNodeAuth_pass"></ChangeIndicator></template>
                </FormRow>
            </div>
            <LockSetting class="flex justify-end flex-col" :editTemplate="editTemplate" v-model="editable.policy.httpNodeAuth_pass" :changed="editable.changed.policy.httpNodeAuth_pass"></LockSetting>
        </div>
        <FormHeading class="pt-8">External Modules</FormHeading>
        <div class="flex flex-col sm:flex-row">
            <div class="space-y-4 w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.modules_allowInstall" type="checkbox" :disabled="!editTemplate && !editable.policy.modules_allowInstall">
                    Allow user to install new modules in the Function node
                    <template #append><ChangeIndicator :value="editable.changed.settings.modules_allowInstall"></ChangeIndicator></template>
                </FormRow>
            </div>
            <LockSetting :editTemplate="editTemplate" v-model="editable.policy.modules_allowInstall" :changed="editable.changed.policy.modules_allowInstall"></LockSetting>
        </div>

        <div class="flex flex-col sm:flex-row">
            <div class="w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.modules_denyList" :disabled="!editTemplate && !editable.policy.modules_denyList" :error="editable.errors.modules_denyList" :type="(editTemplate||editable.policy.modules_denyList)?'text':'uneditable'">
                    Prevent Install of External modules
                    <template #description>
                        This can be used to prevent the installation of modules in Function nodes. A comma-seperated list of the form e.g. <pre>'package-name@semVer, foo@^0.1.0, @scope/*'</pre>
                    </template>
                    <template #append><ChangeIndicator :value="editable.changed.settings.modules_denyList"></ChangeIndicator></template>
                </FormRow>
            </div>
            <LockSetting class="flex justify-end flex-col" :editTemplate="editTemplate" v-model="editable.policy.modules_denyList" :changed="editable.changed.policy.modules_denyList"></LockSetting>

        </div>
    </form>
</template>

<script>
import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import LockSetting from '../components/LockSetting'
import ChangeIndicator from '../components/ChangeIndicator'
import timezonesData from '@/data/timezones.json'
export default {
    name: 'TemplateSettingsEditor',
    props: ['editTemplate', 'modelValue'],
    computed: {
        editable: {
            get () {
                return this.modelValue
            },
            set (localValue) {
                this.$emit('update:modelValue', localValue)
            }
        }
    },
    data () {
        return {
            timezones: timezonesData.timezones,
            themes: [
                { label: 'Node-RED', value: '' },
                { label: 'FlowForge Light', value: 'forge-light' },
                { label: 'FlowForge Dark', value: 'forge-dark' }
            ] // FUTURE: Get from theme plugins
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
