<template>
    <form class="space-y-4" @submit.prevent>
        <FormHeading>General</FormHeading>
        <FormRow v-model="editableTemplate.name" :error="editableTemplate.errors.name">
            Name
            <template #append><ChangeIndicator :value="editableTemplate.changed.name"></ChangeIndicator></template>
        </FormRow>
        <FormRow v-model="editableTemplate.active" type="checkbox">
            Active
            <template #description>Users can only select from active templates</template>
            <template #append><ChangeIndicator :value="editableTemplate.changed.active"></ChangeIndicator></template>
        </FormRow>
        <FormRow v-model="editableTemplate.description" :error="editableTemplate.errors.description">
            Description
            <template #append><ChangeIndicator :value="editableTemplate.changed.description"></ChangeIndicator></template>
        </FormRow>
        <TemplateSettingsEditor v-model="editableTemplate" :editTemplate="editTemplate" />
    </form>

</template>

<script>

import FormRow from '@/components/FormRow'
import FormHeading from '@/components/FormHeading'
import ChangeIndicator from './components/ChangeIndicator'
import TemplateSettingsEditor from './sections/Editor'

export default {
    name: 'AdminTemplateSettings',
    props: ['modelValue', 'editTemplate'],
    computed: {
        editableTemplate: {
            get () { return this.modelValue },
            set (localValue) { this.$emit('update:modelValue', localValue) }
        }
    },
    components: {
        FormRow,
        FormHeading,
        ChangeIndicator,
        TemplateSettingsEditor
    }
}
</script>
