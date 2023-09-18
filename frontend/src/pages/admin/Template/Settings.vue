<template>
    <form class="space-y-4" @submit.prevent>
        <FormHeading>General</FormHeading>
        <FormRow v-model="editableTemplate.name" :error="editableTemplate.errors.name">
            Name
            <template #append><ChangeIndicator :value="editableTemplate.changed.name" /></template>
        </FormRow>
        <FormRow v-model="editableTemplate.active" type="checkbox">
            Active
            <template #description>Users can only select from active templates</template>
            <template #append><ChangeIndicator :value="editableTemplate.changed.active" /></template>
        </FormRow>
        <FormRow v-model="editableTemplate.description" :error="editableTemplate.errors.description">
            Description
            <template #append><ChangeIndicator :value="editableTemplate.changed.description" /></template>
        </FormRow>
        <TemplateSettingsEditor v-model="editableTemplate" :editTemplate="editTemplate" />
    </form>
</template>

<script>

import FormHeading from '../../../components/FormHeading.vue'
import FormRow from '../../../components/FormRow.vue'

import ChangeIndicator from './components/ChangeIndicator.vue'
import TemplateSettingsEditor from './sections/Editor.vue'

export default {
    name: 'AdminTemplateSettings',
    components: {
        FormRow,
        FormHeading,
        ChangeIndicator,
        TemplateSettingsEditor
    },
    props: {
        modelValue: {
            type: Object,
            default: null
        },
        editTemplate: {
            type: Boolean,
            default: false
        }
    },
    emits: ['update:modelValue'],
    computed: {
        editableTemplate: {
            get () { return this.modelValue },
            set (localValue) { this.$emit('update:modelValue', localValue) }
        }
    }
}
</script>
