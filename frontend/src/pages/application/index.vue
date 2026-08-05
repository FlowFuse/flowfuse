<template>
    <ff-page no-padding>
        <template #header>
            <ff-page-header :title="application.name" :tabs="navigation">
                <template #breadcrumbs>
                    <ff-nav-breadcrumb v-if="team" :to="{name: 'Applications', params: {team_slug: team.slug}}">Applications</ff-nav-breadcrumb>
                </template>
            </ff-page-header>
        </template>
        <ConfirmApplicationDeleteDialog ref="confirmApplicationDeleteDialog" @confirm="deleteApplication" />
        <ConfirmInstanceDeleteDialog ref="confirmInstanceDeleteDialog" @confirm="onInstanceDeleted" />
        <div class="px-3 py-3 md:px-6 md:py-6 flex-1 flex flex-col h-full overflow-auto" data-el="application-page">
            <router-view
                :application="application"
                :instances="instancesArray"
                :is-visiting-admin="isVisitingAdmin"
                @application-updated="loadApplicationData"
                @application-delete="showConfirmDeleteApplicationDialog"
                @instance-start="instanceStart"
                @instance-restart="instanceRestart"
                @instance-suspend="instanceShowConfirmSuspend"
                @instance-delete="instanceShowConfirmDelete"
            />

            <template v-if="!statusChannelLive">
                <InstanceStatusPolling v-for="instance in instancesArray" :key="instance.id" :instance="instance" @instance-updated="instanceUpdated" />
            </template>
        </div>
    </ff-page>
</template>

<script>
import { mapActions, mapState } from 'pinia'

import applicationApi from '../../api/application.js'
import InstanceStatusPolling from '../../components/InstanceStatusPolling.vue'
import usePermissions from '../../composables/Permissions.js'

import { useActiveApplication } from '../../composables/useActiveApplication'
import instanceActionsMixin from '../../mixins/InstanceActions.js'
import alerts from '../../services/alerts.js'
import { applyLiveState } from '../../utils/applyLiveState.js'

import ConfirmInstanceDeleteDialog from '../instance/Settings/dialogs/ConfirmInstanceDeleteDialog.vue'

import ConfirmApplicationDeleteDialog from './Settings/dialogs/ConfirmApplicationDeleteDialog.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'
import { useDataFarmApplicationsStore } from '@/stores/data-farm-applications'
import { useLiveStatusStore } from '@/stores/live-status'
import { useUxLoadingStore } from '@/stores/ux-loading.js'

