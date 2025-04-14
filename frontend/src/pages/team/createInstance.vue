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
            @form-success-instance="onInstanceCreated"
            @previous-step-state-changed="form.previousButtonState = $event"
            @next-step-state-changed="form.nextButtonState = $event"
            @next-step-label-changed="form.nextStepLabel = $event"
        />
    </ff-page>
</template>

<script>
import { mapGetters, mapState, useStore } from 'vuex'

import teamApi from '../../api/team.js'
import MultiStepApplicationsInstanceForm from '../../components/multi-step-forms/instance/MultiStepApplicationsInstanceForm.vue'

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
            loading: false,
            mounted: false,
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
        pageTitle () {
            return this.isLandingFromExternalLink ? 'Deploy Blueprint' : 'Instances'
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
