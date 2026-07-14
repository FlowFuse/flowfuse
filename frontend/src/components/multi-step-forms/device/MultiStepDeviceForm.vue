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
import { mapState } from 'pinia'

import applicationApi from '../../../api/application.js'
import deviceApi from '../../../api/devices.js'
import Alerts from '../../../services/alerts.js'
import MultiStepForm from '../MultiStepForm.vue'

import ApplicationStep from '../instance/steps/ApplicationStep.vue'

import DeviceStep from './steps/DeviceStep.vue'
import TeamStep from './steps/TeamStep.vue'

import { useAccountStore } from '@/stores/account.js'
import { useContextStore } from '@/stores/context.js'

const TEAM_STEP_SLUG = 'team'
const APPLICATION_SLUG = 'application'
const DEVICE_SLUG = 'device'

export default {
    name: 'MultiStepDeviceForm',
    components: { MultiStepForm },
    props: {
        applications: {
            type: Array,
            required: true
        },
        lastStepLabel: {
            required: false,
            type: String,
            default: 'Create Instance'
        },
        hasTeamStep: {
            required: false,
            type: Boolean,
            default: false
        },
        registrationSession: {
            // When used in the async device registration flow, this is the session ID that
            // needs passing to the backend when creating the device
            required: false,
            type: String,
            default: null
        }
    },
    emits: ['form-success', 'previous-step-state-changed', 'next-step-state-changed', 'next-step-label-changed'],
    data () {
        const startingStep = 0

        return {
            form: {
                [TEAM_STEP_SLUG]: {},
                [APPLICATION_SLUG]: {},
                [DEVICE_SLUG]: {}
            },
            formLoading: false,
            loadingText: '',
            errors: {},
            startingStep,
            currentStepKey: startingStep,
            blueprints: [],
            newApplications: []
        }
    },
    computed: {
        ...mapState(useContextStore, ['team', 'isFreeTeamType']),
        ...mapState(useAccountStore, ['teams']),
        formSteps () {
            return [
                {
                    sliderTitle: 'Team',
                    component: TeamStep,
                    hidden: this.hasTeamStep ? this.teams.length === 1 : true,
                    bindings: {
                        slug: TEAM_STEP_SLUG,
                        state: this.form[TEAM_STEP_SLUG]
                    }
                },
                {
                    sliderTitle: 'Application',
                    component: ApplicationStep,
                    bindings: {
                        slug: APPLICATION_SLUG,
                        applications: this.localApplications,
                        state: this.form[APPLICATION_SLUG]
                    }
                },
                {
                    sliderTitle: 'Instance',
                    component: DeviceStep,
                    bindings: {
                        slug: DEVICE_SLUG,
                        state: this.form[DEVICE_SLUG].input,
                        initialErrors: this.form[DEVICE_SLUG].errors
                    }
                }
            ].filter(step => !step.hidden)
        },
        shouldDisableNextStep () {
            const currentStep = this.formSteps[this.currentStepKey]
            const currentSlug = currentStep.bindings.slug
            return this.form[currentSlug].hasErrors
        },
        hasToCreateAnApplication () {
            return this.localApplications.length === 0
        },
        localApplications () {
            return [...this.applications, ...this.newApplications]
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
            let createdApplication

            return new Promise((resolve) => {
                if (this.hasToCreateAnApplication) {
                    return applicationApi.createApplication({
                        ...this.form[APPLICATION_SLUG].input,
                        teamId: this.team.id
                    })
                        .then(application => {
                            // pre-select the applications and also adding it to the new applications list immediately after creation
                            // so that if the instance creation fails in the next step, a subsequent submit won't create a new duplicate
                            // application but use the newly created one
                            this.form[APPLICATION_SLUG].selection = application
                            // delete this.form[APPLICATION_SLUG].input
                            this.newApplications.push({
                                ...application,
                                label: application.name,
                                counters: {
                                    instances: 0,
                                    devices: 0
                                }
                            })
                            createdApplication = application

                            if (!this.instanceFollowUp || this.isFreeTeamType) {
                                this.$emit('form-success', {
                                    application
                                })
                            }
                            return application
                        })
                        .then(resolve)
                }
                createdApplication = this.form[APPLICATION_SLUG].selection
                return resolve(createdApplication)
            })
                .catch((err) => {
                    // catching application related api errors
                    if (err.response) {
                        const error = err.response.data.error

                        if (error) {
                            Alerts.emit('Failed to create the application: ' + error, 'warning', 7500)
                        } else {
                            Alerts.emit('Failed to create the application')
                            console.error(err)
                        }
                    }
                })
                .then((application) => {
                    const payload = {
                        team: this.team.id,
                        application: application.id,
                        name: this.form[DEVICE_SLUG].input.name,
                        type: this.form[DEVICE_SLUG].input.type
                    }
                    if (this.registrationSession) {
                        payload.registrationSession = this.registrationSession
                    }
                    console.log(payload)
                    // return {
                    //     id: '123',
                    //     name: 'My Remote Instance',
                    //     credentials: {
                    //         otc: 'phantom-secret-potato'
                    //     }
                    // }
                    return deviceApi.create(payload)
                })
                .catch(err => {
                    // catching device related api errors
                    if (
                        Object.prototype.hasOwnProperty.call(err, 'response') &&
                        Object.prototype.hasOwnProperty.call(err.response, 'data')
                    ) {
                        if (err.response.data.code === 'invalid_project_name') {
                            this.form[DEVICE_SLUG].errors.name = err.response.data.error
                        }
                        const error = err.response.data.error
                        Alerts.emit('Failed to create the device: ' + error, 'warning', 7500)
                    }

                    const idx = this.formSteps.findIndex(step => step.sliderTitle === 'Instance')
                    if (idx >= 0) { // step back to the device step
                        this.$refs.multiStepForm.selectStep(idx)
                    }
                })
                .then((device) => {
                    if (device) {
                        this.$emit('form-success', { application: createdApplication, device })
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
        }
    }
}
</script>

<style scoped lang="scss">

</style>
