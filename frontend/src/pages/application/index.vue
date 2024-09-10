<template>
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigationTeamOptions />
    </Teleport>

    <ff-loading v-if="loading.deleting" message="Deleting Application..." />
    <ff-loading v-else-if="loading.suspend" message="Suspending Application..." />
    <main v-else-if="!application?.id">
        <ff-loading message="Loading Application..." />
    </main>
    <main v-else class="ff-with-status-header">
        <ConfirmApplicationDeleteDialog ref="confirmApplicationDeleteDialog" @confirm="deleteApplication" />
        <ConfirmInstanceDeleteDialog ref="confirmInstanceDeleteDialog" @confirm="onInstanceDeleted" />
        <Teleport v-if="mounted" to="#platform-banner">
            <div v-if="isVisitingAdmin" class="ff-banner" data-el="banner-project-as-admin">
                You are viewing this application as an Administrator
            </div>
            <SubscriptionExpiredBanner v-if="team" :team="team" />
            <TeamTrialBanner v-if="team && team.billing?.trial" :team="team" />
        </Teleport>
        <div class="ff-instance-header">
            <ff-page-header :title="application.name" :tabs="navigation">
                <template #breadcrumbs>
                    <ff-nav-breadcrumb v-if="team" :to="{name: 'Applications', params: {team_slug: team.slug}}">Applications</ff-nav-breadcrumb>
                </template>
            </ff-page-header>
        </div>
        <div class="px-3 py-3 md:px-6 md:py-6">
            <router-view
                :application="application"
                :instances="instancesArray"
                :devices="devicesArray"
                :deviceGroups="deviceGroupsArray"
                :is-visiting-admin="isVisitingAdmin"
                @application-updated="updateApplication"
                @application-delete="showConfirmDeleteApplicationDialog"
                @instance-start="instanceStart"
                @instance-restart="instanceRestart"
                @instance-suspend="instanceShowConfirmSuspend"
                @instance-delete="instanceShowConfirmDelete"
            />

            <InstanceStatusPolling v-for="instance in instancesArray" :key="instance.id" :instance="instance" @instance-updated="instanceUpdated" />
        </div>
    </main>
</template>

<script>
import { ChipIcon, ClockIcon, CogIcon, TerminalIcon, ViewListIcon } from '@heroicons/vue/solid'

import { mapState } from 'vuex'

import InstanceStatusPolling from '../../components/InstanceStatusPolling.vue'
import SideNavigationTeamOptions from '../../components/SideNavigationTeamOptions.vue'
import SubscriptionExpiredBanner from '../../components/banners/SubscriptionExpired.vue'
import TeamTrialBanner from '../../components/banners/TeamTrial.vue'
import PipelinesIcon from '../../components/icons/Pipelines.js'
import ProjectsIcon from '../../components/icons/Projects.js'

import applicationMixin from '../../mixins/Application.js'
import instanceActionsMixin from '../../mixins/InstanceActions.js'
import permissionsMixin from '../../mixins/Permissions.js'

import ConfirmInstanceDeleteDialog from '../instance/Settings/dialogs/ConfirmInstanceDeleteDialog.vue'

import ConfirmApplicationDeleteDialog from './Settings/dialogs/ConfirmApplicationDeleteDialog.vue'

export default {
    name: 'ProjectPage',
    components: {
        ConfirmApplicationDeleteDialog,
        ConfirmInstanceDeleteDialog,
        InstanceStatusPolling,
        SideNavigationTeamOptions,
        SubscriptionExpiredBanner,
        TeamTrialBanner
    },
    mixins: [permissionsMixin, applicationMixin, instanceActionsMixin],
    data: function () {
        return {
            mounted: false
        }
    },
    computed: {
        ...mapState('account', ['features']),
        navigation () {
            const routes = [
                { label: 'Instances', to: `/application/${this.application.id}/instances`, tag: 'application-overview', icon: ProjectsIcon },
                { label: 'Devices', to: `/application/${this.application.id}/devices`, tag: 'application-devices-overview', icon: ChipIcon },
                {
                    label: 'Devices Groups',
                    to: `/application/${this.application.id}/device-groups`,
                    tag: 'application-devices-groups-overview',
                    icon: ChipIcon,
                    featureUnavailable: !this.features?.deviceGroups
                },
                { label: 'Snapshots', to: `/application/${this.application.id}/snapshots`, tag: 'application-snapshots', icon: ClockIcon },
                {
                    label: 'DevOps Pipelines',
                    to: `/application/${this.application.id}/pipelines`,
                    tag: 'application-pipelines',
                    icon: PipelinesIcon,
                    featureUnavailable: !this.features?.['devops-pipelines']
                },
                { label: 'Logs', to: `/application/${this.application.id}/logs`, tag: 'application-logs', icon: TerminalIcon },
                { label: 'Audit Log', to: `/application/${this.application.id}/activity`, tag: 'application-activity', icon: ViewListIcon },
                { label: 'Dependencies', to: `/application/${this.application.id}/dependencies`, tag: 'application-dependencies', icon: CogIcon },
                { label: 'Settings', to: `/application/${this.application.id}/settings`, tag: 'application-settings', icon: CogIcon }
            ]

            return routes
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
    }
}
</script>
