<template>
    <form class="space-y-4">
        <FormHeading>Palette</FormHeading>
        <div class="flex flex-col sm:flex-row">
            <div class="space-y-4 w-full max-w-md sm:mr-8">
                <FormRow v-model="editableTemplate.settings.palette_allowInstall" type="checkbox">
                    Allow user to install new nodes
                    <template #append><ChangeIndicator :value="editableTemplate.changedSettings.palette_allowInstall"></ChangeIndicator></template>
                </FormRow>
                <div class="pl-6 space-y-4">
                    <FormRow v-model="editableTemplate.settings.palette_allowList" >
                        Allow List            
                        <template #append><ChangeIndicator :value="editableTemplate.changedSettings.palette_allowList"></ChangeIndicator></template>
                    </FormRow>
                    <FormRow v-model="editableTemplate.settings.palette_denyList">
                        Deny List            
                        <template #append><ChangeIndicator :value="editableTemplate.changedSettings.palette_denyList"></ChangeIndicator></template>
                    </FormRow>
                </div>
            </div>
            <LockSetting v-model="editableTemplate.policy.palette_allowInstall" :changed="editableTemplate.changedPolicy.palette_allowInstall"></LockSetting>
        </div>
        <div class="flex flex-col sm:flex-row">
            <div class="w-full max-w-md sm:mr-8">
                <FormRow v-model="editableTemplate.settings.palette_nodeExcludes">
                    Exclude nodes by filename
                    <template #description>
                        This can be used to disable any of the default Node-RED nodes. Provide a comma-separated list of the corresponding
                        node filename.
                    </template>
                    <template #append><ChangeIndicator :value="editableTemplate.changedSettings.palette_nodeExcludes"></ChangeIndicator></template>
                </FormRow>
            </div>
            <LockSetting v-model="editableTemplate.policy.palette_nodeExcludes" :changed="editableTemplate.changedPolicy.palette_nodeExcludes"></LockSetting>
        </div>
    </form>
</template>

<script>

import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import LockSetting from './components/LockSetting'
import ChangeIndicator from './components/ChangeIndicator'

export default {
    name: 'AdminTemplatePalette',
    props: ['template', 'modelValue'],
    data() {
        return {
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
