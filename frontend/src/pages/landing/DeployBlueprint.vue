<template>
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigationTeamOptions />
    </Teleport>
    <ff-page>
        <template #header>
            <ff-page-header :title="blueprintTitle">
                <template #context>
                    Let's get your new Node-RED instance setup in no time.
                </template>
            </ff-page-header>
        </template>
        <ff-loading v-if="loading" message="Creating instance..." />
        <InstanceForm
            v-else
            :team="team"
            :applicationSelection="true"
            :applications="applicationsList"
            :billing-enabled="!!features.billing"
            :flow-blueprints-enabled="!!features.flowBlueprints"
            :submit-errors="errors"
            :pre-defined-inputs="preDefinedInputs"
            :has-header="false"
            @on-submit="handleFormSubmit"
            @blueprint-updated="onBlueprintUpdated"
        />
    </ff-page>
</template>

<script>
import { ChevronLeftIcon } from '@heroicons/vue/solid'
import { mapActions, mapGetters, mapState } from 'vuex'

import instanceApi from '../../api/instances.js'

import teamApi from '../../api/team.js'

import SideNavigationTeamOptions from '../../components/SideNavigationTeamOptions.vue'
import Alerts from '../../services/alerts.js'
import InstanceForm from '../instance/components/InstanceForm.vue'

export default {
    name: 'DeployBlueprint',
    components: {
        InstanceForm,
        SideNavigationTeamOptions
    },
    data () {
        return {
            icons: {
                chevronLeft: ChevronLeftIcon
            },
            applications: [],
            loading: false,
            preDefinedInputs: null,
            mounted: false,
            errors: {
                name: ''
            },
            blueprintId: null
        }
    },
    computed: {
        ...mapState('account', ['features', 'team', 'user']),
        ...mapGetters('account', ['blueprints', 'defaultBlueprint', 'defaultUserTeam']),
        applicationsList () {
            return this.applications.map(application => ({
                value: application.id,
                label: application.name,
                description: application.description
            }))
        },
        updatedBlueprint () {
            return this.blueprints.find(blueprint => blueprint.id === this.blueprintId)
        },
        preDefinedBlueprint () {
            return this.blueprints.find(blueprint => blueprint.id === this.preDefinedInputs?.flowBlueprintId)
        },
        blueprintName () {
            return this.updatedBlueprint?.name ||
                this.preDefinedBlueprint?.name ||
                this.defaultBlueprint?.name ||
                'Blueprint'
        },
        blueprintTitle () {
            return `Deploy ${this.blueprintName}`
        }
    },
    mounted () {
        this.mounted = true
        this.setPredefinedInputs()
    },
    async created () {
        await this.setTeam(this.defaultUserTeam)
            .then(async () => {
                this.applications = (await teamApi.getTeamApplications(this.defaultUserTeam.id)).applications
            })
            .catch(() => {})
    },
    methods: {
        ...mapActions('account', ['setTeam']),
        async handleFormSubmit (formData, copyParts) {
            this.loading = true
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
        setPredefinedInputs () {
            if (this.$route?.query && this.$route?.query?.blueprintId) {
                this.preDefinedInputs = {
                    flowBlueprintId: this.$route.query.blueprintId
                }
            }
        },
        createInstance (applicationId, instanceDetails) {
            const createPayload = { ...instanceDetails, applicationId }

            return instanceApi.create(createPayload)
        },
        onBlueprintUpdated (blueprintId) {
            this.blueprintId = blueprintId
        }
    }
}
</script>

<style scoped lang="scss">

</style>
