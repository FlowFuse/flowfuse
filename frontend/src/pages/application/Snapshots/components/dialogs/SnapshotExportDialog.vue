<template>
    <ff-dialog ref="dialog" :header="$t('ui.downloadSnapshot')" :confirm-label="$t('ui.download')" :closeOnConfirm="false" :disable-primary="!formValid" data-el="snapshot-download-dialog" @confirm="confirm()">
        <template #default>
            <form data-form="snapshot-export" @submit.prevent>
                <ExportInstanceComponents
                    v-model="parts"
                    :error="errors.parts" :header="$t('ui.selectTheComponentsToIncludeInTheSnapshot')"
                    data-form="export-snapshot-components"
                />
                <template v-if="needsSecret">
                    <FormRow containerClass="w-auto mt-6" :error="errors.secret" data-form="snapshot-secret">
                        {{ $t('ui.secret') }}
                        <template #description>
                            <p class="text-sm">{{ $t('ui.aKeyUsedToEncryptAnyCredentialsInTheSnapshotSFlo') }}</p>
                        </template>
                        <template #input>
                            <div class="flex items-center w-full">
                                <ff-text-input ref="secret" v-model="input.secret" type="text" :placeholder="$t('ui.secret')" />
                                <ff-button v-ff-tooltip:top="$t('ui.randomSecret')" kind="secondary" size="small" class="ml-2" data-el="refresh" @click="input.secret = generateRandomKey()">
                                    <template #icon>
                                        <ArrowPathIcon />
                                    </template>
                                </ff-button>
                                <ff-button v-if="clipboardSupported" v-ff-tooltip:top="$t('ui.copyToClipboard')" kind="secondary" size="small" class="ml-2" @click="copySecret()">
                                    <template #icon>
                                        <ClipboardDocumentIcon />
                                    </template>
                                </ff-button>
                            </div>
                        </template>
                    </FormRow>
                    <div class="mt-2">{{ $t('ui.pleaseMakeANoteOfTheSecretUsedToEncryptTheSnapsh') }}</div>
                </template>
            </form>
        </template>
    </ff-dialog>
</template>
<script>
import { ArrowPathIcon, ClipboardDocumentIcon } from '@heroicons/vue/24/outline'

import snapshotsApi from '../../../../../api/snapshots.js'
import FormRow from '../../../../../components/FormRow.vue'
import { downloadData } from '../../../../../composables/Download.js'
import { t } from '../../../../../i18n.js'
import clipboardMixin from '../../../../../mixins/Clipboard.js'
import alerts from '../../../../../services/alerts.js'
import ExportInstanceComponents from '../../../../instance/components/ExportImportComponents.vue'

export default {
    name: 'SnapshotExportDialog',
    components: {
        ClipboardDocumentIcon,
        ExportInstanceComponents,
        FormRow,
        ArrowPathIcon
    },
    mixins: [clipboardMixin],
    setup () {
        return {
            show (snapshot) {
                this.$refs.dialog.show()
                this.input.secret = this.generateRandomKey()
                this.snapshot = snapshot
                this.submitted = false
                this.errors.secret = ''
                this.errors.parts = ''
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
            errors: {
                secret: '',
                parts: ''
            },
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
                    this.errors.secret = t('ui.secretIsRequired')
                } else if (this.input.secret.length < 8) {
                    this.errors.secret = t('ui.secretMustBeAtLeast8Characters')
                } else if (/^\s/.test(this.input.secret) || /\s$/.test(this.input.secret)) {
                    this.errors.secret = t('ui.secretCannotStartOrEndWithASpace')
                } else {
                    this.errors.secret = ''
                }
            } else {
                this.errors.secret = ''
            }
            if (this.parts.flows === false && this.parts.envVars === false) {
                this.errors.parts = t('ui.atLeastOneComponentMustBeSelected')
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
                    const snapshotDate = data.updatedAt.replace(/[-:]/g, '').replace(/\..*$/, '').replace('T', '-')
                    downloadData(data, `snapshot-${this.snapshot.id}-${snapshotDate}.json`)
                    alerts.emit(t('ui.snapshotExported'), 'confirmation')
                    this.$refs.dialog.close()
                }).catch(err => {
                    console.error(err)
                    alerts.emit(t('ui.failedToDownloadSnapshot'), 'error')
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
                alerts.emit(t('ui.copiedToClipboard'), 'confirmation')
            }).catch((err) => {
                console.warn('Clipboard write permission denied: ', err)
                alerts.emit(t('ui.clipboardWritePermissionDenied'), 'warning')
            })
        }
    }
}
</script>
