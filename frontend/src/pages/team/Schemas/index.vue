<template>
    <ff-page v-if="featuresCheck.isJsonSchemasFeatureEnabled">
        <template #header>
            <ff-page-header title="Schemas">
                <template #context>
                    Define the shape of the data your flows send and receive. Nodes validate messages against a published version of a schema.
                </template>
                <template #tools>
                    <ff-button v-if="hasPermission('team:schema:create')" data-action="create-schema" @click="showCreateDialog">
                        <template #icon-left><PlusIcon /></template>
                        Create schema
                    </ff-button>
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
                    @load-more="schemasStore.loadMoreOfGroup($event).catch(failed('Failed to load more schemas.'))"
                />
            </div>
        </template>
    </ff-page>
</template>

<script setup lang="ts">
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/vue/24/outline'
import { storeToRefs } from 'pinia'
import { computed, markRaw, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import SchemasEmptyIllustration from './components/SchemasEmptyIllustration.vue'
import SchemasTable from './components/SchemasTable.vue'
import CreateSchemaDialog from './dialogs/CreateSchemaDialog.vue'

import EmptyState from '@/components/EmptyState.vue'
import usePermissions from '@/composables/Permissions.js'
import Alerts from '@/services/alerts.js'
import Dialog from '@/services/dialog.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'
import { UNGROUPED, useDataFarmSchemasStore } from '@/stores/data-farm-schemas'
import { useUxDialogStore } from '@/stores/ux-dialog.js'
import { useUxLoadingStore } from '@/stores/ux-loading.js'
import { debounce } from '@/utils/eventHandling'

defineOptions({ name: 'TeamSchemas' })

const router = useRouter()
const schemasStore = useDataFarmSchemasStore()
const dialogStore = useUxDialogStore()
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
    let details = { name: '', description: '', groupId: '' }
    let creating = false
    // set when the dialog is cancelled while the schema is still being created, which can't be taken back
    let cancelled = false
    Dialog.show({
        header: 'Create schema',
        confirmLabel: 'Create',
        closeOnConfirm: false,
        is: {
            component: markRaw(CreateSchemaDialog),
            payload: { error: '', creating: false, groups: groups.value },
            on: {
                change: (value: typeof details) => {
                    details = value
                    dialogStore.updateDialogPayload({ error: '' })
                }
            }
        }
    }, async () => {
        if (creating) return
        creating = true
        dialogStore.updateDialogPayload({ creating: true })
        try {
            const schema = await schemasStore.createSchema(details)
            if (cancelled) return Alerts.emit(`Schema ${schema.name} created.`, 'confirmation')
            Dialog.close()
            router.push({ name: 'team-schema', params: { team_slug: team.value?.slug, schemaId: schema.id } })
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to create the schema.'
            if (cancelled) return Alerts.emit(message, 'warning')
            dialogStore.updateDialogPayload({ error: message })
        } finally {
            creating = false
            if (!cancelled) dialogStore.updateDialogPayload({ creating: false })
        }
    }, () => { cancelled = true })
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
