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
                    <p>Each Application can host multiple Node-RED instances, both Hosted and Remote.</p>
                    <p>Click an Application header to go to the overview of that Application.</p>
                    <p>Click an Instance within an Application to go to the Instance's overview.</p>
                </template>
                <template #tools>
                    <ff-button
                        v-if="hasPermission('project:create')"
                        data-action="create-application"
                        kind="primary"
                        :to="{name: 'CreateTeamApplication'}"
                        type="anchor"
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
                <ff-text-input
                    v-model="filterTerm"
                    class="ff-data-table--search"
                    data-form="search"
                    placeholder="Search Applications, Instances and Devices..."
                >
                    <template #icon><SearchIcon /></template>
                </ff-text-input>
                <!-- set mb-14 (~56px) on the form to permit access to kebab actions where hubspot chat covers it -->
                <ul v-if="filteredApplications.length > 0" class="ff-applications-list mb-14" data-el="applications-list">
                    <li v-for="application in filteredApplications" :key="application.id" data-el="application-item">
                        <ApplicationListItem
                            :application="application"
                            :search-query="filterTerm"
                            @instance-deleted="fetchData(false)"
                            @device-deleted="fetchData(false)"
                        />
                    </li>
                </ul>
                <p v-else class="no-results">
                    No Data Found. Try Another Search.
                </p>
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
                        type="anchor"
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
import { PlusSmIcon, SearchIcon } from '@heroicons/vue/outline'

import { mapGetters, mapState } from 'vuex'

import teamApi from '../../../api/team.js'
import EmptyState from '../../../components/EmptyState.vue'
import permissionsMixin from '../../../mixins/Permissions.js'
import Alerts from '../../../services/alerts.js'
import Tours from '../../../tours/Tours.js'

import TourFirstDevice from '../../../tours/tour-first-device.js'
import TourWelcomeFree from '../../../tours/tour-welcome-free.json'
import TourWelcome from '../../../tours/tour-welcome.json'

import ApplicationListItem from './components/Application.vue'

