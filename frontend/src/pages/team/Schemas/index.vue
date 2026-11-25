<template>
    <ff-page v-if="featuresCheck.isJsonSchemasFeatureEnabled">
        <template #header>
            <ff-page-header title="Schemas">
                <template #context>
                    Define the shape of the data your flows send and receive. Nodes validate messages against a published version of a schema.
                </template>
                <template #tools>
                    <div class="flex gap-2">
                        <ff-button v-if="hasPermission('team:schema:create')" kind="secondary" data-action="new-schema-group" @click="showNewGroupDialog">
                            <template #icon-left><PlusIcon /></template>
                            New group
                        </ff-button>
                        <ff-button v-if="hasPermission('team:schema:create')" data-action="create-schema" @click="showCreateDialog">
                            <template #icon-left><PlusIcon /></template>
                            Create schema
                        </ff-button>
                    </div>
                </template>
            </ff-page-header>
        </template>
        <template v-if="listHydrated">
            <EmptyState v-if="isEmpty" data-el="schemas-empty">
                <template #img>
                    <SchemasEmptyIllustration />
                </template>
                <template #header>No schemas yet</template>
                <template #message>
                    <p>A schema describes the shape of a message, so the nodes in your flows can check the data they send and receive.</p>
                </template>
                <template v-if="hasPermission('team:schema:create')" #actions>
                    <ff-button data-action="create-first-schema" @click="showCreateDialog">
                        <template #icon-left><PlusIcon /></template>
                        Create schema
                    </ff-button>
                </template>
            </EmptyState>
            <div v-else class="flex flex-col gap-4">
                <div class="flex flex-wrap items-center gap-4">
                    <ff-text-input v-model="searchText" class="schemas-search" placeholder="Search schemas" data-form="search-schemas">
                        <template #icon><MagnifyingGlassIcon /></template>
                    </ff-text-input>
                    <span class="schemas-summary" data-el="schemas-summary">{{ summary }}</span>
                </div>
                <SchemasTable
                    :groups="groups"
                    :group-schemas="groupSchemas"
                    :query="listQuery"
                    :can-rename="hasPermission('team:schema:edit')"
                    :can-delete="hasPermission('team:schema:delete')"
                    :can-edit="hasPermission('team:schema:edit')"
                    @edit-schema="showEditSchemaDialog($event, groups)"
                    @rename-group="showRenameGroupDialog"
                    @delete-group="showDeleteGroupDialog"
                    @load-more="schemasStore.loadMoreOfGroup($event).catch(failed('Failed to load more schemas.'))"
                />
            </div>
        </template>
    </ff-page>
</template>

<script setup lang="ts">
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/vue/24/outline'
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import SchemasEmptyIllustration from './components/SchemasEmptyIllustration.vue'
import SchemasTable from './components/SchemasTable.vue'
import { showEditSchemaDialog, showFormDialog } from './composables/schemaDialogs'
import GroupDialog from './dialogs/GroupDialog.vue'
import SchemaDetailsDialog from './dialogs/SchemaDetailsDialog.vue'

import EmptyState from '@/components/EmptyState.vue'
import usePermissions from '@/composables/Permissions.js'
import Alerts from '@/services/alerts.js'
import Dialog from '@/services/dialog.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'
import { UNGROUPED, useDataFarmSchemasStore } from '@/stores/data-farm-schemas'
import { useUxLoadingStore } from '@/stores/ux-loading.js'
import type { DataSchemaGroup } from '@/types'
import { debounce } from '@/utils/eventHandling'

defineOptions({ name: 'TeamSchemas' })

const router = useRouter()
const schemasStore = useDataFarmSchemasStore()
const { featuresCheck } = storeToRefs(useAccountSettingsStore())
const { team } = storeToRefs(useContextStore())
const { hasPermission } = usePermissions()

