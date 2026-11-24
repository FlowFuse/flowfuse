<template>
    <div data-el="publish-schema-dialog">
        <p class="mb-4">Published versions can't be changed. Runtimes pinned to earlier versions keep using them.</p>
        <form class="space-y-4" @submit.prevent>
            <FormRow v-model="version" placeholder="x.y.z" data-form="version" :error="versionError || error">
                Version
                <template #description>
                    <template v-if="latestVersion">Latest version is {{ latestVersion }}. The new version must be higher.</template>
                    <template v-else>Use a plain major.minor.patch version, e.g. 1.0.0.</template>
                </template>
            </FormRow>
            <FormRow data-form="notes">
                Version notes
                <template #input>
                    <textarea v-model="notes" class="w-full" rows="4" />
                </template>
            </FormRow>
        </form>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { checkNewVersion } from '../../../../../../../forge/lib/schemas/version.js'

import FormRow from '@/components/FormRow.vue'
import { useUxDialogStore } from '@/stores/ux-dialog.js'

defineOptions({ name: 'PublishSchemaDialog' })

// Shown inside the platform dialog, which owns the header and the buttons
const props = defineProps<{
    latestVersion: string | null
    existingVersions: string[]
    draftNotes: string | null
    error: string
    publishing: boolean
}>()

const emit = defineEmits<{
    change: [{ version: string, notes: string }]
}>()

const dialogStore = useUxDialogStore()
const version = ref('')
const notes = ref(props.draftNotes ?? '')

const versionError = computed(() => {
    const problem = version.value ? checkNewVersion(version.value, props.existingVersions) : null
    if (!problem) return ''
    if (problem.code === 'version_not_higher') return `Must be higher than ${problem.highest}`
    if (problem.code === 'version_exists') return `Version ${version.value} already exists`
    return 'Use a plain major.minor.patch version, e.g. 1.0.0'
})

watch([version, notes], () => emit('change', { version: version.value, notes: notes.value }))
watch(() => !version.value || !!versionError.value || props.publishing, (disabled) => dialogStore.setDisablePrimary(disabled), { immediate: true })
</script>