export default {
    name: 'TeamApplications',
    components: {
        SearchIcon,
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
            ],
            filterTerm: ''
        }
    },
    computed: {
        ...mapState('ux', ['tours', 'completeTours']),
        ...mapGetters('account', ['featuresCheck', 'team']),
        applicationsList () {
            return Array.from(this.applications.values()).map(app => {
                return {
                    ...app,
                    instances: Array.from(app.instances.values()),
                    devices: Array.from(app.devices.values())
                }
            })
        },
        filteredApplications () {
            if (this.filterTerm) {
                return this.applicationsList
                    .filter(app => {
                        const filteredInstances = app.instances.filter(instance => {
                            return [
                                instance.name.toLowerCase().includes(this.filterTerm.toLowerCase()),
                                instance.id.toLowerCase().includes(this.filterTerm.toLowerCase())
                            ].includes(true)
                        })
                        const filteredDevices = app.devices.filter(device => {
                            return [
                                device.name.toLowerCase().includes(this.filterTerm.toLowerCase()),
                                device.id.toLowerCase().includes(this.filterTerm.toLowerCase()),
                                device.type.toLowerCase().includes(this.filterTerm.toLowerCase())
                            ].includes(true)
                        })

                        return [
                            app.name.toLowerCase().includes(this.filterTerm.toLowerCase()),
                            app.id.toLowerCase().includes(this.filterTerm.toLowerCase()),
                            filteredInstances.length > 0,
                            filteredDevices.length > 0
                        ].includes(true)
                    })
                    .map(app => {
                        const filteredInstances = app.instances.filter(instance => {
                            return [
                                instance.name.toLowerCase().includes(this.filterTerm.toLowerCase()),
                                instance.id.toLowerCase().includes(this.filterTerm.toLowerCase())
                            ].includes(true)
                        })
                        const filteredDevices = app.devices.filter(device => {
                            return [
                                device.name.toLowerCase().includes(this.filterTerm.toLowerCase()),
                                device.id.toLowerCase().includes(this.filterTerm.toLowerCase()),
                                device.type.toLowerCase().includes(this.filterTerm.toLowerCase())
                            ].includes(true)
                        })

                        const filteredInstancesOrEntireSet = filteredInstances.length
                            ? filteredInstances
                            : (filteredDevices.length > 0 ? filteredInstances : app.instances)
                        const filteredDevicesOrEntireSet = filteredDevices.length
                            ? filteredDevices
                            : (filteredInstances.length > 0 ? filteredDevices : app.devices)

                        return {
                            ...app,
                            instances: filteredInstancesOrEntireSet,
                            instanceCount: filteredInstancesOrEntireSet.length,
                            devices: filteredDevicesOrEntireSet,
                            deviceCount: filteredDevicesOrEntireSet.length
                        }
                    })
            } return this.applicationsList
        },
        deviceCount () {
            if (this.applicationsList.length === 0) return 0
            return this.applicationsList.reduce((count, app) => {
                count += app.devices.length
                return count
            }, 0)
        },
        instanceCount () {
            if (this.applicationsList.length === 0) return 0
            return this.applicationsList.reduce((count, app) => {
                count += app.instances.length
                return count
            }, 0)
        },
        isFreemiumTeamType () {
            return !this.featuresCheck?.isHostedInstancesEnabledForTeam
        }
    },
    watch: {
        team: 'fetchData',
        tours: {
            handler (tours) {
                // handles the user manually re-requesting the tour
                if (tours.welcome) {
                    this.dispatchTour()
                }
            },
            deep: true,
            immediate: true
        }
    },
    async mounted () {
        await this.fetchData()
        if ('billing_session' in this.$route.query) {
            this.$nextTick(() => {
                // Clear the query param so a reload of the page does re-trigger
                // the notification
                this.$router.replace({ query: '' })
                // allow the Alerts service to have subscription by wrapping in nextTick
                Alerts.emit('Thanks for signing up to FlowFuse!', 'confirmation')
            })
        }

        if (this.tours.welcome) {
            // given we've loaded resources, check for tour status
            this.dispatchTour()
        }

        this.setSearchQuery()
    },
    methods: {
        async fetchData (withLoading = true) {
            this.loading = withLoading
            if (this.team.id) {
                const applicationsMap = new Map()

                const applicationsPromise = teamApi.getTeamApplications(this.team.id, { includeApplicationSummary: true })

                const applications = (await applicationsPromise).applications
                applications.forEach((applicationData) => {
                    const application = applicationsMap.get(applicationData.id) || {}
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

                    applicationsMap.set(applicationData.id, {
                        ...application,
                        ...applicationProps
                    })
                })
                this.applications = applicationsMap
                // Only update statuses *after* populating this.applications
                this.updateApplicationAssociationStatuses()
            }
            this.loading = false
        },
        async updateApplicationAssociationStatuses () {
            const applicationsAssociationsStatuses = (await teamApi.getTeamApplicationsAssociationsStatuses(this.team.id, { includeApplicationSummary: true })).applications

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
        },
        setSearchQuery () {
            if (this.$route?.query && Object.prototype.hasOwnProperty.call(this.$route.query, 'searchQuery')) {
                this.filterTerm = this.$route.query.searchQuery
            }
        },
        hasTourBeenCompleted (tour) {
            return Object.prototype.hasOwnProperty.call(this.completeTours, tour)
        },
        dispatchTour () {
            switch (true) {
            case this.isFreemiumTeamType && !this.hasTourBeenCompleted('first-device') && !!this.applicationsList[0]:
                // freemium users must first undergo the first-device tour on the ApplicationDevices page
                return this.$store.dispatch('ux/activateTour', 'first-device')
                    .then(() => this.$router.push({
                        name: 'ApplicationDevices',
                        params: { team_slug: this.team.slug, id: this.applicationsList[0].id }
                    }))
                    .then(() => Tours.create(
                        'first-device',
                        TourFirstDevice,
                        this.$store
                    ))
                    .then((tour) => tour.start())
                    .catch(e => e)

            case this.isFreemiumTeamType && this.hasTourBeenCompleted('first-device'):
                // we're starting the delayed free tour for freemium tiers (without any instances pre-created)
                return (Tours.create('welcome',
                    TourWelcomeFree,
                    this.$store,
                    () => {
                        if (this.deviceCount === 0) {
                            this.$store.dispatch('ux/activateTour', 'first-device')
                        } else {
                            this.$store.dispatch('ux/activateTour', 'education')
                        }
                    })).start()

            case !this.isFreemiumTeamType && this.instanceCount > 0:
                // Running with an Instance pre-configured (Trial team types)
                return (Tours.create('welcome', TourWelcome, this.$store, () => {
                    this.$store.dispatch('ux/activateTour', 'education')
                })).start()

            case !this.isFreemiumTeamType:
                // any regular team type
                return (Tours.create('welcome', TourWelcomeFree, this.$store, () => {
                    if (this.deviceCount === 0) {
                        this.$store.dispatch('ux/activateTour', 'first-device')
                    }
                })).start()

            default:
                // no tours
            }
        }
    }
}
</script>

<style lang="scss">
@import "../../../stylesheets/components/applications-list";

.no-results {
  text-align: center;
  color: $ff-grey-400;
}
</style>
