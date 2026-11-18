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
                            <ff-button kind="secondary" data-action="save-draft" :disabled="!canSave" @click="schemasStore.saveDraft({ schema: parsedSchema!, notes })">Save draft</ff-button>
                            <ff-button data-action="publish" :disabled="!canSave || editorProblems > 0" @click="publishDialog?.show()">Publish</ff-button>
                        </template>
                        <ff-button v-else-if="canEdit" data-action="create-draft" @click="schemasStore.createDraft(latestPublished?.version)">
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
                :reference-problems="referenceProblems"
                :draft="draft"
                :latest-published="latestPublished"
                :read-only="!canEdit"
            />
        </router-view>
        <PublishSchemaDialog
            ref="publishDialog"
            :schema-name="schema?.name ?? ''"
            :latest-version="latestPublished?.version ?? null"
            :draft-notes="notes"
            @publish="publish"
        />
    </ff-page>
</template>

<script setup lang="ts">
import { PlusIcon } from '@heroicons/vue/24/outline'
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { findReferenceProblems } from './components/referenceProblems'
import PublishSchemaDialog from './dialogs/PublishSchemaDialog.vue'

import StatusBadge from '@/components/StatusBadge.vue'
import usePermissions from '@/composables/Permissions.js'
import Dialog from '@/services/dialog.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'
import { useDataFarmSchemasStore } from '@/stores/data-farm-schemas'
import { useUxLoadingStore } from '@/stores/ux-loading.js'
import daysSince from '@/utils/daysSince'
import { Roles } from '@/utils/roles.js'

defineOptions({ name: 'TeamSchema' })

const route = useRoute()
const schemasStore = useDataFarmSchemasStore()
const uxLoading = useUxLoadingStore()
const { activeSchema: schema, activeDraft: draft, activeLatestPublished: latestPublished, schemaHydrated } = storeToRefs(schemasStore)
const { featuresCheck } = storeToRefs(useAccountSettingsStore())
const { hasAMinimumTeamRoleOf } = usePermissions()
const { team } = storeToRefs(useContextStore())

const notes = ref('')
const schemaText = ref('')
const editorProblems = ref(0)
const publishDialog = ref<InstanceType<typeof PublishSchemaDialog> | null>(null)

watch(() => route.params.schemaId, (schemaId) => schemasStore.loadActiveSchema(schemaId as string), { immediate: true })
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

// @TODO-SCHEMAS: ONCE #9244 ADDS THE SCOPES, GATE CREATE/SAVE/DISCARD DRAFT ON hasPermission('team:schema:edit') AND PUBLISH ON hasPermission('team:schema:publish')
const canEdit = computed(() => hasAMinimumTeamRoleOf(Roles.Member))
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
const hasUnsavedChanges = computed(() => !!draft.value && (
    JSON.stringify(parsedSchema.value) !== JSON.stringify(draft.value.schema) ||
    notes.value !== (draft.value.notes ?? '')
))

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
    if (result === 'confirm') {
        await schemasStore.discardDraft()
    }
}

async function publish (payload: { version: string, notes: string }) {
    // @TODO-SCHEMAS: CATCH THE ERROR publishDraft THROWS (#9227) AND SHOW ITS code ON THE DIALOG'S VERSION FIELD
    if (hasUnsavedChanges.value) await schemasStore.saveDraft({ schema: parsedSchema.value!, notes: notes.value })
    await schemasStore.publishDraft(payload)
    publishDialog.value?.close()
}
</script>
