<template>
    <form data-el="schema-group-dialog" @submit.prevent>
        <FormRow v-model="name" data-form="group-name" :error="error">Name</FormRow>
    </form>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

import FormRow from '@/components/FormRow.vue'
import { useUxDialogStore } from '@/stores/ux-dialog.js'

defineOptions({ name: 'GroupDialog' })

// Names a new group or renames one. Shown inside the platform dialog, which owns the header and the buttons
const props = defineProps<{
    // the group's current name when renaming
    name?: string
    error: string
    busy: boolean
}>()

const emit = defineEmits<{
    change: [string]
}>()

const dialogStore = useUxDialogStore()
const name = ref(props.name ?? '')

watch(name, (value) => emit('change', value.trim()))
watch(() => !name.value.trim() || name.value.trim() === props.name || props.busy, (disabled) => dialogStore.setDisablePrimary(disabled), { immediate: true })
</script>
