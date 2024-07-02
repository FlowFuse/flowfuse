<template>
    <ff-page>
        <template #header>
            <ff-page-header title="Applications">
                <template #context>
                    View all of your Node-RED instances.
                </template>
                <template #help-header>
                    Applications
                </template>
                <template #pictogram>
                    <img src="../../../images/pictograms/application_red.png">
                </template>
                <template #helptext>
                    <p>This is a list of all Applications hosted on the same domain as FlowFuse.</p>
                    <p>Each Application can host multiple Node-RED instances.</p>
                    <p>Click an application header to go to the overview of that application.</p>
                    <p>Click an instance within an application to go to the Instances overview.</p>
                </template>
                <template #tools>
                    <ff-button
                        v-if="hasPermission('project:create')"
                        data-action="create-application"
                        kind="primary"
                        :to="{name: 'CreateTeamApplication'}"
                    >
                        <template #icon-left>
                            <PlusSmIcon />
                        </template>
                        Create Application
                    </ff-button>
                </template>
            </ff-page-header>
        </template>
        <div class="space-y-6">
            <ff-loading v-if="loading" message="Loading Applications..." />

            <template v-else-if="!loading && applications.size > 0">
                <ul class="ff-applications-list" data-el="applications-list">
                    <li v-for="application in applicationsList" :key="application.id">
                        <ApplicationListItem :application="application" />
                    </li>
                </ul>
            </template>

            <EmptyState v-else>
                <template #img>
                    <img src="../../../images/empty-states/team-applications.png">
                </template>
                <template #header>Get Started with your First Application</template>
                <template #message>
                    <p>Applications in FlowFuse are used to manage groups of Node-RED Instances</p>
                    <p>
                        Instances within Applications can be connected as
                        <a class="ff-link" href="https://flowfuse.com/docs/user/staged-deployments" target="_blank">Staged Deployments.</a>
                    </p>
                </template>
                <template #actions>
                    <ff-button
                        v-if="hasPermission('project:create')"
                        data-action="create-application"
                        kind="primary"
                        :to="{name: 'CreateTeamApplication'}"
                    >
                        <template #icon-left>
                            <PlusSmIcon />
                        </template>
                        Create Application
                    </ff-button>
                </template>
                <template #note>
                    <p>
                        The FlowFuse team also have more planned for Applications, including
                        <a class="ff-link" href="https://github.com/FlowFuse/flowfuse/issues/1734" target="_blank">
                            shared settings across Instances</a>.
                    </p>
                </template>
            </EmptyState>
        </div>
        <router-view />
    </ff-page>
</template>

<script>
import { PlusSmIcon } from '@heroicons/vue/outline'

import teamApi from '../../../api/team.js'
import EmptyState from '../../../components/EmptyState.vue'
import permissionsMixin from '../../../mixins/Permissions.js'
import Alerts from '../../../services/alerts.js'

import ApplicationListItem from './components/Application.vue'

const ASSOCIATIONS_LIMIT = 3

export default {
    name: 'TeamApplications',
    components: {
        ApplicationListItem,
        EmptyState,
        PlusSmIcon
    },
    mixins: [permissionsMixin],
    data () {
        return {
            loading: false,
            applications: new Map(),
            columns: [
                { label: 'Name', class: ['flex-grow'], key: 'name', sortable: true }
            ]
        }
    },
    computed: {
        applicationsList () {
            return Array.from(this.applications.values())
        }
    },
    watch: {
        team: 'fetchData'
    },
    mounted () {
        this.fetchData()
        if ('billing_session' in this.$route.query) {
            this.$nextTick(() => {
                // Clear the query param so a reload of the page does retrigger
                // the notification
                this.$router.replace({ query: '' })
                // allow the Alerts servcie to have subscription by wrapping in nextTick
                Alerts.emit('Thanks for signing up to FlowFuse!', 'confirmation')
            })
        }
    },
    methods: {
        async fetchData () {
            this.loading = true
            if (this.team.id) {
                this.applications = new Map()

                const applicationsPromise = teamApi.getTeamApplications(this.team.id, { associationsLimit: ASSOCIATIONS_LIMIT })

                // Not waited for as it can resolve in any order
                this.updateApplicationAssociationStatuses()

                const applications = (await applicationsPromise).applications
                applications.forEach((applicationData) => {
                    const application = this.applications.get(applicationData.id) || {}
                    if (!application.instances) {
                        application.instances = new Map()
                    }

                    const { instancesSummary, devicesSummary, ...applicationProps } = applicationData
                    instancesSummary.instances.forEach((instanceData) => {
                        application.instances.set(instanceData.id, {
                            ...application.instances.get(instanceData.id),
                            ...instanceData
                        })
                    })

                    if (!application.devices) {
                        application.devices = new Map()
                    }
                    devicesSummary.devices.forEach((deviceData) => {
                        application.devices.set(deviceData.id, {
                            ...application.devices.get(deviceData.id),
                            ...deviceData
                        })
                    })

                    application.instanceCount = instancesSummary.count
                    application.deviceCount = devicesSummary.count

                    this.applications.set(applicationData.id, {
                        ...application,
                        ...applicationProps
                    })
                })
            }
            this.loading = false
        },
        async updateApplicationAssociationStatuses () {
            const applicationsAssociationsStatuses = (await teamApi.getTeamApplicationsAssociationsStatuses(this.team.id, { associationsLimit: ASSOCIATIONS_LIMIT })).applications

            applicationsAssociationsStatuses.forEach((applicationData) => {
                const application = this.applications.get(applicationData.id) || {}

                if (!application.instances) {
                    application.instances = new Map()
                }

                if (!application.devices) {
                    application.devices = new Map()
                }

                const { instances: instanceStatuses, devices: deviceStatuses, ...applicationProps } = applicationData
                instanceStatuses.forEach((instanceStatusData) => {
                    application.instances.set(instanceStatusData.id, {
                        ...application.instances.get(instanceStatusData.id),
                        ...instanceStatusData
                    })
                })

                deviceStatuses.forEach((deviceStatusData) => {
                    application.devices.set(deviceStatusData.id, {
                        ...application.devices.get(deviceStatusData.id),
                        ...deviceStatusData
                    })
                })

                this.applications.set(applicationData.id, {
                    ...application,
                    ...applicationProps
                })
            })
        }
    }
}
</script>

<style lang="scss">
@import "../../../stylesheets/components/applications-list";
</style>
