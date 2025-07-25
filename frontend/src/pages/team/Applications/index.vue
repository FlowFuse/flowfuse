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
                <ul v-if="filteredApplications.length > 0" class="ff-applications-list relative" data-el="applications-list">
                    <transition-group name="fade-slide">
                        <ApplicationListItem
                            v-for="application in filteredApplications"
                            :key="application.id"
                            data-el="application-item"
                            :application="application"
                            :search-query="filterTerm"
                            :is-searching="isSearching"
                            @instance-deleted="fetchData(false)"
                            @device-deleted="fetchData(false)"
                        />
                    </transition-group>
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

import { mapGetters } from 'vuex'

import instanceApi from '../../../api/instances.js'
import searchApi from '../../../api/search.js'
import teamApi from '../../../api/team.js'
import EmptyState from '../../../components/EmptyState.vue'
import permissionsMixin from '../../../mixins/Permissions.js'
import Alerts from '../../../services/alerts.js'
import { debounce } from '../../../utils/eventHandling.js'

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
            filterTerm: '',
            debouncedFilterTerm: '',
            isSearching: false
        }
    },
    computed: {
        ...mapGetters('account', ['featuresCheck', 'team', 'isFreeTeamType']),
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
            if (this.debouncedFilterTerm) {
                return this.applicationsList
                    .filter(app => {
                        const filteredInstances = app.instances.filter(instance => {
                            return [
                                instance?.name?.toLowerCase().includes(this.debouncedFilterTerm.toLowerCase()),
                                instance?.id?.toLowerCase().includes(this.debouncedFilterTerm.toLowerCase())
                            ].includes(true)
                        })
                        const filteredDevices = app.devices.filter(device => {
                            return [
                                device?.name?.toLowerCase().includes(this.debouncedFilterTerm.toLowerCase()),
                                device?.id?.toLowerCase().includes(this.debouncedFilterTerm.toLowerCase()),
                                device?.type?.toLowerCase().includes(this.debouncedFilterTerm.toLowerCase())
                            ].includes(true)
                        })

                        return [
                            app?.name?.toLowerCase().includes(this.debouncedFilterTerm.toLowerCase()),
                            app?.id?.toLowerCase().includes(this.debouncedFilterTerm.toLowerCase()),
                            filteredInstances.length > 0,
                            filteredDevices.length > 0
                        ].includes(true)
                    })
                    .map(app => {
                        const filteredInstances = app.instances.filter(instance => {
                            return [
                                instance.name?.toLowerCase().includes(this.debouncedFilterTerm.toLowerCase()),
                                instance.id?.toLowerCase().includes(this.debouncedFilterTerm.toLowerCase())
                            ].includes(true)
                        })
                        const filteredDevices = app.devices.filter(device => {
                            return [
                                device.name?.toLowerCase().includes(this.debouncedFilterTerm.toLowerCase()),
                                device.id?.toLowerCase().includes(this.debouncedFilterTerm.toLowerCase()),
                                device.type?.toLowerCase().includes(this.debouncedFilterTerm.toLowerCase())
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
        }
    },
    watch: {
        team: 'fetchData',
        filterTerm: {
            handler: debounce(async function (filterTerm) {
                this.isSearching = true
                if (filterTerm.length === 0) {
                    this.isSearching = false
                    this.debouncedFilterTerm = filterTerm
                    return
                }

                this.search(filterTerm)
                    .then(() => {
                        this.debouncedFilterTerm = filterTerm
                        this.isSearching = false
                    })
                    .catch(e => e)
            }, 500)
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

        this.setSearchQuery()
    },
    methods: {
        async fetchData (withLoading = true) {
            this.loading = withLoading
            if (this.team.id) {
                const applicationsMap = new Map()

                teamApi.getTeamApplications(this.team.id,
                    {
                        includeApplicationSummary: true,
                        associationsLimit: 3
                    }
                ).then((response) => {
                    const applications = response.applications
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
                })
                    .then(() => this.updateApplicationAssociationStatuses()) // Only update statuses *after* populating this.applications
                    .catch(e => e)
                    .finally(() => {
                        this.loading = false
                    })
            }
        },
        async updateApplicationAssociationStatuses () {
            this.applications.forEach(app => {
                app.instances.forEach((instance, key) => {
                    instanceApi.getStatus(instance.id)
                        .then(res => {
                            app.instances.set(key, {
                                ...instance,
                                meta: res.meta
                            })
                        }).catch(e => e)
                })
            })
        },
        setSearchQuery () {
            if (this.$route?.query && Object.prototype.hasOwnProperty.call(this.$route.query, 'searchQuery')) {
                this.filterTerm = this.$route.query.searchQuery
            }
        },
        async search (filterTerm) {
            return searchApi.searchInstances(this.team.id, filterTerm)
                .then((response) => response.results)
                .then((results) => {
                    results.forEach(instance => {
                        if (instance.instanceType === 'hosted') {
                            this.applications.get(instance.application.id).instances.set(instance.id, instance)
                        }

                        if (instance.instanceType === 'remote') {
                            this.applications.get(instance.application.id).devices.set(instance.id, instance)
                        }
                    })
                })
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

.fade-slide-enter-active,
.fade-slide-leave-active,
.fade-slide-move {
    transition: all 0.3s ease;
}

.fade-slide-enter-from {
    opacity: 0;
    transform: translateX(30px);
}

.fade-slide-enter-to {
    opacity: 1;
    transform: translateX(0);
}

.fade-slide-leave-from {
    opacity: 1;
    transform: translateX(0);
}

.fade-slide-leave-to {
    opacity: 0;
    transform: translateX(30px);
}

/* Optional: animate reordered items */
.fade-slide-move {
    transition: transform 0.3s ease;
}
</style>
