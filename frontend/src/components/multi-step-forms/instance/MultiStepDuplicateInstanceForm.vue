<template>
    <MultiStepForm
        ref="multiStepForm"
        :steps="formSteps"
        :starting-step="2"
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

import instanceApi from '../../../api/instances.js'
import teamApi from '../../../api/team.js'
import Alerts from '../../../services/alerts.js'
import NameGenerator from '../../../utils/name-generator/index.js'
import MultiStepForm from '../MultiStepForm.vue'

import ApplicationStep from './steps/ApplicationStep.vue'

import DuplicationStep from './steps/DuplicationStep.vue'
import InstanceStep from './steps/InstanceStep.vue'

const INSTANCE_SLUG = 'instance'
const APPLICATION_SLUG = 'application'
const DUPLICATION_SLUG = 'duplication'

export default {
    name: 'MultiStepDuplicateInstanceForm',
    components: { MultiStepForm },
    props: {
    },
    emits: ['instance-created', 'previous-step-state-changed', 'next-step-state-changed', 'next-step-label-changed'],
    data () {
        return {
            applications: [],
            form: {
                [APPLICATION_SLUG]: { },
                [INSTANCE_SLUG]: { },
                [DUPLICATION_SLUG]: { }
            },
            formLoading: false,
            instance: null,
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
                    component: ApplicationStep,
                    bindings: {
                        slug: APPLICATION_SLUG,
                        applications: this.applications,
                        state: this.form[APPLICATION_SLUG]
                    }
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
                    sliderTitle: 'Overview',
                    component: DuplicationStep,
                    bindings: {
                        slug: DUPLICATION_SLUG,
                        state: this.form[DUPLICATION_SLUG],
                        instance: this.instance,
                        instanceSelection: this.form[INSTANCE_SLUG].input ?? {},
                        applicationSelection: this.form[APPLICATION_SLUG] ?? {},
                        applications: this.applications
                    }
                }
            ]
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
        instance: {
            immediate: true,
            handler (instance) {
                if (!instance) {
                    this.getInstance()
                        .then(() => {
                            // workaround for the fact that the team might not be loaded,
                            // eg team not
                            if (!this.team) {
                                return this.$store.dispatch('account/setTeam', this.instance.team.slug)
                            }
                        })
                        .then(() => this.getApplications())
                        .then(() => this.prefillForm())
                        .catch(e => e)
                        .finally(() => {
                            this.loading = false
                        })
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
                applicationId: this.form[APPLICATION_SLUG].selection.id,
                name: this.form[INSTANCE_SLUG].input.name,
                projectType: this.form[INSTANCE_SLUG].input.instanceType,
                stack: this.form[INSTANCE_SLUG].input.nodeREDVersion,
                template: this.form[INSTANCE_SLUG].input.template,
                sourceProject: {
                    id: this.instance.id,
                    options: { ...(this.form[DUPLICATION_SLUG]?.copyParts ?? {}) }
                }
            }

            return instanceApi.create(payload)
                .then((instance) => this.$emit('instance-created', instance))
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
        async getApplications () {
            const data = await teamApi.getTeamApplications(this.team.id)
            this.applications = data.applications.map((a) => {
                return {
                    label: a.name,
                    description: a.description,
                    value: a.id,
                    id: a.id,
                    counters: {
                        instances: a.instances.length,
                        devices: a.devices.length
                    }
                }
            })
        },
        async getInstance () {
            this.instance = await instanceApi.getInstance(this.$route.params.id)
            console.log(this.instance)
        },
        prefillForm () {
            const input = {
                instanceType: this.instance.projectType.id,
                name: NameGenerator(),
                nodeREDVersion: this.instance.stack.id,
                template: this.instance.template.id
            }

            this.form[INSTANCE_SLUG].input = input
            if (this.instance.application) {
                this.form[APPLICATION_SLUG].selection = {
                    id: this.instance.application.id
                }
            }
        }
    }
}
</script>

<style scoped lang="scss">

</style>
