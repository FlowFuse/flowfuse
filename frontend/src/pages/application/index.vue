<template>
    <ff-loading v-if="loading.deleting" message="Deleting Application..." />
    <ff-loading v-else-if="loading.suspend" message="Suspending Application..." />
    <main v-else-if="!application?.id">
        <ff-loading message="Loading Application..." />
    </main>
    <main v-else class="ff-with-status-header">
        <ConfirmApplicationDeleteDialog ref="confirmApplicationDeleteDialog" @confirm="deleteApplication" />
        <ConfirmInstanceDeleteDialog ref="confirmInstanceDeleteDialog" @confirm="onInstanceDeleted" />
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
import PipelinesIcon from '../../components/icons/Pipelines.js'
import ProjectsIcon from '../../components/icons/Projects.js'

import applicationMixin from '../../mixins/Application.js'
import instanceActionsMixin from '../../mixins/InstanceActions.js'
import permissionsMixin from '../../mixins/Permissions.js'

import ConfirmInstanceDeleteDialog from '../instance/Settings/dialogs/ConfirmInstanceDeleteDialog.vue'

import ConfirmApplicationDeleteDialog from './Settings/dialogs/ConfirmApplicationDeleteDialog.vue'

export default {
    name: 'ApplicationPage',
    components: {
        ConfirmApplicationDeleteDialog,
        ConfirmInstanceDeleteDialog,
        InstanceStatusPolling
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
                { label: 'Instances', to: { name: 'ApplicationInstances' }, tag: 'application-overview', icon: ProjectsIcon },
                { label: 'Devices', to: { name: 'ApplicationDevices' }, tag: 'application-devices-overview', icon: ChipIcon },
                {
                    label: 'Devices Groups',
                    to: { name: 'ApplicationDeviceGroups' },
                    tag: 'application-devices-groups-overview',
                    icon: ChipIcon,
                    hidden: !this.hasPermission('application:device-group:list'),
                    featureUnavailable: !this.features?.deviceGroups
                },
                { label: 'Snapshots', to: { name: 'ApplicationSnapshots' }, tag: 'application-snapshots', icon: ClockIcon },
                {
                    label: 'DevOps Pipelines',
                    to: { name: 'ApplicationPipelines' },
                    tag: 'application-pipelines',
                    icon: PipelinesIcon,
                    hidden: !this.hasPermission('application:pipeline:list'),
                    featureUnavailable: !this.features?.['devops-pipelines']
                },
                { label: 'Logs', to: { name: 'application-logs' }, tag: 'application-logs', icon: TerminalIcon },
                {
                    label: 'Audit Log',
                    to: { name: 'application-activity' },
                    tag: 'application-activity',
                    icon: ViewListIcon,
                    hidden: !this.hasPermission('application:audit-log')
                },
                {
                    label: 'Dependencies',
                    to: { name: 'application-dependencies' },
                    tag: 'application-dependencies',
                    icon: CogIcon,
                    hidden: !this.hasPermission('application:bom')
                },
                { label: 'Settings', to: { name: 'application-settings' }, tag: 'application-settings', icon: CogIcon }
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
