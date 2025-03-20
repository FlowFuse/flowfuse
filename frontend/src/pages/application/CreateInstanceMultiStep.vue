<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Add a new Instance">
                <template #context>
                    Let's get your new Node-RED instance setup in no time.
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

import MultiStepInstanceForm from '../../components/multi-step-modals/instance-creation/MultiStepInstanceForm.vue'

import applicationMixin from '../../mixins/Application.js'

export default {
    name: 'ApplicationCreateInstance',
    components: {
        MultiStepInstanceForm
    },
    mixins: [applicationMixin],
    inheritAttrs: false,
    emits: ['application-updated'],
    data () {
        return {
            loading: false,
            errors: {
                name: ''
            },
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
        if (
            // Billing feature must be enabled
            this.features.billing &&
            // Team must not have billing set up
            !this.team.billing?.active &&
            !this.team.billing?.unmanaged &&
            (
                // Redirect to billing if:
                //   - subscription is not unmanaged
                //   - team has cancelled their subscription
                //   - team is not a trial team, or:
                //   - team is a trial team and:
                //     - has expired, or:
                //     - is an instanceType-limited trial and already has a instance created
                this.team.billing?.canceled ||
                !this.team.billing?.trial ||
                this.team.billing?.trialEnded ||
                (this.team.type.properties?.trial?.instanceType && this.team.instanceCount > 0)
            )
        ) {
            this.$router.push({
                name: 'Billing',
                params: {
                    team_slug: this.team.slug
                }
            })
        }
    },
    methods: {
        async onInstanceCreated () {
            await this.$store.dispatch('account/refreshTeam')

            this.$emit('application-updated')

            this.$router.push({
                name: 'ApplicationInstances',
                params: { id: this.application.id }
            })
        }
    }
}
</script>
