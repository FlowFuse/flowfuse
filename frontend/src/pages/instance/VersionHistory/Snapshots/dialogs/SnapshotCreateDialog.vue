<template>
    <ff-dialog ref="dialog" header="Create Snapshot" confirm-label="Create" :disable-primary="!formValid" @confirm="confirm()">
        <template #default>
            <form class="space-y-6 mt-2" @submit.prevent>
                <FormRow
                    v-model="input.name"
                    :error="errors.name"
                    :disabled="loadingDescription"
                    data-form="snapshot-name"
                    container-class="max-w-full"
                >
                    Name
                </FormRow>
                <FormRow data-form="snapshot-description" container-class="max-w-full" :disabled="loadingDescription">
                    Description
                    <template #input>
                        <textarea v-model="input.description" :disabled="loadingDescription" rows="8" class="ff-input ff-text-input" style="height: auto" />
                    </template>
                </FormRow>
                <section class="flex flex-row justify-between items-center">
                    <FormRow v-model="input.setAsTarget" type="checkbox" data-form="snapshot-name" container-class="max-w-full">
                        <span v-ff-tooltip:right="'If checked, all devices assigned to this instance will be restarted on this snapshot.'" class="">
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
                                    title="Use latest deploy snapshot"
                                    description="Compare to last pipeline deployment"
                                    @click="onPopoverItemClick('pipeline',close)"
                                >
                                    <template #icon>
                                        <PipelineIcon class="ff-icon text-indigo-500" />
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

import instanceApi from '../../../../../api/instances.js'
import snapshotApi from '../../../../../api/projectSnapshots.js'

import FormRow from '../../../../../components/FormRow.vue'
import PipelineIcon from '../../../../../components/icons/Pipelines.js'
import alerts from '../../../../../services/alerts.js'
import PopoverItem from '../../../../../ui-components/components/PopoverItem.vue'

export default {
    name: 'SnapshotCreateDialog',
    components: {
        PopoverItem,
        PipelineIcon,
        FormRow,
        QuestionMarkCircleIcon,
        CubeTransparentIcon,
        ChevronRightIcon,
        ClockIcon
    },
    props: {
        project: {
            type: Object,
            required: true
        }
    },
    emits: ['snapshot-created'],
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
        }
    },
    mounted () { },
    methods: {
        confirm () {
            if (this.formValid) {
                this.submitted = true
                const opts = {
                    name: this.input.name,
                    description: this.input.description,
                    setAsTarget: this.input.setAsTarget
                }
                snapshotApi.create(this.project.id, opts).then((response) => {
                    this.$emit('snapshot-created', response)
                    alerts.emit('Successfully created snapshot of instance.', 'confirmation')
                }).catch(err => {
                    console.error(err.response?.data)
                    if (err.response?.data) {
                        if (/name/.test(err.response.data.error)) {
                            this.errors.name = err.response.data.error
                            return
                        }
                    }
                    alerts.emit('Failed to create snapshot of instance.', 'error')
                })
            }
        },
        generateDescription (target) {
            this.loadingDescription = true
            return instanceApi.generateSnapshotDescription(this.project.id, { target })
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
                    this.selectedSnapshot = null
                })
        },
        searchSnapshots (query) {
            return snapshotApi.getInstanceSnapshots(this.project.id, null, 30, query)
                .then(res => (res.snapshots.map(snapshot => ({
                    value: snapshot.id,
                    label: snapshot.name,
                    id: snapshot.id,
                    description: snapshot?.description ?? null,
                    user: snapshot?.user ?? null,
                    createdAt: snapshot?.createdAt ?? null
                }))))
        },
        onPopoverItemClick (target, close) {
            close()
            if (target === 'latest') return this.generateDescription('latest')
            if (target === 'pipeline') return this.generateDescription('pipeline')

            return this.generateDescription(target)
        }
    }
}
</script>
