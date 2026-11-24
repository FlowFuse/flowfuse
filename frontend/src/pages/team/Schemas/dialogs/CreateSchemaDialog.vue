<template>
    <FormRow v-model="name" data-el="create-schema-dialog" data-form="schema-name" :error="error">Name</FormRow>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

import FormRow from '@/components/FormRow.vue'
import { useUxDialogStore } from '@/stores/ux-dialog.js'

defineOptions({ name: 'CreateSchemaDialog' })

// Shown inside the platform dialog, which owns the header and the buttons
const props = defineProps<{
    error: string
    creating: boolean
}>()

const emit = defineEmits<{
    change: [string]
}>()

const dialogStore = useUxDialogStore()
const name = ref('')

watch(name, (value) => emit('change', value.trim()))
watch(() => !name.value.trim() || props.creating, (disabled) => dialogStore.setDisablePrimary(disabled), { immediate: true })
</script>
