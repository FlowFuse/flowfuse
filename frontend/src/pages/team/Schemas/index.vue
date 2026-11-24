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
    </ff-page>
</template>

<script setup lang="ts">
import { PlusIcon } from '@heroicons/vue/24/outline'
import { storeToRefs } from 'pinia'
import { markRaw } from 'vue'
import { useRouter } from 'vue-router'

import CreateSchemaDialog from './dialogs/CreateSchemaDialog.vue'

import usePermissions from '@/composables/Permissions.js'
import Alerts from '@/services/alerts.js'
import Dialog from '@/services/dialog.js'
import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'
import { useDataFarmSchemasStore } from '@/stores/data-farm-schemas'
import { useUxDialogStore } from '@/stores/ux-dialog.js'

defineOptions({ name: 'TeamSchemas' })

const router = useRouter()
const schemasStore = useDataFarmSchemasStore()
const dialogStore = useUxDialogStore()
const { featuresCheck } = storeToRefs(useAccountSettingsStore())
const { team } = storeToRefs(useContextStore())
const { hasPermission } = usePermissions()

function showCreateDialog () {
    let name = ''
    let creating = false
    // set when the dialog is cancelled while the schema is still being created, which can't be taken back
    let cancelled = false
    Dialog.show({
        header: 'Create schema',
        confirmLabel: 'Create',
        closeOnConfirm: false,
        is: {
            component: markRaw(CreateSchemaDialog),
            payload: { error: '', creating: false },
            on: {
                change: (value: string) => {
                    name = value
                    dialogStore.updateDialogPayload({ error: '' })
                }
            }
        }
    }, async () => {
        if (creating) return
        creating = true
        dialogStore.updateDialogPayload({ creating: true })
        try {
            const schema = await schemasStore.createSchema(name)
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
