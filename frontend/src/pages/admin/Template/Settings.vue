<template>
    <form class="space-y-4">
        <FormHeading>General</FormHeading>
        <FormRow v-model="editableTemplate.name" :error="editableTemplate.errors.name">
            Name
            <template #append><ChangeIndicator :value="editableTemplate.changedName"></ChangeIndicator></template>
        </FormRow>
        <FormHeading>Editor</FormHeading>
        <div class="flex flex-col sm:flex-row">
            <div class="w-full max-w-md sm:mr-8">
                <FormRow v-model="editableTemplate.settings.disableEditor" type="checkbox">
                    Disable editor
                    <template #description>
                        Disable the editor for this project. The only way to modify the running flows will be to re-enable the editor and restart the project, or use the Admin API.
                    </template>
                    <template #append><ChangeIndicator :value="editableTemplate.changedSettings.disableEditor"></ChangeIndicator></template>
                </FormRow>
            </div>
            <LockSetting v-model="editableTemplate.policy.disableEditor" :changed="editableTemplate.changedPolicy.disableEditor"></LockSetting>
        </div>
        <div class="flex flex-col sm:flex-row">
            <div class="w-full max-w-md sm:mr-8">
                <FormRow v-model="editableTemplate.settings.httpAdminRoot" placeholder="/editor">
                    Editor URL Path
                    <template #description>
                        The path used to serve the editor
                    </template>
                    <template #append><ChangeIndicator :value="editableTemplate.changedSettings.httpAdminRoot"></ChangeIndicator></template>
                </FormRow>
            </div>
            <LockSetting v-model="editableTemplate.policy.httpAdminRoot" :changed="editableTemplate.changedPolicy.httpAdminRoot"></LockSetting>
        </div>
        <div class="flex flex-col sm:flex-row">
            <div class="w-full max-w-md sm:mr-8">
                <FormRow v-model="editableTemplate.settings.editorTheme" type="select" :options="themeOptions">
                    Theme
                    <template #append><ChangeIndicator :value="editableTemplate.changedSettings.editorTheme"></ChangeIndicator></template>
                </FormRow>
            </div>
            <LockSetting v-model="editableTemplate.policy.editorTheme" :changed="editableTemplate.changedPolicy.editorTheme"></LockSetting>
        </div>
        <div class="flex flex-col sm:flex-row">
            <div class="w-full max-w-md sm:mr-8">
                <FormRow v-model="editableTemplate.settings.codeEditor" type="select" :options="[{label:'monaco', value:'monaco'},{label:'ace', value:'ace'}]">
                    Code Editor
                    <template #append><ChangeIndicator :value="editableTemplate.changedSettings.codeEditor"></ChangeIndicator></template>
                </FormRow>
            </div>
            <LockSetting v-model="editableTemplate.policy.codeEditor" :changed="editableTemplate.changedPolicy.codeEditor"></LockSetting>
        </div>

        <FormHeading class="pt-8">External Modules</FormHeading>
        <div class="flex flex-col sm:flex-row">
            <div class="space-y-4 w-full max-w-md sm:mr-8">
                <FormRow v-model="editableTemplate.settings.modules_allowInstall" type="checkbox">
                    Allow user to install new modules in the Function node
                    <template #append><ChangeIndicator :value="editableTemplate.changedSettings.modules_allowInstall"></ChangeIndicator></template>
                </FormRow>
                <div class="pl-6 space-y-4">
                    <FormRow v-model="editableTemplate.settings.modules_allowList" >
                        Allow List            
                        <template #append><ChangeIndicator :value="editableTemplate.changedSettings.modules_allowList"></ChangeIndicator></template>
                    </FormRow>
                    <FormRow v-model="editableTemplate.settings.modules_denyList" >
                        Deny List            
                        <template #append><ChangeIndicator :value="editableTemplate.changedSettings.modules_denyList"></ChangeIndicator></template>
                    </FormRow>
                </div>
            </div>
            <LockSetting v-model="editableTemplate.policy.modules_allowInstall" :changed="editableTemplate.changedPolicy.modules_allowInstall"></LockSetting>
        </div>
    </form>
</template>

<script>

import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import LockSetting from './components/LockSetting'
import ChangeIndicator from './components/ChangeIndicator'


export default {
    name: 'AdminTemplateSettings',
    props: ['template', 'modelValue'],
    data() {
        return {
            themeOptions: [
                { label: 'Node-RED Default', value: 'node-red' },
                { label: 'dark', value: '@node-red-contrib-themes/theme-collection|dark' },
                { label: 'dracula', value: '@node-red-contrib-themes/theme-collection|dracula' },
                { label: 'midnight-red', value: '@node-red-contrib-themes/theme-collection|midnight-red' },
                { label: 'oled', value: '@node-red-contrib-themes/theme-collection|oled' },
                { label: 'solarized-dark', value: '@node-red-contrib-themes/theme-collection|solarized-dark' },
                { label: 'solarized-light', value: '@node-red-contrib-themes/theme-collection|solarized-light}' }
            ]
        }
    },
    computed: {
        editableTemplate: {
            get() { return this.modelValue },
            set(localValue) {this.$emit('update:modelValue', localValue)}
        }
    },
    components: {
        FormRow,
        FormHeading,
        LockSetting,
        ChangeIndicator
    },
}
</script>