export default {
    name: 'ApplicationPage',
    components: {
        ConfirmApplicationDeleteDialog,
        ConfirmInstanceDeleteDialog,
        InstanceStatusPolling
    },
    mixins: [instanceActionsMixin],
    setup () {
        const { hasPermission, isVisitingAdmin } = usePermissions()
        const { application, loadActiveApplication, clearActiveApplication } = useActiveApplication()
        const applicationsStore = useDataFarmApplicationsStore()

        return {
            hasPermission,
            isVisitingAdmin,
            application,
            loadActiveApplication,
            clearActiveApplication,
            deleteApplicationEntity: applicationsStore.deleteApplication
        }
    },
    data () {
        return {
            applicationInstances: new Map()
        }
    },
    computed: {
        ...mapState(useContextStore, ['team']),
        ...mapState(useAccountSettingsStore, ['features']),
        ...mapState(useLiveStatusStore, { liveInstanceMetadata: 'instanceMetadata', statusChannelLive: 'live' }),
        ...mapState(useDataFarmApplicationsStore, ['applicationHydrated', 'activeApplicationId']),
        routeApplicationHydrated () {
            return this.applicationHydrated && this.activeApplicationId === this.$route.params.id
        },
        shouldShowPageLoader () {
            return !this.routeApplicationHydrated
        },
        instancesArray () {
            if (this.applicationInstances.size === 0) {
                return []
            }
            return Array.from(this.applicationInstances.values()).filter(el => el)
        },
        navigation () {
            const routes = [
                {
                    label: 'Hosted Instances',
                    to: { name: 'ApplicationInstances' },
                    tag: 'application-overview'
                    // icon: ProjectsIcon
                },
                {
                    label: 'Remote Instances',
                    to: { name: 'ApplicationDevices' },
                    tag: 'application-devices-overview'
                    // icon: CpuChipIcon
                },
                {
                    label: 'Dashboards',
                    to: { name: 'ApplicationDashboards' },
                    tag: 'application-dashboards'
                },
                {
                    label: 'Device Groups',
                    to: { name: 'ApplicationDeviceGroups' },
                    tag: 'application-devices-groups-overview',
                    // icon: CpuChipIcon,
                    hidden: !this.hasPermission('application:device-group:list', { application: this.application }),
                    featureUnavailable: !this.features?.deviceGroups
                },
                {
                    label: 'Snapshots',
                    to: { name: 'ApplicationSnapshots' },
                    tag: 'application-snapshots'
                    // icon: ClockIcon
                },
                {
                    label: 'Pipelines',
                    to: { name: 'ApplicationPipelines' },
                    tag: 'application-pipelines',
                    // icon: PipelinesIcon,
                    hidden: !this.hasPermission('application:pipeline:list', { application: this.application }),
                    featureUnavailable: !this.features?.['devops-pipelines']
                },
                {
                    label: 'Logs',
                    to: { name: 'application-logs' },
                    tag: 'application-logs'
                    // icon: CommandLineIcon
                },
                {
                    label: 'Audit Log',
                    to: { name: 'application-activity' },
                    tag: 'application-activity',
                    // icon: Bars4Icon,
                    hidden: !this.hasPermission('application:audit-log', { application: this.application })
                },
                {
                    label: 'Dependencies',
                    to: { name: 'application-dependencies' },
                    tag: 'application-dependencies',
                    // icon: Cog8ToothIcon,
                    hidden: !this.hasPermission('application:bom', { application: this.application })
                },
                {
                    label: 'Settings',
                    to: { name: 'application-settings' },
                    tag: 'application-settings'
                    // icon: Cog8ToothIcon
                }
            ]

            return routes
        }
    },
    watch: {
        routeApplicationHydrated: {
            handler (isHydrated) {
                if (!isHydrated && this.$route.params.id) {
                    this.loadApplicationData()
                }
            },
            immediate: true
        },
        shouldShowPageLoader: {
            handler (show) {
                this.setPageLoader(show, 'Loading Application...')
            },
            immediate: true
        },
        application (application, previous) {
            if (previous && !application && !this.loading.deleting && this.$route.params.id) {
                alerts.emit('This application has been deleted.', 'warning')
                this.$router.push({ name: 'Applications', params: { team_slug: this.team?.slug } })
            }
        },
        liveInstanceMetadata: { handler: 'applyLiveStatus', deep: true }
    },
    beforeUnmount () {
        this.clearActiveApplication()
        this.setPageLoader(false)
    },
    methods: {
        ...mapActions(useUxLoadingStore, ['setPageLoader']),
        async loadApplicationData () {
            const applicationId = this.$route.params.id
            if (!applicationId) {
                return
            }
            this.applicationInstances = new Map()
            const application = await this.loadActiveApplication(applicationId)
            if (!application) {
                return
            }
            if (this.team?.slug !== application.team?.slug) {
                return
            }
            const instances = await applicationApi.getApplicationInstances(applicationId)
            const nextInstances = new Map()
            instances.forEach(instance => nextInstances.set(instance.id, instance))
            this.applicationInstances = nextInstances
            applicationApi.getApplicationInstancesStatuses(applicationId)
                .then(statuses => {
                    statuses.forEach(status => {
                        this.applicationInstances.set(status.id, { ...this.applicationInstances.get(status.id), ...status })
                    })
                })
                .catch(err => console.error(err))
        },
        async deleteApplication () {
            this.setPageLoader(true, 'Deleting Application...')
            try {
                await this.deleteApplicationEntity(this.application.id, this.team.id)
                await useContextStore().refreshTeam()
                this.$router.push({ name: 'Applications' })
                alerts.emit('Application successfully deleted.', 'confirmation')
            } catch (err) {
                if (err.response?.data?.error) {
                    alerts.emit(`Application failed to delete: ${err.response.data.error}`, 'warning', 10000)
                } else {
                    alerts.emit('Application failed to delete', 'warning')
                }
            }
            this.setPageLoader(false)
        },
        applyLiveStatus () {
            for (const id of this.applicationInstances.keys()) {
                const meta = this.liveInstanceMetadata[id]
                if (!meta?.status) continue
                const row = this.applicationInstances.get(id)
                if (row?.status === meta.status && row?.meta?.state === meta.status) continue
                this.applicationInstances.set(id, applyLiveState(row, meta.status, { versions: meta.versions, clearFlags: true }))
            }
        }
    }
}
</script>
