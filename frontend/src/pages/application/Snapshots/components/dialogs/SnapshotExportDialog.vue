<template>
    <ff-dialog ref="dialog" header="Download Snapshot" confirm-label="Download" :closeOnConfirm="false" :disable-primary="!formValid" data-el="snapshot-download-dialog" @confirm="confirm()">
        <template #default>
            <form data-form="snapshot-export" @submit.prevent>
                <ExportInstanceComponents
                    v-model="parts"
                    :error="errors.parts" header="Select the components to include in the snapshot"
                    data-form="export-snapshot-components"
                />
                <template v-if="needsSecret">
                    <FormRow containerClass="w-auto mt-6" :error="errors.secret" data-form="snapshot-secret">
                        Secret
                        <template #description>
                            <p class="text-sm">A key used to encrypt any credentials in the snapshot's flow.</p>
                        </template>
                        <template #input>
                            <div class="flex items-center w-full">
                                <ff-text-input ref="secret" v-model="input.secret" type="text" placeholder="Secret" />
                                <ff-button v-ff-tooltip:top="'Random Secret'" kind="secondary" size="small" class="ml-2" data-el="refresh" @click="input.secret = generateRandomKey()">
                                    <template #icon>
                                        <RefreshIcon />
                                    </template>
                                </ff-button>
                                <ff-button v-if="clipboardSupported" v-ff-tooltip:top="'Copy to Clipboard'" kind="secondary" size="small" class="ml-2" @click="copySecret()">
                                    <template #icon>
                                        <ClipboardCopyIcon />
                                    </template>
                                </ff-button>
                            </div>
                        </template>
                    </FormRow>
                    <div class="mt-2">Please make a note of the secret used to encrypt the snapshot credentials. It will be required when importing the snapshot.</div>
                </template>
            </form>
        </template>
    </ff-dialog>
</template>
<script>
import { ClipboardCopyIcon, RefreshIcon } from '@heroicons/vue/outline'

import snapshotsApi from '../../../../../api/snapshots.js'
import FormRow from '../../../../../components/FormRow.vue'
import { downloadData } from '../../../../../composables/Download.js'
import clipboardMixin from '../../../../../mixins/Clipboard.js'
import alerts from '../../../../../services/alerts.js'
import ExportInstanceComponents from '../../../../instance/components/ExportImportComponents.vue'

export default {
    name: 'SnapshotExportDialog',
    components: {
        ClipboardCopyIcon,
        ExportInstanceComponents,
        FormRow,
        RefreshIcon
    },
    mixins: [clipboardMixin],
    setup () {
        return {
            show (snapshot) {
                this.$refs.dialog.show()
                this.input.secret = this.generateRandomKey()
                this.snapshot = snapshot
                this.submitted = false
                this.errors = {
                    secret: ''
                }
                this.$refs.secret.focus()
            }
        }
    },
    data () {
        return {
            submitted: false,
            input: {
                secret: ''
            },
            snapshot: null,
            errors: {},
            parts: {
                flows: true,
                credentials: true,
                envVars: 'all'
            }
        }
    },
    computed: {
        formValid () {
            return this.validate()
        },
        needsSecret () {
            return this.parts.flows && this.parts.credentials
        }
    },
    mounted () {
    },
    methods: {
        validate () {
            if (this.needsSecret) {
                if (!this.input.secret) {
                    this.errors.secret = 'Secret is required'
                } else if (this.input.secret.length < 8) {
                    this.errors.secret = 'Secret must be at least 8 characters'
                } else if (/^\s/.test(this.input.secret) || /\s$/.test(this.input.secret)) {
                    this.errors.secret = 'Secret cannot start or end with a space'
                } else {
                    this.errors.secret = ''
                }
            } else {
                this.errors.secret = ''
            }
            if (this.parts.flows === false && this.parts.envVars === false) {
                this.errors.parts = 'At least one component must be selected'
            } else {
                this.errors.parts = ''
            }
            return !this.submitted && !this.errors.parts && !this.errors.secret
        },
        confirm () {
            if (this.validate()) {
                this.submitted = true
                const opts = {
                    credentialSecret: this.input.secret,
                    components: {
                        flows: this.parts.flows,
                        credentials: this.parts.credentials,
                        envVars: this.parts.envVars
                    }
                }
                snapshotsApi.exportSnapshot(this.snapshot.id, opts).then((data) => {
                    return data
                }).then(data => {
                    const snapshotDate = this.snapshot.updatedAt.replace(/[-:]/g, '').replace(/\..*$/, '').replace('T', '-')
                    downloadData(data, `snapshot-${this.snapshot.id}-${snapshotDate}.json`)
                    alerts.emit('Snapshot exported.', 'confirmation')
                    this.$refs.dialog.close()
                }).catch(err => {
                    console.error(err)
                    alerts.emit('Failed to download snapshot.', 'error')
                }).finally(() => {
                    this.submitted = false
                })
            }
        },
        generateRandomKey (length = 16) {
            const array = new Uint8Array(length)
            window.crypto.getRandomValues(array)
            return Array.from(array, byte => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('')
        },
        copySecret () {
            this.copyToClipboard(this.input.secret).then(() => {
                alerts.emit('Copied to Clipboard.', 'confirmation')
            }).catch((err) => {
                console.warn('Clipboard write permission denied: ', err)
                alerts.emit('Clipboard write permission denied.', 'warning')
            })
        }
    }
}
</script>
