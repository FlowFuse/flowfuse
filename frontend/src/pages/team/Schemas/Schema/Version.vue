<template>
    <div v-if="version" class="flex flex-col gap-6" data-el="schema-version">
        <TabToolbar>
            <BackToVersions />
            <span class="font-medium" data-el="version-number">{{ version.version }}</span>
            <StatusBadge :status="status.status" :text="status.text" data-el="version-status" />
            <span class="schema-version__published" data-el="version-published">{{ published }}</span>
            <template #tools>
                <ff-button v-if="clipboardSupported" kind="secondary" data-action="copy-json" @click="copy">Copy</ff-button>
            </template>
        </TabToolbar>
        <JsonEditor v-model="schemaText" :read-only="true" />
        <div v-if="version.notes" data-el="version-notes">
            <p class="schema-version__label">
                <DocumentTextIcon class="ff-icon" />
                Version notes
            </p>
            <p class="schema-version__notes">{{ version.notes }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { DocumentTextIcon } from '@heroicons/vue/24/outline'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import BackToVersions from './components/BackToVersions.vue'
import TabToolbar from './components/TabToolbar.vue'

import JsonEditor from '@/components/JsonEditor.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import Alerts from '@/services/alerts.js'
import { useDataFarmSchemasStore } from '@/stores/data-farm-schemas'
import type { DataSchemaVersion } from '@/types'
import daysSince from '@/utils/daysSince'

// the schema page hands every tab the editor's state, which this one has no use for
defineOptions({ name: 'SchemaVersion', inheritAttrs: false })

const route = useRoute()
const router = useRouter()
const schemasStore = useDataFarmSchemasStore()

const version = ref<DataSchemaVersion | null>(null)
const schemaText = computed({
    get: () => JSON.stringify(version.value?.schema ?? {}, null, 2),
    // the editor is read-only, so there is nothing to take back from it
    set: () => {}
})

// Waits for the schema page to have its schema, as a version is asked for by the schema it belongs to
watch([() => route.params.version, () => schemasStore.activeSchema?.id], async ([wanted, schemaId]) => {
    version.value = null
    if (!wanted || !schemaId) return
    try {
        const loaded = await schemasStore.fetchVersion(wanted as string)
        if (route.params.version === wanted && schemasStore.activeSchema?.id === schemaId) version.value = loaded
    } catch (err) {
        if (route.params.version !== wanted) return
        Alerts.emit(err.response?.data?.error || 'Failed to load the version.', 'warning')
        router.replace({ name: 'team-schema-versions' })
    }
}, { immediate: true })

// navigator.clipboard only exists on HTTPS or localhost
const clipboardSupported = !!navigator.clipboard?.writeText

async function copy () {
    try {
        await navigator.clipboard.writeText(schemaText.value)
        Alerts.emit('Copied to Clipboard.', 'confirmation')
    } catch {
        Alerts.emit('Failed to copy to the clipboard.', 'warning')
    }
}

const status = computed(() => version.value?.status === 'deprecated'
    ? { status: 'warning', text: 'Deprecated' }
    : { status: 'success', text: 'Published' })

const published = computed(() => {
    const by = version.value?.publishedBy ? ` by ${version.value.publishedBy.name}` : ''
    return `Published ${daysSince(version.value?.publishedAt)}${by}`
})
</script>

<style scoped lang="scss">
.schema-version {
    &__published {
        color: var(--ff-color-text-subtle);
    }

    &__label {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        margin: 0 0 0.5rem;
        font-size: 0.875rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--ff-color-text-subtle);

        .ff-icon {
            margin-left: 0;
        }
    }

    &__notes {
        margin: 0;
        font-size: 0.875rem;
        white-space: pre-line;
    }
}
</style>
