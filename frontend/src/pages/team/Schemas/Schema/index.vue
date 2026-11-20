<template>
    <ff-page v-if="featuresCheck.isJsonSchemasFeatureEnabled">
        <template #header>
            <ff-page-header :title="schema?.name" :tabs="tabs">
                <template #breadcrumbs>
                    <ff-nav-breadcrumb :to="{ name: 'team-schemas', params: { team_slug: team?.slug } }">Schemas</ff-nav-breadcrumb>
                    <ff-nav-breadcrumb v-if="schema?.group">{{ schema.group.name }}</ff-nav-breadcrumb>
                </template>
                <template #status>
                    <StatusBadge :status="badge.status" :text="badge.text" data-el="schema-status" />
                </template>
                <template #context>
                    <template v-if="!draft && latestPublished">
                        <p class="text-gray-800" data-el="schema-published">{{ published }}</p>
                        <p>Published versions can't be changed.<template v-if="canEdit"> Create a draft to make changes.</template></p>
                    </template>
                </template>
                <template #tools>
                    <div class="flex gap-2">
                        <ff-button v-if="editingDraft" kind="secondary" data-action="discard-draft" @click="confirmDiscard">Discard draft</ff-button>
                        <ff-button kind="secondary" data-action="validate-message" disabled>Validate a message</ff-button>
                        <template v-if="editingDraft">
                            <ff-button kind="secondary" data-action="save-draft" :disabled="!canSave || !hasUnsavedChanges" @click="saveDraft">Save draft</ff-button>
                            <ff-button v-if="canPublish" data-action="publish" :disabled="!canSave || problemCount > 0" @click="publishDialog?.show()">Publish</ff-button>
                        </template>
                        <ff-button v-else-if="canEdit" data-action="create-draft" @click="createDraft">
                            <template #icon-left><PlusIcon /></template>
                            {{ latestPublished ? `Create draft from ${latestPublished.version}` : 'Create draft' }}
                        </ff-button>
                    </div>
                </template>
            </ff-page-header>
        </template>
        <router-view v-slot="{ Component }">
            <component
                :is="Component"
                v-model:notes="notes"
                v-model:schema-text="schemaText"
                v-model:editor-problems="editorProblems"
                :markers="markers"
                :problem-count="problemCount"
                :draft="draft"
                :latest-published="latestPublished"
                :read-only="!canEdit"
            />
        </router-view>
        <PublishSchemaDialog
            ref="publishDialog"
            :schema-name="schema?.name ?? ''"
            :latest-version="latestPublished?.version ?? null"
            :existing-versions="existingVersions"
            :draft-notes="notes"
            :publishing="publishing"
            @publish="publish"
        />
    </ff-page>
</template>

<script setup lang="ts">
import { PlusIcon } from '@heroicons/vue/24/outline'
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { locateDraftProblems } from './components/draftProblems'
import { findReferenceProblems } from './components/referenceProblems'
import PublishSchemaDialog from './dialogs/PublishSchemaDialog.vue'

import StatusBadge from '@/components/StatusBadge.vue'
import usePermissions from '@/composables/Permissions.js'
import Alerts from '@/services/alerts.js'
import Dialog from '@/services/dialog.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'
import { useDataFarmSchemasStore } from '@/stores/data-farm-schemas'
import { useUxLoadingStore } from '@/stores/ux-loading.js'
import daysSince from '@/utils/daysSince'

defineOptions({ name: 'TeamSchema' })

const route = useRoute()
const router = useRouter()
const schemasStore = useDataFarmSchemasStore()
const uxLoading = useUxLoadingStore()
const { activeSchema: schema, activeDraft: draft, activeLatestPublished: latestPublished, schemaHydrated, existingVersions } = storeToRefs(schemasStore)
const { featuresCheck } = storeToRefs(useAccountSettingsStore())
const { hasPermission } = usePermissions()
const { team } = storeToRefs(useContextStore())

const notes = ref('')
const schemaText = ref('')
const editorProblems = ref(0)
const publishDialog = ref<InstanceType<typeof PublishSchemaDialog> | null>(null)
const publishing = ref(false)

watch(() => route.params.schemaId, async (schemaId) => {
    try {
        await schemasStore.loadActiveSchema(schemaId as string)
    } catch (err) {
        Alerts.emit(err.response?.data?.error || 'Failed to load the schema.', 'warning')
        router.push({ name: 'team-schemas', params: { team_slug: team.value?.slug } })
    }
}, { immediate: true })
watch(() => [schemaHydrated.value, schema.value?.id, !!draft.value, latestPublished.value?.version], () => {
    notes.value = draft.value?.notes ?? ''
    schemaText.value = JSON.stringify(draft.value?.schema ?? latestPublished.value?.schema ?? {}, null, 2)
}, { immediate: true })
const routeSchemaHydrated = computed(() => schemaHydrated.value && schema.value?.id === route.params.schemaId)
watch(routeSchemaHydrated, (hydrated) => uxLoading.setPageLoader(!hydrated, 'Loading Schema...'), { immediate: true })
onBeforeUnmount(() => {
    schemasStore.reset()
    uxLoading.setPageLoader(false)
})