const { groups, groupSchemas, listHydrated, listQuery } = storeToRefs(schemasStore)
const uxLoading = useUxLoadingStore()
const searchText = ref('')

const failed = (fallback: string) => (err) => Alerts.emit(err.response?.data?.error || fallback, 'warning')

// The team is not known yet on a hard refresh, and the list is the team's
watch(() => team.value?.id, (teamId) => {
    if (!teamId || !featuresCheck.value.isJsonSchemasFeatureEnabled) return
    schemasStore.resetList()
    schemasStore.loadList(searchText.value.trim()).catch(failed('Failed to load the schemas.'))
}, { immediate: true })
watch(listHydrated, (hydrated) => uxLoading.setPageLoader(!hydrated, 'Loading Schemas...'), { immediate: true })
watch(searchText, debounce((text: string) => schemasStore.loadList(text.trim()).catch(failed('Failed to search the schemas.')), 300))
onBeforeUnmount(() => {
    schemasStore.resetList()
    uxLoading.setPageLoader(false)
})

const pluralize = (noun: string, count: number) => `${count} ${noun}${count === 1 ? '' : 's'}`
const schemaCount = computed(() => Object.values(groupSchemas.value).reduce((total, page) => total + page.count, 0))
const isEmpty = computed(() => !listQuery.value && groups.value.length === 0 && !groupSchemas.value[UNGROUPED]?.count)
const summary = computed(() => listQuery.value
    ? pluralize('result', schemaCount.value)
    : `${pluralize('schema', schemaCount.value)} in ${pluralize('group', groups.value.length)}`)

function showCreateDialog () {
    showFormDialog({
        header: 'Create schema',
        confirmLabel: 'Create',
        component: SchemaDetailsDialog,
        payload: { groups: groups.value },
        values: { name: '', description: '', groupId: '' },
        submit: (details) => schemasStore.createSchema(details),
        done: (schema, cancelled) => {
            if (cancelled) return Alerts.emit(`Schema ${schema.name} created.`, 'confirmation')
            router.push({ name: 'team-schema', params: { team_slug: team.value?.slug, schemaId: schema.id } })
        },
        failure: 'Failed to create the schema.'
    })
}

function showNewGroupDialog () {
    showFormDialog({
        header: 'New group',
        confirmLabel: 'Create',
        component: GroupDialog,
        values: '',
        submit: (name) => schemasStore.createGroup(name).then(() => name),
        done: (name) => Alerts.emit(`Group ${name} created.`, 'confirmation'),
        failure: 'Failed to create the group.'
    })
}

function showRenameGroupDialog (group: DataSchemaGroup) {
    showFormDialog({
        header: 'Rename group',
        confirmLabel: 'Rename',
        component: GroupDialog,
        payload: { name: group.name },
        values: group.name,
        submit: (name) => schemasStore.renameGroup(group.id, name).then(() => name),
        done: (name) => Alerts.emit(`Group renamed to ${name}.`, 'confirmation'),
        failure: 'Failed to rename the group.'
    })
}

function showDeleteGroupDialog (group: DataSchemaGroup) {
    const kept = group.schemaCount === 1 ? 'Its schema is kept and moves to Ungrouped.' : `Its ${group.schemaCount} schemas are kept and move to Ungrouped.`
    Dialog.show({
        header: 'Delete group',
        text: `Are you sure you want to delete the group ${group.name}?${group.schemaCount ? ` ${kept}` : ''}`,
        confirmLabel: 'Delete',
        kind: 'danger'
    }, () => schemasStore.deleteGroup(group.id)
        .then(() => Alerts.emit(`Group ${group.name} deleted.`, 'confirmation'))
        .catch(failed('Failed to delete the group.')))
}
</script>

<style scoped lang="scss">
.schemas-search {
    width: 20rem;
    max-width: 100%;
}

.schemas-summary {
    font-size: 0.875rem;
    color: var(--ff-color-text-subtle);
}
</style>
