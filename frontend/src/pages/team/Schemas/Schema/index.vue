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
                            <ff-button v-if="canPublish" data-action="publish" @click="publishDialog?.show()">Publish</ff-button>
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

import PublishSchemaDialog from './dialogs/PublishSchemaDialog.vue'

import StatusBadge from '@/components/StatusBadge.vue'
import usePermissions from '@/composables/Permissions.js'
import Alerts from '@/services/alerts.js'
import Dialog from '@/services/dialog.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'
import { useDataFarmSchemasStore } from '@/stores/data-farm-schemas'
import { useUxLoadingStore } from '@/stores/ux-loading.js'

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

async function publish (payload: { version: string, notes: string }) {
    if (publishing.value) return
    publishing.value = true
    try {
        await schemasStore.publishDraft(payload)
        publishDialog.value?.close()
        Alerts.emit(`Version ${payload.version} published.`, 'confirmation')
    } catch (err) {
        if (draft.value) return publishDialog.value?.setError(err.response?.data?.error || 'Failed to publish the draft.')
        publishDialog.value?.close()
        actionFailed(err, 'Failed to publish the draft.')
    } finally {
        publishing.value = false
    }
}
</script>
