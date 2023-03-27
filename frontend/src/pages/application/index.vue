<template>
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigationTeamOptions>
            <template #nested-menu>
                <div class="ff-nested-title">{{ application.name ?? 'Application' }}</div>
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
    <main v-else>
        <ConfirmApplicationDeleteDialog ref="confirmApplicationDeleteDialog" @confirm="deleteApplication" />
        <Teleport v-if="mounted" to="#platform-banner">
            <div v-if="isVisitingAdmin" class="ff-banner" data-el="banner-project-as-admin">You are viewing this application as an Administrator</div>
            <SubscriptionExpiredBanner :team="team" />
            <TeamTrialBanner v-if="team.billing?.trial" :team="team" />
        </Teleport>
        <router-view
            :application="application"
            :instances="applicationInstances"
            :is-visiting-admin="isVisitingAdmin"
            @application-updated="updateApplication"
            @application-delete="showConfirmDeleteApplicationDialog"
            @instances-enable-polling="pollingWarning"
            @instances-disabled-polling="pollingWarning"
        />
    </main>
</template>

<script>
import { Roles } from '@core/lib/roles'
import { CogIcon, TerminalIcon, ViewListIcon } from '@heroicons/vue/solid'

import { mapState } from 'vuex'

import ConfirmApplicationDeleteDialog from './Settings/dialogs/ConfirmApplicationDeleteDialog'

import applicationApi from '@/api/application'

import NavItem from '@/components/NavItem'
import SideNavigationTeamOptions from '@/components/SideNavigationTeamOptions.vue'
import SubscriptionExpiredBanner from '@/components/banners/SubscriptionExpired.vue'
import TeamTrialBanner from '@/components/banners/TeamTrial.vue'

import ProjectsIcon from '@/components/icons/Projects'
import permissionsMixin from '@/mixins/Permissions'

import alerts from '@/services/alerts'

export default {
    name: 'ProjectPage',
    components: {
        ConfirmApplicationDeleteDialog,
        NavItem,
        SideNavigationTeamOptions,
        SubscriptionExpiredBanner,
        TeamTrialBanner
    },
    mixins: [permissionsMixin],
    data: function () {
        return {
            mounted: false,
            application: {},
            applicationInstances: [],
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
                { label: 'Node-RED Instances', path: `/project/${this.application.id}/instances`, tag: 'project-overview', icon: ProjectsIcon },
                { label: 'Node-RED Logs', path: `/project/${this.application.id}/logs`, tag: 'project-logs', icon: TerminalIcon },
                { label: 'Audit Log', path: `/project/${this.application.id}/activity`, tag: 'project-activity', icon: ViewListIcon },
                { label: 'Settings', path: `/project/${this.application.id}/settings`, tag: 'project-settings', icon: CogIcon }
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
                this.applicationInstances = await instancesPromise

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

        // TODO: Currently assumes 1:1 application to instance mapping
        async deleteApplication () {
            this.loading.deleting = true

            try {
                await applicationApi.deleteApplication(this.application.id)
                await this.$store.dispatch('account/refreshTeam')
                this.$router.push({ name: 'Home' })
                alerts.emit('Application successfully deleted.', 'confirmation')
            } catch {
                alerts.emit('Application failed to delete.', 'warning')
            }

            this.loading.deleting = false
        },

        pollingWarning () {
            console.warn('Polling yet be implemented')
        }
    }
}
</script>
