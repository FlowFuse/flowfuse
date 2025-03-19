<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Add a new Instance">
                <template #helptext>
                    Help MEEEEE
                </template>
                <template #tools>
                    <section class="flex gap-3">
                        <ff-button
                            class="flex-1"
                            kind="secondary"
                            :disabled="!form.previousButtonState"
                            @click="$refs.multiStepForm.goToPreviousStep()"
                        >
                            Back
                        </ff-button>
                        <ff-button
                            class="flex-1 whitespace-nowrap"
                            :disabled="form.nextButtonState"
                            @click="$refs.multiStepForm.goToNextStep()"
                        >
                            {{ form.nextStepLabel }}
                        </ff-button>
                    </section>
                </template>
            </ff-page-header>
        </template>

        <ff-loading v-if="isLoading" />

        <ff-loading v-else-if="sourceInstanceId && !sourceInstance" message="Loading instance to Copy From..." />

        <MultiStepInstanceForm
            v-else
            ref="multiStepForm" :application="application" @instance-created="onInstanceCreated"
            @previous-step-state-changed="form.previousButtonState = $event"
            @next-step-state-changed="form.nextButtonState = $event"
            @next-step-label-changed="form.nextStepLabel = $event"
        />
    </ff-page>
</template>

<script>
import { mapState } from 'vuex'

import instanceApi from '../../api/instances.js'
import MultiStepInstanceForm from '../../components/multi-step-modals/instance-creation/MultiStepInstanceForm.vue'

import applicationMixin from '../../mixins/Application.js'

export default {
    name: 'ApplicationCreateInstance',
    components: {
        MultiStepInstanceForm
    },
    mixins: [applicationMixin],
    inheritAttrs: false,
    props: {
        sourceInstanceId: {
            default: null,
            type: String
        }
    },
    emits: ['application-updated'],
    data () {
        return {
            loading: false,
            sourceInstance: null,
            mounted: false,
            errors: {
                name: ''
            },
            instanceDetails: null,
            form: {
                nextButtonState: false,
                previousButtonState: false,
                nextStepLabel: 'Next'
            }
        }
    },
    computed: {
        ...mapState('account', ['features', 'team']),
        isLoading () {
            return this.loading || !this.team
        }
    },
    async created () {
        await this.updateApplication()

        if (this.sourceInstanceId) {
            instanceApi.getInstance(this.sourceInstanceId).then(instance => {
                this.sourceInstance = instance
            }).catch(err => {
                console.error('Failed to load source instance', err)
            })
        }
    },
    async mounted () {
        this.mounted = true
    },
    methods: {
        async onInstanceCreated () {
            await this.$store.dispatch('account/refreshTeam')

            this.$emit('application-updated')

            this.$router.push({ name: 'ApplicationInstances', params: { id: this.application.id } })
        }
    }
}
</script>
