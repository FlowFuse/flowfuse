<template>
    <div class="flex flex-col gap-6" data-el="schema-editor">
        <div class="flex flex-wrap items-center justify-between gap-4">
            <ToggleButtonGroup v-model="view" :buttons="views" :uses-links="false" size="small" title="View" visually-hide-title />
            <div class="flex items-center gap-2">
                <span v-if="problems" class="flex items-center gap-1 text-sm text-red-500" data-el="schema-problems">
                    <ExclamationCircleIcon class="ff-icon-sm" />
                    {{ problems }} {{ problems === 1 ? 'problem' : 'problems' }}
                </span>
                <template v-if="view === 'json'">
                    <ff-button v-if="!jsonReadOnly" kind="secondary" size="small" data-action="format-json" @click="jsonEditor?.format()">Format</ff-button>
                    <ff-button kind="secondary" size="small" data-action="copy-json" @click="copy">Copy</ff-button>
                    <template v-if="!jsonReadOnly">
                        <ff-button kind="secondary" size="small" data-action="import-json" @click="fileInput?.click()">Import .json</ff-button>
                        <input ref="fileInput" type="file" accept=".json,application/json" class="hidden" @change="importFile">
                    </template>
                </template>
            </div>
        </div>
        <JsonEditor v-show="view === 'json'" ref="jsonEditor" v-model="schemaText" v-model:problems="editorProblems" :markers="referenceProblems" :read-only="jsonReadOnly" />
        <div v-if="draft" class="schema-notes" data-el="schema-notes">
            <label for="schema-version-notes" class="schema-notes__label">
                <DocumentTextIcon class="ff-icon" />
                Version notes
            </label>
            <textarea id="schema-version-notes" v-model="notes" class="mt-2 w-full" rows="3" :disabled="readOnly" />
        </div>
        <FfAccordion v-else-if="latestPublished?.notes" class="schema-notes" variant="bare" data-el="schema-notes">
            <template #label>
                <p class="schema-notes__label">
                    <DocumentTextIcon class="ff-icon" />
                    Version notes
                </p>
            </template>
            <template #content>
                <p class="schema-notes__text">{{ latestPublished.notes }}</p>
            </template>
        </FfAccordion>
    </div>
</template>

<script setup lang="ts">
import { DocumentTextIcon, ExclamationCircleIcon } from '@heroicons/vue/24/outline'
import { computed, ref } from 'vue'

import type { ReferenceProblem } from './components/referenceProblems'

import FfAccordion from '@/components/Accordion.vue'
import JsonEditor from '@/components/JsonEditor.vue'
import ToggleButtonGroup from '@/components/elements/ToggleButtonGroup.vue'
import Alerts from '@/services/alerts.js'

import type { SchemaDraft, SchemaVersion } from '@/stores/data-farm-schemas'

defineOptions({ name: 'SchemaEditor' })

const props = defineProps<{
    draft: SchemaDraft | null
    latestPublished: SchemaVersion | null
    readOnly: boolean
    referenceProblems: ReferenceProblem[]
}>()

const notes = defineModel<string>('notes', { required: true })
const schemaText = defineModel<string>('schemaText', { required: true })
const editorProblems = defineModel<number>('editorProblems', { required: true })

const views = [
    { title: 'Builder', value: 'builder' },
    { title: 'JSON', value: 'json' }
]
const view = ref('json')
const jsonEditor = ref<InstanceType<typeof JsonEditor> | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const jsonReadOnly = computed(() => props.readOnly || !props.draft)
const problems = computed(() => Math.max(editorProblems.value, props.referenceProblems.length))

async function copy () {
    await navigator.clipboard.writeText(schemaText.value)
    Alerts.emit('Copied to Clipboard.', 'confirmation')
}

async function importFile (event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) jsonEditor.value?.replace(await file.text())
    input.value = ''
}
</script>

<style scoped lang="scss">
.schema-notes {
    &__label {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        margin: 0;
        font-size: 0.875rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--ff-color-text-subtle);

        .ff-icon {
            margin-left: 0;
        }
    }

    & > :deep(.ff-accordion--content) {
        padding: 12px 16px;
        border: 1px solid var(--ff-color-border);
        border-radius: 0.625rem;
        background: var(--ff-color-bg-surface);
    }

    &__text {
        margin: 0;
        font-size: 0.875rem;
        white-space: pre-line;
        color: var(--ff-color-text);
    }
}
</style>
