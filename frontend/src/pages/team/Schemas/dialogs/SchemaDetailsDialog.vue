<template>
    <form class="space-y-4" data-el="schema-details-dialog" @submit.prevent>
        <FormRow v-model="name" data-form="schema-name" :error="error">Name</FormRow>
        <FormRow data-form="schema-description">
            Description
            <template #description>Optional. Shown under the name in the list of schemas.</template>
            <template #input>
                <textarea v-model="description" class="w-full" rows="3" />
            </template>
        </FormRow>
        <FormRow v-if="groups.length" data-form="schema-group">
            Group
            <template #input>
                <ff-combobox v-model="groupId" class="w-full" :options="groupOptions" />
            </template>
        </FormRow>
    </form>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import FormRow from '@/components/FormRow.vue'
import { UNGROUPED } from '@/stores/data-farm-schemas'
import { useUxDialogStore } from '@/stores/ux-dialog.js'
import type { DataSchemaGroup, DataSchemaSummary } from '@/types'

defineOptions({ name: 'SchemaDetailsDialog' })

// The name, description and group of a new schema, or of an existing one when `schema` is given.
// Shown inside the platform dialog, which owns the header and the buttons
const props = defineProps<{
    error: string
    busy: boolean
    groups: DataSchemaGroup[]
    schema?: Pick<DataSchemaSummary, 'name' | 'description' | 'group'>
}>()

const emit = defineEmits<{
    change: [{ name: string, description: string, groupId: string }]
}>()

const dialogStore = useUxDialogStore()
const name = ref(props.schema?.name ?? '')
const description = ref(props.schema?.description ?? '')
const groupId = ref(props.schema?.group?.id ?? UNGROUPED)
const groupOptions = computed(() => [{ label: 'No group', value: UNGROUPED }, ...props.groups.map(group => ({ label: group.name, value: group.id }))])

const values = computed(() => ({ name: name.value.trim(), description: description.value.trim(), groupId: groupId.value === UNGROUPED ? '' : groupId.value }))
// an existing schema can only be saved once something about it has changed
const unchanged = computed(() => !!props.schema && values.value.name === props.schema.name && values.value.description === props.schema.description && values.value.groupId === (props.schema.group?.id ?? ''))

watch(values, (value) => emit('change', value))
watch(() => !values.value.name || unchanged.value || props.busy, (disabled) => dialogStore.setDisablePrimary(disabled), { immediate: true })
</script>
