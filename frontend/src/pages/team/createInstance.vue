<template>
    <ff-page>
        <template #header>
            <ff-page-header :title="pageTitle">
                <template #context>
                    Let's get your new Node-RED instance setup in no time.
                </template>
                <template #tools>
                    <section class="flex gap-3">
                        <ff-button
                            class="flex-1"
                            kind="secondary"
                            :disabled="!form.previousButtonState"
                            data-el="previous-step"
                            @click="$refs.multiStepForm.goToPreviousStep()"
                        >
                            Back
                        </ff-button>
                        <ff-button
                            class="flex-1 whitespace-nowrap"
                            :disabled="form.nextButtonState"
                            data-el="next-step"
                            @click="$refs.multiStepForm.goToNextStep()"
                        >
                            {{ form.nextStepLabel }}
                        </ff-button>
                    </section>
                </template>
            </ff-page-header>
        </template>

        <ff-loading v-if="loading" message="Creating instance..." />

        <MultiStepApplicationsInstanceForm
            v-else
            ref="multiStepForm"
            :applications="applications"
            @instance-created="onInstanceCreated"
            @previous-step-state-changed="form.previousButtonState = $event"
            @next-step-state-changed="form.nextButtonState = $event"
            @next-step-label-changed="form.nextStepLabel = $event"
        />
    </ff-page>
</template>

<script>
import { ChevronLeftIcon } from '@heroicons/vue/solid'
import { mapGetters, mapState, useStore } from 'vuex'

import ApplicationApi from '../../api/application.js'

import instanceApi from '../../api/instances.js'
import teamApi from '../../api/team.js'
import MultiStepApplicationsInstanceForm from '../../components/multi-step-forms/instance/MultiStepApplicationsInstanceForm.vue'

import Alerts from '../../services/alerts.js'
import LocalStorageService from '../../services/storage/local-storage.service.js'

export default {
    name: 'CreateInstance',
    components: {
        MultiStepApplicationsInstanceForm
    },
    beforeRouteEnter (to, from, next) {
        if (from.name === 'CreateTeamApplication') {
            // we've got a user pressing "back" from the Create Application page,
            // but this page will very likely just bounce them back as they have
            // no applications. This breaks the cycle and redirects them back to Team > Applications
            return next('/')
        }

        if (to.name === 'DeployBlueprint') {
            const store = useStore()
            if (!store.state.account.user && !LocalStorageService.getItem('redirectUrlAfterLogin')) {
                store.dispatch('account/setRedirectUrl', to.fullPath)
            }
        }

        next()
    },
    inheritAttrs: false,
    data () {
        return {
            applications: [],
            icons: {
                chevronLeft: ChevronLeftIcon
            },
            loading: false,
            sourceInstance: null,
            mounted: false,
            errors: {
                name: ''
            },
            instanceDetails: null,
            preDefinedInputs: null,
            blueprintId: null,
            application: null,
            form: {
                nextButtonState: false,
                previousButtonState: false,
                nextStepLabel: 'Next'
            }
        }
    },
    computed: {
        ...mapState('account', ['features', 'team']),
        ...mapGetters('account', ['blueprints', 'defaultBlueprint', 'defaultUserTeam']),
        isLandingFromExternalLink () {
            return this.$route.name === 'DeployBlueprint'
        },
        blueprintName () {
            return this.updatedBlueprint?.name ||
            this.preDefinedBlueprint?.name ||
            this.defaultBlueprint?.name ||
            'Blueprint'
        },
        updatedBlueprint () {
            return this.blueprints.find(blueprint => blueprint.id === this.blueprintId)
        },
        blueprintTitle () {
            return `Deploy ${this.blueprintName}`
        },
        pageTitle () {
            return this.isLandingFromExternalLink ? this.blueprintTitle : 'Instances'
        },
        preDefinedBlueprint () {
            return this.blueprints.find(blueprint => blueprint.id === this.preDefinedInputs?.flowBlueprintId)
        }
    },
    watch: {
        async team () {
            await this.getData()
        }
    },
    async created () {
        if (this.team) {
            await this.getData()
        }

        if (!this.applications.length && !this.isLandingFromExternalLink) {
            // need to also create an Application
            this.$router.push({
                name: 'CreateTeamApplication',
                params: {
                    team_slug: this.team.slug
                }
            })
        }
    },
    async mounted () {
        this.mounted = true
    },
    methods: {
        async handleFormSubmit (formData, copyParts) {
            this.loading = true

            // Drop application id, name and description from the payload
            const { applicationId, applicationName, applicationDescription, ...instanceFields } = formData
            try {
                if (!applicationId) {
                    this.application = await this.createApplication({ name: applicationName, description: applicationDescription })
                }

                const instance = await this.createInstance(applicationId || this.application.id, instanceFields, copyParts)

                await this.$store.dispatch('account/refreshTeam')

                this.$router.push({ name: 'Instance', params: { id: instance.id } })
                    .then(() => {
                        this.loading = false
                    })
                    .catch(() => {})
            } catch (err) {
                this.instanceDetails = instanceFields
                if (err.response?.status === 409) {
                    if (err.response.data?.code === 'invalid_application_name') {
                        this.errors.applicationId = 'Select an Application'
                    } else {
                        this.errors.name = err.response.data.error
                    }
                } else if (err.response?.status === 400) {
                    Alerts.emit('Failed to create instance: ' + err.response.data.error, 'warning', 7500)
                } else {
                    Alerts.emit('Failed to create instance')
                    console.error(err)
                }
                this.loading = false
            }
        },
        createInstance (applicationId, instanceDetails) {
            const createPayload = { ...instanceDetails, applicationId }

            return instanceApi.create(createPayload)
        },
        setPredefinedInputs () {
            // TODO blueprint deployment
            if (this.$route?.query && this.$route?.query?.blueprintId) {
                this.preDefinedInputs = {
                    flowBlueprintId: this.$route.query.blueprintId
                }
                this.onBlueprintUpdated(this.$route?.query?.blueprintId)
            }
        },
        async getData () {
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
        onInstanceCreated (instance) {
            return this.$router.push({ name: 'instance-overview', params: { id: instance.id } })
        }
    }
}
</script>
