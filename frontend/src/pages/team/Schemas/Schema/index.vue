<template>
    <ff-page v-if="featuresCheck.isJsonSchemasFeatureEnabled">
        <template #header>
            <ff-page-header :title="schema?.name" :tabs="tabs">
                <template #breadcrumbs>
                    <ff-nav-breadcrumb :to="{ name: 'team-schemas', params: { team_slug: team?.slug } }">Schemas</ff-nav-breadcrumb>
                    <ff-nav-breadcrumb v-if="schema?.group" has-chevron>{{ schema.group.name }}</ff-nav-breadcrumb>
                </template>
                <template #status>
                    <StatusBadge :status="badge.status" :text="badge.text" data-el="schema-status" />
                    <StatusBadge v-if="hasUnsavedChanges" status="warning-outline" text="Unsaved changes" data-el="schema-unsaved" />
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
                            <ff-button v-if="canPublish" data-action="publish" :disabled="!canSave || problemCount > 0" @click="showPublishDialog">Publish</ff-button>
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
    </ff-page>
</template>

<script setup lang="ts">
import { PlusIcon } from '@heroicons/vue/24/outline'
import { storeToRefs } from 'pinia'
import { computed, markRaw, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'

import { locateDraftProblems } from './components/draftProblems'
import { findReferenceProblems } from './components/referenceProblems'
import { findShapeProblems } from './components/shapeProblems'
import PublishSchemaDialog from './dialogs/PublishSchemaDialog.vue'

import StatusBadge from '@/components/StatusBadge.vue'
import usePermissions from '@/composables/Permissions.js'
import Alerts from '@/services/alerts.js'
import Dialog from '@/services/dialog.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'
import { useDataFarmSchemasStore } from '@/stores/data-farm-schemas'
import { useUxDialogStore } from '@/stores/ux-dialog.js'
import { useUxLoadingStore } from '@/stores/ux-loading.js'
import daysSince from '@/utils/daysSince'

defineOptions({ name: 'TeamSchema' })

const route = useRoute()
const router = useRouter()
const schemasStore = useDataFarmSchemasStore()
const dialogStore = useUxDialogStore()
const uxLoading = useUxLoadingStore()
const { activeSchema: schema, activeDraft: draft, activeLatestPublished: latestPublished, schemaHydrated, existingVersions } = storeToRefs(schemasStore)
const { featuresCheck } = storeToRefs(useAccountSettingsStore())
const { hasPermission } = usePermissions()
const { team } = storeToRefs(useContextStore())

const notes = ref('')
const schemaText = ref('')
const editorProblems = ref(0)
const publishing = ref(false)

watch(() => route.params.schemaId, async (schemaId) => {
    try {
        await schemasStore.loadActiveSchema(schemaId as string)
    } catch (err) {
        Alerts.emit(err.response?.data?.error || 'Failed to load the schema.', 'warning')
        router.push({ name: 'team-schemas', params: { team_slug: team.value?.slug } })
    }
}, { immediate: true })
watch([schemaHydrated, () => schema.value?.id, () => !!draft.value, () => latestPublished.value?.version], () => {
    notes.value = draft.value?.notes ?? ''
    schemaText.value = JSON.stringify(draft.value?.schema ?? latestPublished.value?.schema ?? {}, null, 2)
    // the editor's count was for the text this replaces, and the editor may not be on screen to count again
    editorProblems.value = 0
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
const canSave = computed(() => !!parsedSchema.value && referenceProblems.value.length === 0 && shapeProblems.value.length === 0)

// Key order doesn't change a schema, so compare with keys sorted
function canonicalJson (value: unknown): string {
    return JSON.stringify(value, (_key, inner) => inner && typeof inner === 'object' && !Array.isArray(inner)
        ? Object.fromEntries(Object.keys(inner).sort().map(key => [key, inner[key]]))
        : inner)
}
// The backend strips the root $id on save
const schemaChanged = computed(() => {
    if (!draft.value) return false
    if (!parsedSchema.value) return true
    const { $id: _rootId, ...schema } = parsedSchema.value
    return canonicalJson(schema) !== canonicalJson(draft.value.schema)
})
const hasUnsavedChanges = computed(() => schemaChanged.value || (!!draft.value && notes.value !== (draft.value.notes ?? '')))
const draftProblems = computed(() => draft.value && !schemaChanged.value ? locateDraftProblems(schemaText.value, draft.value.problems) : [])
const shapeProblems = computed(() => findShapeProblems(schemaText.value))
const markers = computed(() => [...shapeProblems.value, ...referenceProblems.value, ...draftProblems.value])
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

// Says why an action failed, and goes back to the list when the schema turned out to be gone.
// Leaving the page also clears the schema, so only redirect while still on a schema route.
function actionFailed (err, fallback: string) {
    Alerts.emit(err.response?.data?.error || fallback, 'warning')
    if (!schema.value && route.params.schemaId) router.push({ name: 'team-schemas', params: { team_slug: team.value?.slug } })
}

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
        actionFailed(err, 'Failed to discard the draft.')
    }
}

const DRAFT_GONE = ['draft_changed', 'not_found']

// The draft was published or discarded elsewhere while this page had unsaved edits.
// `failure` is why the last try at a new draft did not work: the offer is then made again, as these changes are held nowhere else.
async function offerNewDraft (changes: { schema: Record<string, unknown>, notes: string }, failure?: string) {
    // The offer stays up when the page moves on, so by the time it is answered, or the draft request is,
    // another schema may be open or none at all. The changes are for this schema only.
    const schemaId = schema.value?.id
    const movedOn = () => schema.value?.id !== schemaId
    const result = await Dialog.showAsync({
        header: 'Your changes were not saved',
        text: failure
            ? `Starting a new draft with your changes failed: ${failure}\nTry again?`
            : 'This draft was published or discarded by someone else. Start a new draft with your changes?',
        confirmLabel: failure ? 'Try again' : 'Start new draft'
    })
    if (result !== 'confirm' || movedOn()) return
    try {
        const created = await schemasStore.createDraft(latestPublished.value?.version, changes)
        if (created) return Alerts.emit('New draft started with your changes.', 'confirmation')
        if (movedOn()) return
        // Someone else started a draft meanwhile and it was loaded instead. The changes go back into the editor,
        // once it has taken that draft's text, so they are not lost and it is up to the user to save over it.
        await nextTick()
        schemaText.value = JSON.stringify(changes.schema, null, 2)
        notes.value = changes.notes
        Alerts.emit('Someone else already started a new draft. Your changes are in the editor but are not saved.', 'warning')
    } catch (err) {
        if (movedOn()) return
        return offerNewDraft(changes, err.response?.data?.error || 'Failed to create a draft.')
    }
}

async function saveDraft () {
    const changes = { schema: parsedSchema.value!, notes: notes.value }
    try {
        await schemasStore.saveDraft(changes)
        Alerts.emit('Draft saved.', 'confirmation')
    } catch (err) {
        if (schema.value && DRAFT_GONE.includes(err.response?.data?.code)) return offerNewDraft(changes)
        actionFailed(err, 'Failed to save the draft.')
    }
}

async function createDraft () {
    try {
        await schemasStore.createDraft(latestPublished.value?.version ?? undefined)
    } catch (err) {
        actionFailed(err, 'Failed to create a draft.')
    }
}

const VERSION_ERRORS = ['invalid_version', 'version_exists', 'version_not_higher']

// what the dialog shows of the schema, which changes when a failed publish reloads it
const publishDialogVersions = () => ({ latestVersion: latestPublished.value?.version ?? null, existingVersions: existingVersions.value })

function showPublishDialog () {
    if (publishing.value) return Alerts.emit('A publish is still in progress.', 'warning')
    let form = { version: '', notes: notes.value }
    // set when the dialog is cancelled while a publish is still running, which can't be taken back
    let cancelled = false
    Dialog.show({
        header: `Publish ${schema.value?.name ?? ''}`,
        confirmLabel: 'Publish',
        closeOnConfirm: false,
        is: {
            component: markRaw(PublishSchemaDialog),
            payload: { ...publishDialogVersions(), draftNotes: notes.value, error: '', publishing: false },
            on: {
                change: (value: { version: string, notes: string }) => {
                    form = value
                    dialogStore.updateDialogPayload({ error: '' })
                }
            }
        }
    }, () => publish(form, () => cancelled), () => { cancelled = true })
}

// `dialogCancelled` says whether the dialog was cancelled meanwhile: its outcome then shows as an alert, as the dialog is gone
async function publish (payload: { version: string, notes: string }, dialogCancelled: () => boolean) {
    if (publishing.value) return
    publishing.value = true
    dialogStore.updateDialogPayload({ publishing: true })
    const unsaved = hasUnsavedChanges.value ? { schema: parsedSchema.value!, notes: notes.value } : null
    try {
        if (unsaved) await schemasStore.saveDraft(unsaved)
        await schemasStore.publishDraft(payload)
        if (!dialogCancelled()) Dialog.close()
        Alerts.emit(`Version ${payload.version} published.`, 'confirmation')
    } catch (err) {
        const code = err.response?.data?.code
        if (!dialogCancelled()) {
            // a version to correct stays in the dialog, anything else closes it
            if (draft.value && VERSION_ERRORS.includes(code)) return dialogStore.updateDialogPayload({ ...publishDialogVersions(), error: err.response?.data?.error || 'Failed to publish the draft.' })
            Dialog.close()
        }
        if (schema.value && unsaved && DRAFT_GONE.includes(code)) return offerNewDraft(unsaved)
        actionFailed(err, 'Failed to publish the draft.')
    } finally {
        publishing.value = false
        if (!dialogCancelled()) dialogStore.updateDialogPayload({ publishing: false })
    }
}

function warnBeforeUnload (event: BeforeUnloadEvent) {
    if (hasUnsavedChanges.value) event.preventDefault()
}
window.addEventListener('beforeunload', warnBeforeUnload)
onBeforeUnmount(() => window.removeEventListener('beforeunload', warnBeforeUnload))
async function confirmLeaving () {
    if (!hasUnsavedChanges.value) return true
    const result = await Dialog.showAsync({
        header: 'Unsaved changes',
        text: 'You have unsaved changes to this draft. Leave without saving?',
        confirmLabel: 'Leave',
        kind: 'danger'
    })
    return result === 'confirm'
}
onBeforeRouteLeave(confirmLeaving)
// Going straight to another schema keeps this page, so it is not a leave, but the edits would be dropped all the same.
// Switching between the Editor and Versions tabs is an update too, and loses nothing.
onBeforeRouteUpdate((to, from) => to.params.schemaId === from.params.schemaId || confirmLeaving())
</script>
