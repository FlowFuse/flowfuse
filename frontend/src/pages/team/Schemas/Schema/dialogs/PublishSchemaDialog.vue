<template>
    <ff-dialog
        ref="dialog"
        :header="`Publish ${schemaName}`"
        confirm-label="Publish"
        :disable-primary="!version || !!error"
        :close-on-confirm="false"
        data-el="publish-schema-dialog"
        @confirm="confirm"
    >
        <template #default>
            <p class="mb-4">Published versions can't be changed. Runtimes pinned to earlier versions keep using them.</p>
            <form class="space-y-4" @submit.prevent>
                <FormRow v-model="version" placeholder="x.y.z" data-form="version" :error="error">
                    Version
                    <template #description>
                        <template v-if="latestVersion">Latest published version is {{ latestVersion }}. The new version must be higher.</template>
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
        </template>
    </ff-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

import FormRow from '@/components/FormRow.vue'

defineOptions({ name: 'PublishSchemaDialog' })

const props = defineProps<{
    schemaName: string
    latestVersion: string | null
    draftNotes: string | null
}>()

const emit = defineEmits<{
    publish: [{ version: string, notes: string }]
}>()

const dialog = ref<{ show: () => void, close: () => void } | null>(null)
const version = ref('')
const notes = ref('')
const error = ref('')

watch(version, () => {
    error.value = ''
    // @TODO-SCHEMAS: WHEN version IS NOT EMPTY, SET error FROM checkNewVersion(version, existingVersions) IN forge/lib/schemas/version.js (#9242), IMPORTED DIRECTLY LIKE forge/lib/permissions.js; existingVersions COMES FROM A data-farm-schemas STORE ACTION BACKED BY GET /api/v1/teams/:teamId/schemas/:schemaId/versions (#9228)
})

function show () {
    version.value = ''
    notes.value = props.draftNotes ?? ''
    error.value = ''
    dialog.value?.show()
}

function confirm () {
    emit('publish', { version: version.value, notes: notes.value })
}

function close () {
    dialog.value?.close()
}

defineExpose({ show, close })
</script>
