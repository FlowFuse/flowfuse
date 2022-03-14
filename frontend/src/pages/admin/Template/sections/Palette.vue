<template>
    <form class="space-y-4" @submit.prevent>
        <FormHeading>Palette</FormHeading>
        <div class="flex flex-col sm:flex-row">
            <div class="space-y-4 w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.palette_allowInstall" type="checkbox" :disabled="!editTemplate && !editable.policy.palette_allowInstall">
                    Allow user to install new nodes
                    <template #append><ChangeIndicator :value="editable.changed.settings.palette_allowInstall"></ChangeIndicator></template>
                </FormRow>
            </div>
            <LockSetting :editTemplate="editTemplate" v-model="editable.policy.palette_allowInstall" :changed="editable.changed.policy.palette_allowInstall"></LockSetting>
        </div>
        <div class="flex flex-col sm:flex-row">
            <div class="w-full max-w-md sm:mr-8">
                <FormRow v-model="editable.settings.palette_nodesExcludes" :error="editable.errors.palette_nodesExcludes" :type="(editTemplate||editable.policy.palette_nodesExcludes)?'text':'uneditable'">
                    Exclude nodes by filename
                    <template #description>
                        This can be used to disable any of the default Node-RED nodes. Provide a comma-separated list of the corresponding
                        node filename.
                    </template>
                    <template #append><ChangeIndicator :value="editable.changed.settings.palette_nodesExcludes"></ChangeIndicator></template>
                </FormRow>
            </div>
            <LockSetting :editTemplate="editTemplate" v-model="editable.policy.palette_nodesExcludes" :changed="editable.changed.policy.palette_nodesExcludes"></LockSetting>
        </div>
    </form>
</template>

<script>

import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import LockSetting from '../components/LockSetting'
import ChangeIndicator from '../components/ChangeIndicator'

export default {
    name: 'AdminTemplatePalette',
    props: [ 'editTemplate', 'modelValue' ],
    data() {
        return {
        }
    },
    computed: {
        editable: {
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
