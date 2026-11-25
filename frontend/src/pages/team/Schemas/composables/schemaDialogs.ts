import { type Component, markRaw } from 'vue'

import SchemaDetailsDialog from '../dialogs/SchemaDetailsDialog.vue'

import Alerts from '@/services/alerts.js'
import Dialog from '@/services/dialog.js'
import { useDataFarmSchemasStore } from '@/stores/data-farm-schemas'
import { useUxDialogStore } from '@/stores/ux-dialog.js'
import type { DataSchemaGroup, DataSchemaSummary } from '@/types'

// Opens a form in the platform dialog, which stays open until `submit` has worked. An error from the server shows on the form.
// `done` is told when the dialog was cancelled while the request was still out. That can't be taken back, so the outcome is a toast.
export function showFormDialog<Values, Result> ({ header, confirmLabel, component, payload = {}, values, submit, done, failure }: {
    header: string
    confirmLabel: string
    component: Component
    payload?: Record<string, unknown>
    values: Values
    submit: (values: Values) => Promise<Result>
    done: (result: Result, cancelled: boolean) => void
    failure: string
}) {
    const dialogStore = useUxDialogStore()
    let busy = false
    let cancelled = false
    Dialog.show({
        header,
        confirmLabel,
        closeOnConfirm: false,
        is: {
            component: markRaw(component),
            payload: { ...payload, error: '', busy: false },
            on: {
                change: (value: Values) => {
                    values = value
                    dialogStore.updateDialogPayload({ error: '' })
                }
            }
        }
    }, async () => {
        if (busy) return
        busy = true
        dialogStore.updateDialogPayload({ busy: true })
        try {
            const result = await submit(values)
            if (!cancelled) Dialog.close()
            done(result, cancelled)
        } catch (err) {
            const message = err.response?.data?.error || failure
            if (cancelled) return Alerts.emit(message, 'warning')
            dialogStore.updateDialogPayload({ error: message })
        } finally {
            busy = false
            if (!cancelled) dialogStore.updateDialogPayload({ busy: false })
        }
    }, () => { cancelled = true })
}

// Edits a schema's name, description and group. `groups` are the groups it can be put in.
export function showEditSchemaDialog (schema: Pick<DataSchemaSummary, 'id' | 'name' | 'description' | 'group'>, groups: DataSchemaGroup[]) {
    showFormDialog({
        header: 'Edit details',
        confirmLabel: 'Save',
        component: SchemaDetailsDialog,
        payload: { groups, schema },
        values: { name: schema.name, description: schema.description, groupId: schema.group?.id ?? '' },
        submit: (values) => useDataFarmSchemasStore().updateSchema(schema, values),
        done: (updated) => Alerts.emit(`Schema ${updated.name} updated.`, 'confirmation'),
        failure: 'Failed to update the schema.'
    })
}
