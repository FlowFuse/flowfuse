<template>
    <div class="space-y-4" data-el="rollback-snapshot-dialog">
        <p>
            This will overwrite the current instance.
            All changes to the flows and settings made since the last snapshot will be lost.
        </p>
        <ff-radio-group
            v-model="envVarsMode"
            data-form="env-vars-mode"
            label="Environment variables"
            orientation="vertical"
            multiline-description
            :options="envVarsOptions"
        />
        <div data-el="env-vars-preview">
            <ff-loading v-if="loading" scale="tiny" message="Checking environment variable changes..." />
            <p v-else-if="error" class="text-gray-500">Could not check which environment variables will change.</p>
            <ff-data-table
                v-else
                class="max-h-[28rem]"
                table-class="table-fixed"
                :columns="columns"
                :rows="changes"
                no-data-message="No environment variables will change."
            />
        </div>
        <p>Are you sure you want to deploy to this snapshot?</p>
    </div>
</template>

<script>
import { mapActions } from 'pinia'
import { markRaw } from 'vue'

import SnapshotApi from '../../api/projectSnapshots.js'
import DiffTypeBadge from '../diff/DiffTypeBadge.vue'

import EnvVarChangeValueCell from './rollback-snapshot/EnvVarChangeValueCell.vue'

import { useUxDialogStore } from '@/stores/ux-dialog.js'

export default {
    name: 'RollbackSnapshotDialog',
    props: {
        instanceId: {
            type: String,
            required: true
        },
        snapshotId: {
            type: String,
            required: true
        }
    },
    emits: ['merge-env-vars-changed'],
    data () {
        return {
            envVarsMode: 'merge',
            envVarsOptions: [
                {
                    value: 'merge',
                    label: 'Merge',
                    description: 'Adds variables from the snapshot that the instance doesn\'t have.\nVariables the instance already has keep their current values, and none are removed.'
                },
                {
                    value: 'replace',
                    label: 'Replace',
                    description: 'All instance variables are replaced by those in the snapshot. \nMissing ones are added, existing ones take the snapshot\'s values, and ones not in the snapshot are removed.'
                }
            ],
            columns: [
                { label: 'Change', key: 'kind', class: ['w-28'], component: { is: markRaw(DiffTypeBadge), bind: { type: 'kind' } } },
                { label: 'Name', key: 'name', class: ['w-1/3', 'break-all'] },
                { label: 'Value', key: 'to', component: { is: markRaw(EnvVarChangeValueCell), bind: { kind: 'kind', hidden: 'hidden', from: 'from', to: 'to' } } }
            ],
            loading: true,
            error: false,
            preview: null
        }
    },
    computed: {
        changes () {
            const changes = this.preview?.[this.envVarsMode]
            if (!changes) {
                return []
            }
            return ['added', 'changed', 'removed'].flatMap(kind => changes[kind].map(change => ({ ...change, kind })))
        }
    },
    watch: {
        envVarsMode (value) {
            this.$emit('merge-env-vars-changed', value === 'merge')
        }
    },
    async mounted () {
        try {
            const result = await SnapshotApi.getRollbackPreview(this.instanceId, this.snapshotId)
            this.preview = result.env
        } catch (err) {
            this.error = true
        } finally {
            this.loading = false
            // Confirm is disabled until the preview has loaded. A failed preview still allows the restore.
            this.setDisablePrimary(false)
        }
    },
    methods: {
        ...mapActions(useUxDialogStore, ['setDisablePrimary'])
    }
}
</script>
