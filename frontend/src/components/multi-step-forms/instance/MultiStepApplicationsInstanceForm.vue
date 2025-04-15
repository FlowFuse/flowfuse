<template>
    <MultiStepForm
        ref="multiStepForm"
        :steps="formSteps"
        :starting-step="startingStep"
        :disable-next-step="shouldDisableNextStep"
        :loading-overlay="formLoading"
        :loading-overlay-text="loadingText"
        :showFooter="false"
        :last-step-label="lastStepLabel"
        @previous-step-state-changed="$emit('previous-step-state-changed', $event)"
        @next-step-state-changed="$emit('next-step-state-changed', $event)"
        @next-step-label-changed="$emit('next-step-label-changed', $event)"
        @submit="onSubmit"
        @step-updated="updateForm"
    />
</template>

<script>
import { mapState } from 'vuex'

import applicationApi from '../../../api/application.js'
import flowBlueprintsApi from '../../../api/flowBlueprints.js'
import instanceApi from '../../../api/instances.js'
import Alerts from '../../../services/alerts.js'
import MultiStepForm from '../MultiStepForm.vue'

import ApplicationStep from './steps/ApplicationStep.vue'
import BlueprintStep from './steps/BlueprintStep.vue'
import InstanceStep from './steps/InstanceStep.vue'

const APPLICATION_SLUG = 'application'
const INSTANCE_SLUG = 'instance'
const BLUEPRINT_SLUG = 'blueprint'

export default {
    name: 'MultiStepApplicationsInstanceForm',
    components: { MultiStepForm },
    props: {
        applications: {
            type: Array,
            required: true
        },
        showInstanceFollowUp: {
            required: false,
            type: Boolean,
            default: false
        },
        lastStepLabel: {
            required: false,
            type: String,
            default: 'Create Instance'
        }
    },
    emits: ['form-success-application', 'form-success-instance', 'previous-step-state-changed', 'next-step-state-changed', 'next-step-label-changed'],
    data () {
        const startingStep = 0

        return {
            form: {
                [APPLICATION_SLUG]: { },
                [INSTANCE_SLUG]: { },
                [BLUEPRINT_SLUG]: { }
            },
            formLoading: false,
            loadingText: '',
            errors: {

            },
            startingStep,
            currentStepKey: startingStep,
            blueprints: []
        }
    },
    computed: {
        ...mapState('account', ['team']),
        formSteps () {
            return [
                {
                    sliderTitle: 'Application',
                    component: ApplicationStep,
                    bindings: {
                        slug: APPLICATION_SLUG,
                        applications: this.applications,
                        state: this.form[APPLICATION_SLUG],
                        instanceFollowUp: this.instanceFollowUp,
                        showInstanceFollowUp: this.showInstanceFollowUp
                    }
                },
                {
                    sliderTitle: 'Instance',
                    component: InstanceStep,
                    hidden: !this.instanceFollowUp,
                    bindings: {
                        slug: INSTANCE_SLUG,
                        state: this.form[INSTANCE_SLUG].input
                    }
                },
                {
                    sliderTitle: 'Blueprint',
                    component: BlueprintStep,
                    hidden: !this.instanceFollowUp || this.hasNoBlueprints,
                    bindings: {
                        slug: BLUEPRINT_SLUG,
                        state: this.form[BLUEPRINT_SLUG],
                        blueprints: this.blueprints
                    }
                }
            ]
        },
        hasNoBlueprints () {
            return this.blueprints.length === 0
        },
        shouldDisableNextStep () {
            const currentStep = this.formSteps[this.currentStepKey]
            const currentSlug = currentStep.bindings.slug

            return this.form[currentSlug].hasErrors
        },
        hasToCreateAnApplication () {
            return this.applications.length === 0
        },
        instanceFollowUp () {
            if (this.form[APPLICATION_SLUG]?.input) {
                return !!this.form[APPLICATION_SLUG]?.input?.createInstance
            }

            return true
        }
    },
    watch: {
        team: {
            immediate: true,
            handler (team) {
                // we need to get blueprints early on when we load the form in order to be able to hide the blueprints step if
                // there aren't any
                if (team) {
                    this.getBlueprints()
                }
            }
        }
    },
    methods: {
        updateForm (payload, stepKey) {
            this.currentStepKey = stepKey
            this.form = { ...this.form, ...payload }
        },
        async onSubmit () {
            this.loadingText = 'Creating a new Instance'
            this.formLoading = true

            return new Promise((resolve) => {
                if (this.hasToCreateAnApplication) {
                    return applicationApi.createApplication({ ...this.form[APPLICATION_SLUG].input, teamId: this.team.id })
                        .then(application => {
                            this.$emit('form-success-application', application)
                            return application
                        })
                        .then(resolve)
                }
                return resolve(this.form[APPLICATION_SLUG].selection)
            })
                .then((application) => {
                    if (this.instanceFollowUp && !this.shouldHideInstanceSteps) {
                        return instanceApi.create({
                            applicationId: application.id,
                            name: this.form[INSTANCE_SLUG].input.name,
                            projectType: this.form[INSTANCE_SLUG].input.instanceType,
                            stack: this.form[INSTANCE_SLUG].input.nodeREDVersion,
                            template: this.form[INSTANCE_SLUG].input.template,
                            flowBlueprintId: this.form[BLUEPRINT_SLUG].blueprint?.id ?? ''
                        })
                    }
                })
                .then((instance) => {
                    if (instance) {
                        this.$emit('form-success-instance', instance)
                    }
                })
                .catch(err => {
                    if (err.response) {
                        const error = err.response.data.error

                        if (error) {
                            Alerts.emit('Failed to create: ' + error, 'warning', 7500)
                        } else {
                            Alerts.emit('Failed to create')
                            console.error(err)
                        }
                    } else {
                        console.error(err)
                    }
                })
                .finally(() => {
                    this.loadingText = ''
                    this.formLoading = false
                })
        },
        goToNextStep () {
            this.$refs.multiStepForm.nextStep()
        },
        goToPreviousStep () {
            this.$refs.multiStepForm.previousStep()
        },
        async getBlueprints () {
            return flowBlueprintsApi.getFlowBlueprintsForTeam(this.team.id)
                .then(response => {
                    this.blueprints = response.blueprints
                })
                .catch(e => e)
        }
    }
}
</script>

<style scoped lang="scss">

</style>
