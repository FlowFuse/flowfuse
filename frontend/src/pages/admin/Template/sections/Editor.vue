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
                <FormRow v-model="editable.settings.httpAdminRoot" :error="editable.errors.httpAdminRoot" :type="(editTemplate||editable.policy.httpAdminRoot)?'text':'uneditable'">
                    Editor URL Path
                    <template #description>
                        The path used to serve the editor
                    </template>
                    <template #append><ChangeIndicator :value="editable.changed.settings.httpAdminRoot"></ChangeIndicator></template>
                </FormRow>
            </div>
            <LockSetting :editTemplate="editTemplate" v-model="editable.policy.httpAdminRoot" :changed="editable.changed.policy.httpAdminRoot"></LockSetting>
        </div>
        <div class="flex flex-col sm:flex-row">
            <div class="w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.codeEditor" :type="(editTemplate||editable.policy.codeEditor)?'select':'uneditable'" :options="[{label:'monaco', value:'monaco'},{label:'ace', value:'ace'}]">
                    Code Editor
                    <template #append><ChangeIndicator :value="editable.changed.settings.codeEditor"></ChangeIndicator></template>
                </FormRow>
            </div>
            <LockSetting :editTemplate="editTemplate" v-model="editable.policy.codeEditor" :changed="editable.changed.policy.codeEditor"></LockSetting>
        </div>
        <div class="flex flex-col sm:flex-row">
            <div class="w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.timeZone" :type="(editTemplate||editable.policy.timeZone)?'select':'uneditable'" :options="timezones">
                    Time Zone
                    <template #append><ChangeIndicator :value="editable.changed.settings.timeZone"></ChangeIndicator></template>
                </FormRow>
            </div>
            <LockSetting :editTemplate="editTemplate" v-model="editable.policy.timeZone" :changed="editable.changed.policy.timeZone"></LockSetting>
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
                <FormRow :disabled="!editable.settings.modules_allowInstall" v-model="editable.settings.modules_denyList" :error="editable.errors.modules_denyList" :type="(editTemplate||editable.policy.modules_denyList)?'text':'uneditable'">
                    Prevent Install of External nodes
                    <template #description>
                        This can be used to prevent the installation of modules in Function nodes. A comma-seperated list of the form e.g. <pre>'package-name@semVer, foo@^0.1.0, @scope/*'</pre>
                    </template>
                    <template #append><ChangeIndicator :value="editable.changed.settings.modules_denyList"></ChangeIndicator></template>
                </FormRow>
            </div>
            <LockSetting :editTemplate="editTemplate" v-model="editable.policy.modules_denyList" :changed="editable.changed.policy.modules_denyList"></LockSetting>

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
            timezones: timezonesData.timezones
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
