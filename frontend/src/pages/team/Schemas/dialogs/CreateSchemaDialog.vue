<template>
    <form class="space-y-4" data-el="create-schema-dialog" @submit.prevent>
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
import type { DataSchemaGroup } from '@/types'

defineOptions({ name: 'CreateSchemaDialog' })

// Shown inside the platform dialog, which owns the header and the buttons
const props = defineProps<{
    error: string
    busy: boolean
    groups: DataSchemaGroup[]
}>()

const emit = defineEmits<{
    change: [{ name: string, description: string, groupId: string }]
}>()

const dialogStore = useUxDialogStore()
const name = ref('')
const description = ref('')
const groupId = ref(UNGROUPED)
const groupOptions = computed(() => [{ label: 'No group', value: UNGROUPED }, ...props.groups.map(group => ({ label: group.name, value: group.id }))])

watch([name, description, groupId], () => emit('change', { name: name.value.trim(), description: description.value.trim(), groupId: groupId.value === UNGROUPED ? '' : groupId.value }))
watch(() => !name.value.trim() || props.busy, (disabled) => dialogStore.setDisablePrimary(disabled), { immediate: true })
</script>
