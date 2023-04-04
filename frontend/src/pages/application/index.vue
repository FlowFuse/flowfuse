<template>
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigationTeamOptions>
            <template #nested-menu>
                <div class="ff-nested-title">Application</div>
                <router-link v-for="route in navigation" :key="route.label" :to="route.path">
                    <nav-item :icon="route.icon" :label="route.label" :data-nav="route.tag" />
                </router-link>
            </template>
        </SideNavigationTeamOptions>
    </Teleport>

    <ff-loading v-if="loading.deleting" message="Deleting Application..." />
    <ff-loading v-else-if="loading.suspend" message="Suspending Application..." />
    <main v-else-if="!application?.id">
        <ff-loading message="Loading Application..." />
    </main>
    <main v-else class="ff-with-status-header">
        <ConfirmApplicationDeleteDialog ref="confirmApplicationDeleteDialog" @confirm="deleteApplication" />
        <Teleport v-if="mounted" to="#platform-banner">
            <div v-if="isVisitingAdmin" class="ff-banner" data-el="banner-project-as-admin">
                You are viewing this application as an Administrator
            </div>
            <SubscriptionExpiredBanner :team="team" />
            <TeamTrialBanner v-if="team.billing?.trial" :team="team" />
        </Teleport>
        <div class="ff-instance-header">
            <InstanceStatusHeader>
                <template #hero>
                    <div class="flex-grow space-x-6 items-center inline-flex" data-el="application-name">
                        <div class="text-gray-800 text-xl font-bold">
                            <div class="text-sm font-medium text-gray-500">Application:</div>
                            {{ application.name }}
                        </div>
                    </div>
                </template>
            </InstanceStatusHeader>
        </div>
        <div class="px-3 py-3 md:px-6 md:py-6">
            <router-view
                :application="application"
                :instances="Array.from(applicationInstances.values())"
                :is-visiting-admin="isVisitingAdmin"
                @application-delete="showConfirmDeleteApplicationDialog"
                @application-updated="updateApplication"
                @instance-delete="instanceShowConfirmDelete"
                @instance-restart="instanceRestart"
                @instance-start="instanceStart"
                @instance-suspend="instanceSuspend"
                @instances-disabled-polling="pollingWarning"
                @instances-enable-polling="pollingWarning"
            />
        </div>
    </main>
</template>

<script>
import { CogIcon, TerminalIcon, ViewListIcon } from '@heroicons/vue/solid'

import { mapState } from 'vuex'

import { Roles } from '../../../../forge/lib/roles'

import applicationApi from '../../api/application'
import InstanceStatusHeader from '../../components/InstanceStatusHeader'

import NavItem from '../../components/NavItem'
import SideNavigationTeamOptions from '../../components/SideNavigationTeamOptions.vue'
import SubscriptionExpiredBanner from '../../components/banners/SubscriptionExpired.vue'
import TeamTrialBanner from '../../components/banners/TeamTrial.vue'

import ProjectsIcon from '../../components/icons/Projects'
import permissionsMixin from '../../mixins/Permissions'

import alerts from '../../services/alerts'

import ConfirmApplicationDeleteDialog from './Settings/dialogs/ConfirmApplicationDeleteDialog'

export default {
    name: 'ProjectPage',
    components: {
        ConfirmApplicationDeleteDialog,
        NavItem,
        SideNavigationTeamOptions,
        SubscriptionExpiredBanner,
        TeamTrialBanner,
        InstanceStatusHeader
    },
    mixins: [permissionsMixin],
    data: function () {
        return {
            mounted: false,
            application: {},
            applicationInstances: new Map(),
            loading: {
                deleting: false,
                suspend: false
            }
        }
    },
    computed: {
        ...mapState('account', ['teamMembership', 'team']),
        isVisitingAdmin () {
            return this.teamMembership.role === Roles.Admin
        },
        isLoading () {
            return this.loading.deleting || this.loading.suspend
        },
        navigation () {
            return [
                { label: 'Node-RED Instances', path: `/application/${this.application.id}/instances`, tag: 'project-overview', icon: ProjectsIcon },
                { label: 'Node-RED Logs', path: `/application/${this.application.id}/logs`, tag: 'project-logs', icon: TerminalIcon },
                { label: 'Audit Log', path: `/application/${this.application.id}/activity`, tag: 'project-activity', icon: ViewListIcon },
                { label: 'Settings', path: `/application/${this.application.id}/settings`, tag: 'project-settings', icon: CogIcon }
            ]
        }
    },
    async created () {
        await this.updateApplication()

        this.$watch(
            () => this.$route.params.id,
            async () => {
                await this.updateApplication()
            }
        )
    },
    mounted () {
        this.mounted = true
    },
    methods: {
        async updateApplication () {
            const applicationId = this.$route.params.id
            try {
                this.applicationInstances = []
                const applicationPromise = applicationApi.getApplication(applicationId)
                const instancesPromise = applicationApi.getApplicationInstances(applicationId) // To-do needs to be enriched with instance state

                this.application = await applicationPromise
                const applicationInstances = await instancesPromise

                this.applicationInstances = new Map()
                applicationInstances.forEach(instance => {
                    this.applicationInstances.set(instance.id, instance)
                })

                // Not waited for, as loading status is slightly slower
                applicationApi
                    .getApplicationInstancesStatuses(applicationId)
                    .then((instanceStatuses) => {
                        instanceStatuses.forEach((instanceStatus) => {
                            this.applicationInstances.set(instanceStatus.id, {
                                ...this.applicationInstances.get(instanceStatus.id),
                                ...instanceStatus
                            })
                        })
                    })
                    .catch((err) => {
                        console.error(err)
                    })

                this.$store.dispatch('account/setTeam', this.application.team.slug)
            } catch (err) {
                this.$router.push({
                    name: 'PageNotFound',
                    params: { pathMatch: this.$router.currentRoute.value.path.substring(1).split('/') },
                    // preserve existing query and hash if any
                    query: this.$router.currentRoute.value.query,
                    hash: this.$router.currentRoute.value.hash
                })
            }
        },

        showConfirmDeleteApplicationDialog () {
            this.$refs.confirmApplicationDeleteDialog.show(this.application)
        },

        async deleteApplication () {
            this.loading.deleting = true

            try {
                await applicationApi.deleteApplication(this.application.id)
                await this.$store.dispatch('account/refreshTeam')
                this.$router.push({ name: 'Home' })
                alerts.emit('Application successfully deleted.', 'confirmation')
            } catch (err) {
                if (err.response.data.error) {
                    alerts.emit(`Application failed to delete: ${err.response.data.error}`, 'warning')
                } else {
                    alerts.emit('Application failed to delete', 'warning')
                }
            }

            this.loading.deleting = false
        },

        pollingWarning () {
            console.warn('Polling yet be implemented')
            // Logic here to poll for live statuses
        },

        instanceShowConfirmDelete () {
            alert('Not implemented')
        },

        instanceRestart () {
            alert('Not implemented')
        },

        instanceStart () {
            alert('Not implemented')
        },

        instanceSuspend () {
            alert('Not implemented')
        }
    }
}
</script>
