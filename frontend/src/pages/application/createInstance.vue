<template>
    <Teleport
        v-if="mounted"
        to="#platform-sidenav"
    >
        <SideNavigation>
            <template #options>
                <a @click="$router.back()">
                    <nav-item
                        :icon="icons.chevronLeft"
                        label="Back"
                    />
                </a>
            </template>
        </SideNavigation>
    </Teleport>
    <ff-page>
        <template #header>
            <ff-page-header title="Instances">
                <template #custom-breadcrumbs>
                    <ff-nav-breadcrumb v-if="team" :to="{name: 'Applications', params: {team_slug: team.slug}}">Applications</ff-nav-breadcrumb>
                    <ff-nav-breadcrumb v-if="team" :to="{name: 'Application', params: {id: application.id}}">
                        {{ application.name }}
                    </ff-nav-breadcrumb>
                    <ff-nav-breadcrumb>
                        Create Instance
                    </ff-nav-breadcrumb>
                </template>
                <template #context>
                    Let's get your new Node-RED instance setup in no time.
                </template>
            </ff-page-header>
        </template>

        <ff-loading v-if="isLoading" />
        <ff-loading v-else-if="sourceInstanceId && !sourceInstance" message="Loading instance to Copy From..." />
        <InstanceForm
            v-else
            :has-header="false"
            :instance="instanceDetails"
            :source-instance="sourceInstance"
            :team="team"
            :applicationFieldsLocked="!!application?.id"
            :billing-enabled="!!features.billing"
            :flow-blueprints-enabled="!!features.flowBlueprints"
            :submit-errors="errors"
            @on-submit="handleFormSubmit"
        />
    </ff-page>
</template>

<script>
import { ChevronLeftIcon } from '@heroicons/vue/solid/index.js'
import { mapState } from 'vuex'

import instanceApi from '../../api/instances.js'

import NavItem from '../../components/NavItem.vue'
import SideNavigation from '../../components/SideNavigation.vue'
import applicationMixin from '../../mixins/Application.js'
import Alerts from '../../services/alerts.js'
import InstanceForm from '../instance/components/InstanceForm.vue'

export default {
    name: 'ApplicationCreateInstance',
    components: {
        InstanceForm,
        NavItem,
        SideNavigation
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
            icons: {
                chevronLeft: ChevronLeftIcon
            },
            loading: false,
            sourceInstance: null,
            mounted: false,
            errors: {
                name: ''
            },
            instanceDetails: null
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
        async handleFormSubmit (formData, copyParts) {
            this.loading = true

            // Drop applicationName from the payload
            const { applicationName, ...instanceFields } = formData

            try {
                await this.createInstance(instanceFields, copyParts)
                await this.$store.dispatch('account/refreshTeam')

                this.$emit('application-updated')

                this.$router.push({ name: 'ApplicationInstances', params: { id: this.application.id } })
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
        createInstance (instanceDetails, copyParts) {
            const createPayload = { ...instanceDetails, applicationId: this.application.id }
            if (this.sourceInstance?.id) {
                delete createPayload.flowBlueprintId
                createPayload.sourceProject = {
                    id: this.sourceInstanceId,
                    options: { ...copyParts }
                }
            }
            if (this.features.ha && createPayload.isHA) {
                createPayload.ha = { replicas: 2 }
            }
            delete createPayload.isHA

            return instanceApi.create(createPayload)
        }

    }

}
</script>
