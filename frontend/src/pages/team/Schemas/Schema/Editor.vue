<template>
    <div class="flex flex-col gap-6" data-el="schema-editor">
        <FormRow v-if="draft" data-form="draft-notes">
            Version notes
            <template #input>
                <textarea v-model="notes" class="w-full" rows="3" :disabled="readOnly" />
            </template>
        </FormRow>
        <div v-else-if="latestPublished">
            <InfoCardRow property="Version notes:" :value="latestPublished.notes || 'None'" />
            <InfoCardRow property="Published:" :value="published" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import FormRow from '@/components/FormRow.vue'
import InfoCardRow from '@/components/InfoCardRow.vue'
import type { SchemaDraft, SchemaVersion } from '@/stores/data-farm-schemas'

import daysSince from '@/utils/daysSince'

defineOptions({ name: 'SchemaEditor' })

const props = defineProps<{
    draft: SchemaDraft | null
    latestPublished: SchemaVersion | null
    readOnly: boolean
}>()

const published = computed(() => {
    const version = props.latestPublished
    if (!version) return ''
    const by = version.publishedBy ? ` by ${version.publishedBy.name}` : ''
    return `${daysSince(version.publishedAt)}${by}`
})

const notes = defineModel<string>('notes', { required: true })
</script>
