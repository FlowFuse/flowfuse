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

import instanceApi from '../../../../../api/instances.js'
import snapshotApi from '../../../../../api/projectSnapshots.js'

import FormRow from '../../../../../components/FormRow.vue'
import alerts from '../../../../../services/alerts.js'

export default {
    name: 'SnapshotCreateDialog',
    components: {
        FormRow,
        QuestionMarkCircleIcon,
        CubeTransparentIcon
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
            loadingDescription: false
        }
    },
    computed: {
        ...mapGetters('account', ['featuresCheck']),
        formValid () {
            return !this.submitted && !!(this.input.name)
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
        generateDescription () {
            this.loadingDescription = true
            return instanceApi.generateSnapshotDescription(this.project.id)
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
