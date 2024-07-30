<template>
    <ff-dialog ref="dialog" :header="'Edit Snapshot: ' + originalName" data-el="snapshot-edit-dialog" @confirm="confirm()">
        <template #default>
            <form class="space-y-6 mt-2" data-form="snapshot-edit" @submit.prevent>
                <FormRow ref="name" v-model="input.name" :error="errors.name" data-form="snapshot-name">Name</FormRow>
                <FormRow data-form="snapshot-description">
                    Description
                    <template #input>
                        <textarea v-model="input.description" rows="8" class="ff-input ff-text-input" style="height: auto" />
                    </template>
                </FormRow>
            </form>
        </template>
        <template #actions>
            <ff-button kind="secondary" data-action="dialog-cancel" :disabled="submitted" @click="cancel()">Cancel</ff-button>
            <ff-button :kind="kind" data-action="dialog-confirm" :disabled="!formValid" @click="confirm()">Update</ff-button>
        </template>
    </ff-dialog>
</template>
<script>

import snapshotsApi from '../../api/snapshots.js'

import alerts from '../../services/alerts.js'
import FormRow from '../FormRow.vue'

export default {
    name: 'SnapshotEditDialog',
    components: {
        FormRow
    },
    emits: ['snapshot-updated', 'close'],
    setup () {
        return {
            show (snapshot) {
                this.submitted = false
                this.errors.name = ''
                this.snapshot = snapshot
                this.originalName = snapshot.name || 'unnamed'
                this.input.name = snapshot.name || ''
                this.input.description = snapshot.description || ''
                this.$refs.dialog.show()
                setTimeout(() => {
                    this.$refs.name.focus()
                }, 20)
            }
        }
    },
    data () {
        return {
            submitted: false,
            originalName: '',
            input: {
                name: ''
            },
            snapshot: null,
            errors: {
                name: ''
            }
        }
    },
    computed: {
        formValid () {
            return this.validate()
        }
    },
    mounted () {
    },
    methods: {
        validate () {
            if (!this.input.name) {
                this.errors.name = 'Name is required'
            } else {
                this.errors.name = ''
            }
            return !this.submitted && !!(this.input.name) && !this.errors.name
        },
        cancel () {
            this.$refs.dialog.close()
        },
        confirm () {
            if (this.validate()) {
                this.submitted = true
                const opts = {
                    name: this.input.name,
                    description: this.input.description || ''
                }
                snapshotsApi.updateSnapshot(this.snapshot.id, opts).then((data) => {
                    const updatedSnapshot = {
                        ...this.snapshot
                    }
                    updatedSnapshot.name = this.input.name
                    updatedSnapshot.description = this.input.description
                    this.$emit('snapshot-updated', updatedSnapshot)
                    alerts.emit('Snapshot updated.', 'confirmation')
                    this.$refs.dialog.close()
                }).catch(err => {
                    console.error(err)
                    alerts.emit('Failed to update snapshot.', 'warning')
                }).finally(() => {
                    this.submitted = false
                })
            }
        }
    }
}
</script>
