<template>
    <form class="space-y-4 max-w-2xl" @submit.prevent>
        <FormHeading>Palette</FormHeading>
        <div class="flex flex-col sm:flex-row">
            <div class="space-y-4 w-full sm:mr-8">
                <FormRow v-model="editable.settings.palette_allowInstall" containerClass="none" type="checkbox" :disabled="!editTemplate && !editable.policy.palette_allowInstall">
                    Allow user to install new nodes
                    <template #append><ChangeIndicator :value="editable.changed.settings.palette_allowInstall" /></template>
                </FormRow>
            </div>
            <LockSetting v-model="editable.policy.palette_allowInstall" :editTemplate="editTemplate" :changed="editable.changed.policy.palette_allowInstall" />
        </div>
        <div class="flex flex-col sm:flex-row">
            <div class="w-full sm:mr-8">
                <FormRow v-model="editable.settings.palette_nodesExcludes" containerClass="none" :disabled="!editTemplate && !editable.policy.palette_nodesExcludes" :error="editable.errors.palette_nodesExcludes" :type="(editTemplate||editable.policy.palette_nodesExcludes)?'text':'uneditable'">
                    Exclude nodes by filename
                    <template #description>
                        This can be used to disable any of the default Node-RED nodes. Provide a comma-separated list of the corresponding
                        node filename.
                    </template>
                    <template #append><ChangeIndicator :value="editable.changed.settings.palette_nodesExcludes" /></template>
                </FormRow>
            </div>
            <LockSetting v-model="editable.policy.palette_nodesExcludes" :editTemplate="editTemplate" :changed="editable.changed.policy.palette_nodesExcludes" />
        </div>
        <div class="flex flex-col sm:flex-row">
            <div class="w-full sm:mr-8">
                <FormRow v-model="editable.settings.palette_denyList" containerClass="none" :disabled="!editable.settings.palette_allowInstall" :error="editable.errors.palette_denyList" :type="(editTemplate||editable.policy.palette_denyList)?'text':'uneditable'">
                    Prevent Install of External nodes
                    <template #description>
                        This can be used to prevent the installation of nodes from the Palette Manager. A comma-separated list of the form e.g. <pre>'package-name@semVer, foo@^0.1.0, @scope/*'</pre>
                    </template>
                    <template #append><ChangeIndicator :value="editable.changed.settings.palette_denyList" /></template>
                </FormRow>
            </div>
            <LockSetting v-model="editable.policy.palette_denyList" :editTemplate="editTemplate" :changed="editable.changed.policy.palette_denyList" />
        </div>
    </form>
</template>

<script>

import FormHeading from '../../../../components/FormHeading.vue'
import FormRow from '../../../../components/FormRow.vue'
import ChangeIndicator from '../components/ChangeIndicator.vue'
import LockSetting from '../components/LockSetting.vue'

export default {
    name: 'AdminTemplatePalette',
    components: {
        FormRow,
        FormHeading,
        LockSetting,
        ChangeIndicator
    },
    props: {
        editTemplate: {
            type: Boolean,
            default: false
        },
        modelValue: {
            type: Object,
            required: true
        }
    },
    emits: ['update:modelValue'],
    data () {
        return {
        }
    },
    computed: {
        editable: {
            get () { return this.modelValue },
            set (localValue) { this.$emit('update:modelValue', localValue) }
        }
    }
}
</script>
