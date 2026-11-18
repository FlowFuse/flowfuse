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
                        <ff-button v-if="draft && canEdit" kind="secondary" data-action="discard-draft" @click="confirmDiscard">Discard draft</ff-button>
                        <ff-button kind="secondary" data-action="validate-message" disabled>Validate a message</ff-button>
                        <template v-if="draft && canEdit">
                            <ff-button kind="secondary" data-action="save-draft" @click="saveDraft">Save draft</ff-button>
                            <ff-button data-action="publish" @click="publishDialog?.show()">Publish</ff-button>
                        </template>
                        <ff-button v-else-if="canEdit && !draft" data-action="create-draft" @click="createDraft">
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
                :read-only="readOnly"
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
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import PublishSchemaDialog from './dialogs/PublishSchemaDialog.vue'

import StatusBadge from '@/components/StatusBadge.vue'
import usePermissions from '@/composables/Permissions.js'
import Dialog from '@/services/dialog.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'
import { useDataFarmSchemasStore } from '@/stores/data-farm-schemas'
import { useUxLoadingStore } from '@/stores/ux-loading.js'
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
const publishDialog = ref<InstanceType<typeof PublishSchemaDialog> | null>(null)

watch(() => route.params.schemaId, (schemaId) => schemasStore.loadActiveSchema(schemaId as string), { immediate: true })
watch(draft, (value) => { notes.value = value?.notes ?? '' }, { immediate: true })
const routeSchemaHydrated = computed(() => schemaHydrated.value && schema.value?.id === route.params.schemaId)
watch(routeSchemaHydrated, (hydrated) => uxLoading.setPageLoader(!hydrated, 'Loading Schema...'), { immediate: true })
onBeforeUnmount(() => {
    schemasStore.reset()
    uxLoading.setPageLoader(false)
})

// @TODO-SCHEMAS: ONCE #9244 ADDS THE SCOPES, GATE CREATE/SAVE/DISCARD DRAFT ON hasPermission('team:schema:edit') AND PUBLISH ON hasPermission('team:schema:publish')
const canEdit = computed(() => hasAMinimumTeamRoleOf(Roles.Member))
const readOnly = computed(() => !draft.value || !canEdit.value)

const badge = computed(() => {
    if (draft.value) return { status: 'info', text: 'Draft' }
    if (latestPublished.value?.status === 'deprecated') return { status: 'warning', text: `Deprecated ${latestPublished.value.version}` }
    if (latestPublished.value) return { status: 'success', text: `Published ${latestPublished.value.version}` }
    return { status: 'info', text: 'No versions' }
})

const tabs = computed(() => [
    { label: 'Editor', to: { name: 'team-schema-editor', params: route.params }, tag: 'team-schema-editor' },
    { label: 'Versions', to: { name: 'team-schema-versions', params: route.params }, tag: 'team-schema-versions' }
])

function saveDraft () {
    return schemasStore.saveDraft({ notes: notes.value })
}

function createDraft () {
    return schemasStore.createDraft(latestPublished.value?.version)
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
    if (result === 'confirm') {
        await schemasStore.discardDraft()
    }
}

async function publish (payload: { version: string, notes: string }) {
    // @TODO-SCHEMAS: CATCH THE ERROR publishDraft THROWS (#9227) AND SHOW ITS code ON THE DIALOG'S VERSION FIELD
    await schemasStore.publishDraft(payload)
    publishDialog.value?.close()
}
</script>
