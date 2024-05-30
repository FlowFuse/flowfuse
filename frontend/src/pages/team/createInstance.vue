<template>
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigation>
            <template #options>
                <a @click="$router.back()">
                    <nav-item :icon="icons.chevronLeft" label="Back" />
                </a>
            </template>
        </SideNavigation>
    </Teleport>
    <ff-page>
        <template #header>
            <ff-page-header title="Instances">
                <template #context>
                    Let's get your new Node-RED instance setup in no time.
                </template>
            </ff-page-header>
        </template>

        <ff-loading v-if="loading" message="Creating instance..." />
        <InstanceForm
            v-else
            :instance="instanceDetails"
            :team="team"
            :applicationSelection="true"
            :applications="applications"
            :billing-enabled="!!features.billing"
            :flow-blueprints-enabled="!!features.flowBlueprints"
            :submit-errors="errors"
            :pre-defined-inputs="preDefinedInputs"
            :has-header="false"
            @on-submit="handleFormSubmit"
        />
    </ff-page>
</template>

<script>
import { ChevronLeftIcon } from '@heroicons/vue/solid'
import { mapState } from 'vuex'

import instanceApi from '../../api/instances.js'
import teamApi from '../../api/team.js'

import NavItem from '../../components/NavItem.vue'
import SideNavigation from '../../components/SideNavigation.vue'
import Alerts from '../../services/alerts.js'
import InstanceForm from '../instance/components/InstanceForm.vue'

export default {
    name: 'CreateInstance',
    components: {
        InstanceForm,
        NavItem,
        SideNavigation
    },
    beforeRouteEnter (to, from, next) {
        // we've got a user pressing "back" from the Create Application page,
        // but this page will very likely just bounce them back as they have
        // no applications. This breaks the cycle and redirects them back to Team > Applications
        if (from.name === 'CreateTeamApplication') {
            next('/')
        } else {
            next()
        }
    },
    inheritAttrs: false,
    data () {
        return {
            applications: null,
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
            preDefinedInputs: null
        }
    },
    computed: {
        ...mapState('account', ['features', 'team'])
    },
    async created () {
        const data = await teamApi.getTeamApplications(this.team.id)
        this.applications = data.applications.map((a) => {
            return {
                label: a.name,
                description: a.description,
                value: a.id
            }
        })

        if (!this.applications.length) {
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
        this.setPredefinedInputs()
    },
    methods: {
        async handleFormSubmit (formData, copyParts) {
            this.loading = true

            // Drop application id, name and description from the payload
            const { applicationId, applicationName, applicationDescription, ...instanceFields } = formData

            try {
                const instance = await this.createInstance(applicationId, instanceFields, copyParts)

                await this.$store.dispatch('account/refreshTeam')

                this.$router.push({ name: 'Instance', params: { id: instance.id } })
            } catch (err) {
                this.instanceDetails = instanceFields
                if (err.response?.status === 409) {
                    this.errors.name = err.response.data.error
                } else if (err.response?.status === 400) {
                    Alerts.emit('Failed to create instance: ' + err.response.data.error, 'warning', 7500)
                } else {
                    Alerts.emit('Failed to create instance')
                    console.error(err)
                }
            }

            this.loading = false
        },
        createInstance (applicationId, instanceDetails) {
            const createPayload = { ...instanceDetails, applicationId }

            return instanceApi.create(createPayload)
        },
        setPredefinedInputs () {
            if (this.$route?.query && this.$route?.query?.blueprintId) {
                this.preDefinedInputs = {
                    flowBlueprintId: this.$route.query.blueprintId
                }
            }
        }
    }
}
</script>
