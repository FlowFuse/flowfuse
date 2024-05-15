<template>
    <ff-dialog ref="dialog" :header="title" confirm-label="Upload" :disable-primary="!input.snapshot" :closeOnConfirm="false" @confirm="confirm()" @cancel="cancel">
        <template #default>
            <form class="space-y-6 mt-2" @submit.prevent>
                <FormRow :error="errors.file" data-form="snapshot-name">
                    Snapshot File
                    <template #input>
                        <ff-text-input v-model="input.file" :error="errors.file" disabled />
                    </template>
                    <template #append>
                        <input id="fileUpload" ref="fileUpload" type="file" accept="application/json, text/plain, *" class="hidden">
                        <ff-button kind="secondary" @click="selectSnapshot">
                            <template #icon><DocumentIcon /></template>
                            <!-- <span class="hidden sm:flex pl-1">Select Snapshot</span> -->
                        </ff-button>
                    </template>
                </FormRow>
                <FormRow v-if="snapshotNeedsSecret" v-model="input.secret" :error="errors.secret" data-form="snapshot-secret">Credentials Secret</FormRow>
                <FormRow v-model="input.name" :error="errors.name" data-form="snapshot-name">Name</FormRow>
                <FormRow data-form="snapshot-description">
                    Description
                    <template #input>
                        <textarea v-model="input.description" rows="8" class="ff-input ff-text-input" style="height: auto" />
                    </template>
                </FormRow>
            </form>
        </template>
    </ff-dialog>
</template>
<script>

import { DocumentIcon } from '@heroicons/vue/outline'

import snapshotsApi from '../../api/snapshots.js'
import alerts from '../../services/alerts.js'
import { isSnapshot } from '../../utils/snapshot.js'
import FormRow from '../FormRow.vue'

export default {
    name: 'SnapshotUploadDialog',
    components: {
        FormRow,
        DocumentIcon
    },
    props: {
        owner: {
            type: Object,
            required: true
        },
        ownerType: {
            type: String,
            required: true
        },
        title: {
            type: String,
            default: 'Upload Snapshot'
        }
    },
    emits: ['snapshot-upload-failed', 'snapshot-upload-success', 'canceled'],
    setup () {
        return {
            show () {
                this.$refs.dialog.show()
                this.input.name = ''
                this.input.description = ''
                this.input.file = ''
                this.input.snapshot = ''
                this.input.secret = ''
                this.submitted = false
                Object.keys(this.errors).forEach(key => {
                    this.errors[key] = ''
                })
            }
        }
    },
    data () {
        return {
            submitted: false,
            input: {
                name: '',
                description: '',
                setAsTarget: false,
                file: null,
                snapshot: null,
                secret: ''
            },
            errors: {
                name: '',
                file: '',
                secret: ''
            }
        }
    },
    computed: {
        formValid () {
            return !Object.values(this.errors).some(error => !!error)
        },
        snapshotNeedsSecret () {
            return !!(this.input.snapshot && this.input.snapshot.flows?.credentials)
        }
    },
    mounted () {
    },
    methods: {
        validate () {
            this.errors.file = !this.input.file ? 'Snapshot file is required' : ''
            this.errors.name = !this.input.name ? 'Name is required' : ''
            // TODO: perform same secret validation as in the snapshot export dialog
            this.errors.secret = this.snapshotNeedsSecret ? (this.input.secret ? '' : 'Secret is required') : ''
            return this.formValid
        },
        confirm () {
            if (this.validate()) {
                this.submitted = true
                const uploadSnapshot = {
                    ...this.input.snapshot
                }
                if (this.input.name) {
                    uploadSnapshot.name = this.input.name
                }
                if (this.input.description) {
                    uploadSnapshot.description = this.input.description
                }
                let secret
                if (this.snapshotNeedsSecret) {
                    secret = this.input.secret
                }
                snapshotsApi.uploadSnapshot(this.owner.id, this.ownerType, uploadSnapshot, secret).then((response) => {
                    this.$emit('snapshot-upload-success', response)
                    this.$refs.dialog.close()
                }).catch(err => {
                    this.$emit('snapshot-upload-failed', err)
                }).finally(() => {
                    this.submitted = false
                })
            }
        },
        cancel () {
            this.$refs.dialog.close()
            this.$emit('canceled')
        },
        selectSnapshot () {
            const fileUpload = this.$refs.fileUpload
            fileUpload.onchange = () => {
                const file = fileUpload.files[0]
                this.input.snapshot = null
                this.input.file = ''
                this.errors.file = null

                const reader = new FileReader()
                reader.onload = () => {
                    const data = reader.result
                    try {
                        const snapshot = JSON.parse(data)
                        if (isSnapshot(snapshot)) {
                            this.input.name = snapshot.name
                            this.input.description = snapshot.description
                            this.input.snapshot = snapshot
                            this.input.file = file.name
                        } else {
                            throw new Error('Invalid snapshot file')
                        }
                    } catch (e) {
                        console.warn(e)
                        alerts.emit('Failed to read snapshot file')
                        this.errors.file = 'Invalid snapshot file'
                    }
                }
                reader.readAsText(file)
                fileUpload.value = ''
            }
            fileUpload.click()
        }
    }
}
</script>
