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
                    <span v-if="!draft">Published versions can't be changed.<template v-if="canEdit"> Create a draft to make changes.</template></span>
                </template>
                <template #tools>
                    <div class="flex gap-2">
                        <ff-button v-if="editingDraft" kind="secondary" data-action="discard-draft" @click="confirmDiscard">Discard draft</ff-button>
                        <ff-button kind="secondary" data-action="validate-message" disabled>Validate a message</ff-button>
                        <template v-if="editingDraft">
                            <ff-button kind="secondary" data-action="save-draft" @click="saveDraft">Save draft</ff-button>
                            <ff-button v-if="canPublish" data-action="publish" @click="showPublishDialog">Publish</ff-button>
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
import { computed, markRaw, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

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
const publishing = ref(false)

watch(() => route.params.schemaId, async (schemaId) => {
    try {
        await schemasStore.loadActiveSchema(schemaId as string)
    } catch (err) {
        Alerts.emit(err.response?.data?.error || 'Failed to load the schema.', 'warning')
        router.push({ name: 'team-schemas', params: { team_slug: team.value?.slug } })
    }
}, { immediate: true })
// Follows the draft when it appears, goes away or is saved. A reload that brings the same draft back leaves what was typed alone.
watch([() => !!draft.value, () => draft.value?.notes], () => { notes.value = draft.value?.notes ?? '' }, { immediate: true })
const routeSchemaHydrated = computed(() => schemaHydrated.value && schema.value?.id === route.params.schemaId)
watch(routeSchemaHydrated, (hydrated) => uxLoading.setPageLoader(!hydrated, 'Loading Schema...'), { immediate: true })
onBeforeUnmount(() => {
    schemasStore.reset()
    uxLoading.setPageLoader(false)
})

const canEdit = computed(() => hasPermission('team:schema:edit'))
const canPublish = computed(() => hasPermission('team:schema:publish'))
const editingDraft = computed(() => !!draft.value && canEdit.value)

const badge = computed(() => {
    if (draft.value) return { status: 'info', text: 'Draft' }
    if (latestPublished.value?.status === 'deprecated') return { status: 'warning', text: `Deprecated ${latestPublished.value.version}` }
    if (latestPublished.value) return { status: 'success', text: `Published ${latestPublished.value.version}` }
    return { status: 'info', text: 'No versions' }
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

async function saveDraft () {
    try {
        await schemasStore.saveDraft({ notes: notes.value })
        Alerts.emit('Draft saved.', 'confirmation')
    } catch (err) {
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

// what the dialog shows of the schema, which changes when a failed publish reloads it
const publishDialogVersions = () => ({ latestVersion: latestPublished.value?.version ?? null, existingVersions: existingVersions.value })

function showPublishDialog () {
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
    try {
        await schemasStore.publishDraft(payload)
        if (!dialogCancelled()) Dialog.close()
        Alerts.emit(`Version ${payload.version} published.`, 'confirmation')
    } catch (err) {
        if (dialogCancelled()) return actionFailed(err, 'Failed to publish the draft.')
        if (draft.value) return dialogStore.updateDialogPayload({ ...publishDialogVersions(), error: err.response?.data?.error || 'Failed to publish the draft.' })
        Dialog.close()
        actionFailed(err, 'Failed to publish the draft.')
    } finally {
        publishing.value = false
        if (!dialogCancelled()) dialogStore.updateDialogPayload({ publishing: false })
    }
}
</script>
