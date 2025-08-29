<template>
    <ff-dialog ref="dialog" :header="title" confirm-label="Create" :disable-primary="!formValid" :closeOnConfirm="false" @confirm="confirm()" @cancel="cancel">
        <template #default>
            <form class="space-y-6 mt-2" @submit.prevent>
                <FormRow
                    v-model="input.name"
                    :error="errors.name"
                    data-form="snapshot-name"
                    container-class="max-w-full"
                >
                    Name
                </FormRow>
                <FormRow data-form="snapshot-description" container-class="max-w-full" :disabled="loadingDescription">
                    Description
                    <template #input>
                        <textarea
                            v-model="input.description"
                            rows="8"
                            class="ff-input ff-text-input"
                            style="height: auto"
                            :disabled="loadingDescription"
                        />
                    </template>
                </FormRow>
                <section class="flex flex-row justify-between items-center">
                    <FormRow
                        v-if="showSetAsTarget"
                        v-model="input.setAsTarget"
                        type="checkbox"
                        container-class="max-w-full"
                        data-form="set-as-target"
                    >
                        <span v-ff-tooltip:right="setAsTargetToolTip" class="">
                            Set as Target <QuestionMarkCircleIcon class="ff-icon" style="margin: 0px 0px 0px 4px; height: 18px;" />
                        </span>
                    </FormRow>
                    <ff-button
                        v-if="featuresCheck.isGeneratedSnapshotDescriptionEnabled" kind="tertiary"
                        :disabled="loadingDescription" @click="generateDescription"
                    >
                        Generate with AI
                        <template #icon-left>
                            <CubeTransparentIcon class="ff-icon" />
                        </template>
                    </ff-button>
                </section>
            </form>
        </template>
    </ff-dialog>
</template>
<script>

import { CubeTransparentIcon } from '@heroicons/vue/outline'
import { QuestionMarkCircleIcon } from '@heroicons/vue/solid'
import { mapGetters } from 'vuex'

import deviceApi from '../../../api/devices.js'

import FormRow from '../../../components/FormRow.vue'
import alerts from '../../../services/alerts.js'

export default {
    name: 'SnapshotCreateDialog',
    components: {
        CubeTransparentIcon,
        FormRow,
        QuestionMarkCircleIcon
    },
    props: {
        device: {
            type: Object,
            required: true
        },
        showSetAsTarget: {
            type: Boolean,
            default: true
        },
        title: {
            type: String,
            default: 'Create Snapshot'
        }
    },
    emits: ['device-upload-failed', 'device-upload-success', 'canceled'],
    setup () {
        return {
            show () {
                this.$refs.dialog.show()
                this.input.name = ''
                this.input.description = ''
                this.input.setAsTarget = false
                this.submitted = false
                this.errors = {}
            }
        }
    },
    data () {
        return {
            submitted: false,
            input: {
                name: '',
                description: '',
                setAsTarget: false
            },
            errors: {},
            loadingDescription: false
        }
    },
    computed: {
        ...mapGetters('account', ['featuresCheck']),
        formValid () {
            return !this.submitted && !!(this.input.name)
        },
        setAsTargetToolTip () {
            if (this.device?.ownerType === 'application') {
                // for an application owned device:
                return 'If checked, the device will load this as its active snapshot at the next check-in'
            }
            // for default (instance owned device)
            return 'If checked, all devices assigned to this instance will be restarted on this snapshot.'
        }
    },
    mounted () {
    },
    methods: {
        confirm () {
            if (this.formValid) {
                this.submitted = true
                const opts = {
                    name: this.input.name,
                    description: this.input.description,
                    setAsTarget: this.input.setAsTarget
                }
                if (this.showSetAsTarget) {
                    opts.setAsTarget = this.input.setAsTarget
                }
                deviceApi.createSnapshot(this.device, opts).then((response) => {
                    this.$emit('device-upload-success', response)
                    this.$refs.dialog.close()
                }).catch(err => {
                    this.$emit('device-upload-failed', err)
                }).finally(() => {
                    this.submitted = false
                })
            }
        },
        cancel () {
            this.$refs.dialog.close()
            this.$emit('canceled')
        },
        generateDescription () {
            this.loadingDescription = true
            return deviceApi.generateSnapshotDescription(this.device.id)
                .then(res => {
                    if (!this.input.name.length) {
                        this.input.name = res.name
                    }
                    delete res.name

                    const payload = []
                    if (res.overview && res.overview.length) {
                        payload.push('Overview \n' + res.overview)
                        delete res.overview
                    }

                    Object.keys(res).forEach(key => {
                        if (res[key].length) {
                            payload.push(key.charAt(0).toUpperCase() + key.slice(1) + '\n' + res[key])
                        }
                    })
                    this.input.description = payload.join('\n\n')
                })
                .catch(e => {
                    alerts.emit('Something went wrong, failed to generate a description.', 'error')
                })
                .finally(() => {
                    this.loadingDescription = false
                })
        }
    }
}
</script>
