<template>
    <ff-data-table :columns="columns" data-el="schema-versions">
        <template #rows>
            <ff-data-table-row v-if="versions.length === 0">
                <ff-data-table-cell class="status-message" :colspan="columns.length" data-el="schema-no-versions">
                    This schema has no versions yet
                </ff-data-table-cell>
            </ff-data-table-row>
            <ff-data-table-row v-for="entry in versions" :key="entry.version ?? 'draft'" :data-el="`schema-version-${entry.version ?? 'draft'}`">
                <ff-data-table-cell data-el="version-number">
                    <router-link v-if="entry.status === 'draft'" class="schema-version__link" :to="{ name: 'team-schema-editor' }">Draft</router-link>
                    <span v-else class="font-mono">{{ entry.version }}</span>
                </ff-data-table-cell>
                <ff-data-table-cell data-el="version-status">
                    <StatusBadge :status="STATUS[entry.status].status" :text="STATUS[entry.status].text" />
                </ff-data-table-cell>
                <ff-data-table-cell class="schema-version__notes-cell" data-el="version-notes">
                    <p v-if="entry.notes" class="schema-version__notes truncate" :title="entry.notes">{{ entry.notes }}</p>
                </ff-data-table-cell>
                <!-- a draft has no publisher yet, so it shows who started it and when -->
                <ff-data-table-cell data-el="version-by">{{ (entry.status === 'draft' ? entry.createdBy : entry.publishedBy)?.name }}</ff-data-table-cell>
                <ff-data-table-cell data-el="version-when">
                    {{ entry.status === 'draft' ? `Created ${daysSince(entry.createdAt, true)}` : daysSince(entry.publishedAt, true) }}
                </ff-data-table-cell>
                <ff-data-table-cell v-if="hasMenu">
                    <ff-kebab-menu v-if="entry.version">
                        <ff-kebab-item
                            v-if="canEdit"
                            :label="`Create draft from ${entry.version}`"
                            :disabled="hasDraft"
                            :title="hasDraft ? 'Discard the draft first' : undefined"
                            @click="createDraftFrom(entry.version)"
                        />
                        <template v-if="canDeprecate">
                            <ff-kebab-item v-if="entry.status === 'deprecated'" :label="`Restore ${entry.version}`" @click="restore(entry.version)" />
                            <ff-kebab-item v-else :label="`Deprecate ${entry.version}`" kind="danger" @click="confirmDeprecate(entry.version)" />
                        </template>
                    </ff-kebab-menu>
                </ff-data-table-cell>
            </ff-data-table-row>
        </template>
    </ff-data-table>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import StatusBadge from '@/components/StatusBadge.vue'
import usePermissions from '@/composables/Permissions.js'
import Alerts from '@/services/alerts.js'
import Dialog from '@/services/dialog.js'
import { useDataFarmSchemasStore } from '@/stores/data-farm-schemas'
import daysSince from '@/utils/daysSince'

// the schema page hands every tab the editor's state, which this one has no use for
defineOptions({ name: 'SchemaVersions', inheritAttrs: false })

const STATUS = {
    draft: { status: 'info', text: 'Draft' },
    published: { status: 'success', text: 'Published' },
    deprecated: { status: 'warning', text: 'Deprecated' }
}

const router = useRouter()
const schemasStore = useDataFarmSchemasStore()
const { activeSchema: schema } = storeToRefs(schemasStore)
const { hasPermission } = usePermissions()

// newest first, with the draft on top
const versions = computed(() => schema.value?.versions ?? [])
const hasDraft = computed(() => versions.value.some(entry => entry.status === 'draft'))

const canEdit = computed(() => hasPermission('team:schema:edit'))
const canDeprecate = computed(() => hasPermission('team:schema:deprecate'))
const hasMenu = computed(() => canEdit.value || canDeprecate.value)

const columns = computed(() => [
    { label: 'Version', key: 'version', class: ['w-32'] },
    { label: 'Status', key: 'status', class: ['w-36'] },
    { label: 'Notes', key: 'notes' },
    { label: 'Published by', key: 'publishedBy', class: ['w-48'] },
    { label: 'Published', key: 'publishedAt', class: ['w-44'] },
    ...(hasMenu.value ? [{ label: '', key: 'actions', class: ['w-16'] }] : [])
])

const failed = (err, fallback: string) => Alerts.emit(err.response?.data?.error || fallback, 'warning')

async function createDraftFrom (version: string) {
    try {
        const created = await schemasStore.createDraft(version)
        if (!created) Alerts.emit('This schema already has a draft, which was opened instead.', 'warning')
        router.push({ name: 'team-schema-editor' })
    } catch (err) {
        failed(err, 'Failed to create a draft.')
    }
}

async function confirmDeprecate (version: string) {
    const result = await Dialog.showAsync({
        header: `Deprecate ${version}`,
        text: `Deprecate version ${version}? Flows using it keep working, and it can be restored later.`,
        confirmLabel: 'Deprecate',
        kind: 'danger'
    })
    if (result !== 'confirm') return
    try {
        await schemasStore.setVersionDeprecated(version, true)
        Alerts.emit(`Version ${version} deprecated.`, 'confirmation')
    } catch (err) {
        failed(err, 'Failed to deprecate the version.')
    }
}

async function restore (version: string) {
    try {
        await schemasStore.setVersionDeprecated(version, false)
        Alerts.emit(`Version ${version} restored.`, 'confirmation')
    } catch (err) {
        failed(err, 'Failed to restore the version.')
    }
}
</script>

<style scoped lang="scss">
.schema-version {
    &__link {
        font-weight: 500;
        color: var(--ff-color-link);

        &:hover {
            text-decoration: underline;
        }
    }

    // lets the cell shrink below its content, so long notes are cut short and the other columns keep their place
    &__notes-cell {
        max-width: 0;
    }

    &__notes {
        margin: 0;
        cursor: default;
    }
}
</style>