const canEdit = computed(() => hasPermission('team:schema:edit'))
const canPublish = computed(() => hasPermission('team:schema:publish'))
const editingDraft = computed(() => !!draft.value && canEdit.value)

const parsedSchema = computed<Record<string, unknown> | null>(() => {
    try {
        const value = JSON.parse(schemaText.value)
        return value && typeof value === 'object' && !Array.isArray(value) ? value : null
    } catch {
        return null
    }
})
const referenceProblems = computed(() => findReferenceProblems(schemaText.value))
const canSave = computed(() => !!parsedSchema.value && referenceProblems.value.length === 0)
// The backend strips the root $id on save
const schemaChanged = computed(() => {
    if (!draft.value) return false
    if (!parsedSchema.value) return true
    const { $id: _rootId, ...schema } = parsedSchema.value
    return JSON.stringify(schema) !== JSON.stringify(draft.value.schema)
})
const hasUnsavedChanges = computed(() => schemaChanged.value || (!!draft.value && notes.value !== (draft.value.notes ?? '')))
const draftProblems = computed(() => draft.value && !schemaChanged.value ? locateDraftProblems(schemaText.value, draft.value.problems) : [])
const markers = computed(() => [...referenceProblems.value, ...draftProblems.value])
// Monaco only counts these markers once it has loaded
const problemCount = computed(() => Math.max(editorProblems.value, markers.value.length))

const badge = computed(() => {
    if (draft.value) return { status: 'info', text: 'Draft' }
    if (latestPublished.value?.status === 'deprecated') return { status: 'warning', text: `Deprecated ${latestPublished.value.version}` }
    if (latestPublished.value) return { status: 'success', text: `Published ${latestPublished.value.version}` }
    return { status: 'info', text: 'No versions' }
})

const published = computed(() => {
    const version = latestPublished.value
    if (!version) return ''
    const by = version.publishedBy ? ` by ${version.publishedBy.name}` : ''
    return `Published ${daysSince(version.publishedAt)}${by}`
})

const tabs = [
    { label: 'Editor', to: { name: 'team-schema-editor' }, tag: 'team-schema-editor' },
    { label: 'Versions', to: { name: 'team-schema-versions' }, tag: 'team-schema-versions' }
]

async function confirmDiscard () {
    const result = await Dialog.showAsync({
        header: 'Discard draft',
        text: latestPublished.value
            ? `Discard your changes? The schema goes back to version ${latestPublished.value.version}.`
            : 'Discard this draft? The schema has no published version to go back to.',
        confirmLabel: 'Discard',
        kind: 'danger'
    })
    if (result !== 'confirm') return
    try {
        await schemasStore.discardDraft()
        Alerts.emit('Draft discarded.', 'confirmation')
    } catch (err) {
        Alerts.emit(err.response?.data?.error || 'Failed to discard the draft.', 'warning')
    }
}

async function saveDraft () {
    try {
        await schemasStore.saveDraft({ schema: parsedSchema.value!, notes: notes.value })
        Alerts.emit('Draft saved.', 'confirmation')
    } catch (err) {
        Alerts.emit(err.response?.data?.error || 'Failed to save the draft.', 'warning')
    }
}

async function createDraft () {
    try {
        await schemasStore.createDraft(latestPublished.value?.version ?? undefined)
    } catch (err) {
        Alerts.emit(err.response?.data?.error || 'Failed to create a draft.', 'warning')
    }
}

const VERSION_ERRORS = ['invalid_version', 'version_exists', 'version_not_higher']

async function publish (payload: { version: string, notes: string }) {
    if (publishing.value) return
    publishing.value = true
    try {
        if (hasUnsavedChanges.value) await schemasStore.saveDraft({ schema: parsedSchema.value!, notes: notes.value })
        await schemasStore.publishDraft(payload)
        publishDialog.value?.close()
        Alerts.emit(`Version ${payload.version} published.`, 'confirmation')
    } catch (err) {
        const message = err.response?.data?.error || 'Failed to publish the draft.'
        if (draft.value && VERSION_ERRORS.includes(err.response?.data?.code)) return publishDialog.value?.setError(message)
        publishDialog.value?.close()
        Alerts.emit(message, 'warning')
    } finally {
        publishing.value = false
    }
}
</script>
