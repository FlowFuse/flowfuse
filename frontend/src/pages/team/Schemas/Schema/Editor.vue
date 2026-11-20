<template>
    <div class="flex flex-col gap-6" data-el="schema-editor">
        <FormRow v-if="draft || latestPublished" :key="draft ? 'draft' : 'published'" data-form="version-notes">
            Version notes
            <template v-if="!draft && latestPublished" #description>Published {{ published }}</template>
            <template #input>
                <textarea v-if="draft" v-model="notes" class="w-full" rows="3" :disabled="readOnly" />
                <p v-else class="text-sm text-gray-800 whitespace-pre-line">{{ latestPublished?.notes || 'None' }}</p>
            </template>
        </FormRow>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import FormRow from '@/components/FormRow.vue'
import type { DataSchemaDraft, DataSchemaVersion } from '@/types'

import daysSince from '@/utils/daysSince'

defineOptions({ name: 'SchemaEditor' })

const props = defineProps<{
    draft: DataSchemaDraft | null
    latestPublished: DataSchemaVersion | null
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
