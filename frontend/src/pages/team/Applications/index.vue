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

import teamApi from '../../../api/team.js'
import EmptyState from '../../../components/EmptyState.vue'
import usePermissions from '../../../composables/Permissions.js'

import ApplicationListItem from './components/Application.vue'

export default {
    name: 'TeamApplications',
    components: {
        SearchIcon,
        ApplicationListItem,
        EmptyState,
        PlusSmIcon
    },
    setup () {
        const { hasPermission } = usePermissions()

        return { hasPermission }
    },
    data () {
        return {
            loading: false,
            applications: new Map(),
            columns: [
                { label: 'Name', class: ['flex-grow'], key: 'name', sortable: true }
            ],
            filterTerm: '',
            isSearching: false
        }
    },
    computed: {
        ...mapGetters('account', ['featuresCheck', 'team', 'isFreeTeamType']),
        applicationsList () {
            return Array.from(this.applications.values())
        },
        filteredApplications () {
            if (this.filterTerm.length) {
                return this.applicationsList
                    .filter(app => {
                        return [
                            app?.name?.toLowerCase().includes(this.filterTerm.toLowerCase()),
                            app?.id?.toLowerCase().includes(this.filterTerm.toLowerCase())
                        ].includes(true)
                    })
            } return this.applicationsList
        }
    },
    watch: {
        team: 'fetchData'
    },
    async mounted () {
        await this.fetchData()

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
                        includeInstances: false,
                        includeApplicationDevices: false
                    }
                ).then((response) => {
                    const applications = response.applications
                    applications.forEach((applicationData) => {
                        applicationsMap.set(applicationData.id, applicationData)
                    })
                    this.applications = applicationsMap
                })
                    .catch(e => e)
                    .finally(() => {
                        this.loading = false
                    })
            }
        },
        setSearchQuery () {
            if (this.$route?.query && Object.prototype.hasOwnProperty.call(this.$route.query, 'searchQuery')) {
                this.filterTerm = this.$route.query.searchQuery
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

.fade-slide-move {
    transition: transform 0.3s ease;
}
</style>
