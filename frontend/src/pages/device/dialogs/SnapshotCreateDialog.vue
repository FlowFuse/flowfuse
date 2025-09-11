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
                    <ff-popover
                        v-if="featuresCheck.isGeneratedSnapshotDescriptionEnabled"
                        button-text="Generate with AI"
                        button-kind="tertiary"
                        :disabled="loadingDescription"
                    >
                        <template #icon-left>
                            <CubeTransparentIcon class="ff-icon" />
                        </template>
                        <template #panel="{ close }">
                            <section>
                                <popover-item
                                    title="Use latest manual snapshot"
                                    description="Compare with latest manually created snapshot"
                                    @click="onPopoverItemClick('latest',close)"
                                >
                                    <template #icon>
                                        <ClockIcon class="ff-icon text-indigo-500" />
                                    </template>
                                </popover-item>
                                <popover-item
                                    title="or search for a specific snapshot"
                                    class="bg-gray-100 hover:bg-gray-100 border-t border-gray-200"
                                >
                                    <template #content>
                                        <div class="flex gap-1 w-full my-2">
                                            <ff-combobox
                                                v-model="selectedSnapshot"
                                                class="flex-1"
                                                :fetch-remote-options="searchSnapshots"
                                                placeholder="Search snapshots"
                                                :disabled="loadingDescription"
                                            >
                                                <template #option="{ option, selected, active }">
                                                    <div class="ff-option-content" :class="{ selected, active }">
                                                        <div class="flex justify-between mb-1">
                                                            <span>{{ option.label }}</span>
                                                            <span v-if="option.user && option.user.username" class="text-gray-400">{{ option.user.username }}</span>
                                                        </div>
                                                        <p
                                                            :title="option.description"
                                                            class="text-italic text-gray-400 mb-1 clipped-overflow--two-lines"
                                                        >
                                                            {{ option.description }}
                                                        </p>
                                                    </div>
                                                </template>
                                            </ff-combobox>
                                            <ff-button
                                                kind="secondary"
                                                :disabled="!selectedSnapshot || loadingDescription"
                                                @click="onPopoverItemClick(selectedSnapshot,close)"
                                            >
                                                <template #icon>
                                                    <ChevronRightIcon class="ff-icon" />
                                                </template>
                                            </ff-button>
                                        </div>
                                    </template>
                                </popover-item>
                            </section>
                        </template>
                    </ff-popover>
                </section>
            </form>
        </template>
    </ff-dialog>
</template>
<script>

import { ClockIcon, CubeTransparentIcon } from '@heroicons/vue/outline'
import { ChevronRightIcon, QuestionMarkCircleIcon } from '@heroicons/vue/solid'
import { mapGetters } from 'vuex'

import applicationApi from '../../../api/application.js'
import deviceApi from '../../../api/devices.js'
import snapshotApi from '../../../api/projectSnapshots.js'

import FormRow from '../../../components/FormRow.vue'
import alerts from '../../../services/alerts.js'
import PopoverItem from '../../../ui-components/components/PopoverItem.vue'

export default {
    name: 'SnapshotCreateDialog',
    components: {
        ChevronRightIcon,
        ClockIcon,
        CubeTransparentIcon,
        FormRow,
        QuestionMarkCircleIcon,
        PopoverItem
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
            loadingDescription: false,
            selectedSnapshot: null
        }
    },
    computed: {
        ...mapGetters('account', ['featuresCheck']),
        formValid () {
            return !this.submitted && !!(this.input.name)
        },
        setAsTargetToolTip () {
            if (this.device?.ownerType === 'application') {
                // for an application-owned device:
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
        generateDescription (target) {
            this.loadingDescription = true
            return deviceApi.generateSnapshotDescription(this.device.id, target)
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
        },
        onPopoverItemClick (target, close) {
            close()
            if (target === 'latest') return this.generateDescription('latest')
            if (target === 'pipeline') return this.generateDescription('pipeline')

            return this.generateDescription(target)
        },
        searchSnapshots (query) {
            const apiEndpoint = this.device.ownerType === 'application'
                ? applicationApi.getSnapshots(
                    this.device.application.id,
                    null,
                    30,
                    { deviceId: this.device.id },
                    (query.length > 0 ? query : null)
                )
                : snapshotApi.getInstanceSnapshots(this.device.instance.id, null, 30, query)

            return apiEndpoint
                .then(res => (res.snapshots.map(snapshot => ({
                    value: snapshot.id,
                    label: snapshot.name,
                    id: snapshot.id,
                    description: snapshot?.description ?? null,
                    user: snapshot?.user ?? null,
                    createdAt: snapshot?.createdAt ?? null
                }))))
        }
    }
}
</script>
