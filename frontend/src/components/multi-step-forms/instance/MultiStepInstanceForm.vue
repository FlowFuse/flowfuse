<template>
    <MultiStepForm
        ref="multiStepForm"
        :steps="formSteps"
        :starting-step="1"
        :disable-next-step="shouldDisableNextStep"
        :loading-overlay="formLoading"
        :loading-overlay-text="loadingText"
        :showFooter="false"
        last-step-label="Create Instance"
        @previous-step-state-changed="$emit('previous-step-state-changed', $event)"
        @next-step-state-changed="$emit('next-step-state-changed', $event)"
        @next-step-label-changed="$emit('next-step-label-changed', $event)"
        @submit="onSubmit"
        @step-updated="updateForm"
    />
</template>

<script>
import { mapState } from 'vuex'

import flowBlueprintsApi from '../../../api/flowBlueprints.js'
import instanceApi from '../../../api/instances.js'
import Alerts from '../../../services/alerts.js'
import MultiStepForm from '../MultiStepForm.vue'

import BlueprintStep from './steps/BlueprintStep.vue'
import InstanceStep from './steps/InstanceStep.vue'

const INSTANCE_SLUG = 'instance'
const BLUEPRINT_SLUG = 'blueprint'

export default {
    name: 'MultiStepInstanceForm',
    components: { MultiStepForm },
    props: {
        application: {
            type: Object,
            required: true
        }
    },
    emits: ['instance-created', 'previous-step-state-changed', 'next-step-state-changed', 'next-step-label-changed'],
    data () {
        return {
            blueprints: [],
            form: {
                [INSTANCE_SLUG]: { },
                [BLUEPRINT_SLUG]: { }
            },
            formLoading: false,
            loadingText: '',
            errors: {

            }
        }
    },
    computed: {
        ...mapState('account', ['team']),
        formSteps () {
            return [
                {
                    sliderTitle: 'Application',
                    disabled: true
                },
                {
                    sliderTitle: 'Instance',
                    component: InstanceStep,
                    bindings: {
                        slug: INSTANCE_SLUG,
                        state: this.form[INSTANCE_SLUG].input
                    }
                },
                {
                    sliderTitle: 'Blueprint',
                    hidden: this.hasNoBlueprints,
                    component: BlueprintStep,
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
            let flag = false
            Object.keys(this.form).forEach(key => {
                if (this.form[key].hasErrors) {
                    flag = true
                }
            })
            return flag
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
        updateForm (payload) {
            this.form = { ...this.form, ...payload }
        },
        async onSubmit () {
            this.loadingText = 'Creating a new Instance'
            this.formLoading = true
            const payload = {
                applicationId: this.application.id,
                name: this.form[INSTANCE_SLUG].input.name,
                projectType: this.form[INSTANCE_SLUG].input.instanceType,
                stack: this.form[INSTANCE_SLUG].input.nodeREDVersion,
                template: this.form[INSTANCE_SLUG].input.template,
                flowBlueprintId: this.form[BLUEPRINT_SLUG].blueprint?.id ?? ''
            }

            return instanceApi.create(payload)
                .then(() => this.$emit('instance-created'))
                .catch(err => {
                    const error = err.response.data.error

                    if (error) {
                        Alerts.emit('Failed to create instance: ' + error, 'warning', 7500)
                    } else {
                        Alerts.emit('Failed to create instance')
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
