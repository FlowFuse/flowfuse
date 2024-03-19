<template>
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigationTeamOptions />
    </Teleport>
    <ff-loading v-if="loading.deleting" message="Deleting Instance..." />
    <main v-else-if="!instance?.id">
        <ff-loading message="Loading Instance..." />
    </main>
    <ff-page v-else>
        <template #header>
            <ff-page-header :title="instance.name" :tabs="navigation">
                <template #breadcrumbs>
                    <ff-nav-breadcrumb :to="{name: 'Instances', params: {team_slug: team.slug}}">Instances</ff-nav-breadcrumb>
                </template>
                <template #status>
                    <InstanceStatusBadge :status="instance.meta?.state" :optimisticStateChange="instance.optimisticStateChange" :pendingStateChange="instance.pendingStateChange" />
                    <router-link v-if="instance.ha?.replicas !== undefined" :to="{name: 'InstanceSettingsHA', params: { id: instance.id }}" @click.stop>
                        <StatusBadge class="ml-2 text-gray-400 hover:text-blue-600" status="high-availability" />
                    </router-link>
                    <router-link v-if="instance.protected?.enabled" :to="{ name: 'InstanceSettingsProtect'}" @click.stop>
                        <StatusBadge class="ml-2 text-gray-400 hover:text-blue-600" data-el="protected-pill" status="protected" text="Protected" />
                    </router-link>
                </template>
                <template #context>
                    Application:
                    <router-link :to="{name: 'Application', params: {id: instance.application.id}}" class="text-blue-600 cursor-pointer hover:text-blue-700 hover:underline">{{ instance.application.name }}</router-link>
                </template>
                <template #tools>
                    <div class="space-x-2 flex align-center">
                        <InstanceEditorLink
                            :url="instance.url"
                            :editorDisabled="instance.settings.disableEditor || isHA"
                            :disabled="!editorAvailable"
                            :disabled-reason="disabledReason"
                        />
                        <DropdownMenu v-if="hasPermission('project:change-status')" buttonClass="ff-btn ff-btn--primary" :options="actionsDropdownOptions">Actions</DropdownMenu>
                    </div>
                </template>
            </ff-page-header>
        </template>
        <ConfirmInstanceDeleteDialog ref="confirmInstanceDeleteDialog" @confirm="deleteInstance" />
        <Teleport v-if="mounted" to="#platform-banner">
            <div v-if="isVisitingAdmin" class="ff-banner" data-el="banner-project-as-admin">You are viewing this instance as an Administrator</div>
            <SubscriptionExpiredBanner :team="team" />
            <TeamTrialBanner v-if="team.billing?.trial" :team="team" />
        </Teleport>
        <div>
            <router-view
                :instance="instance"
                :is-visiting-admin="isVisitingAdmin"
                @instance-updated="loadInstance"
                @instance-confirm-delete="showConfirmDeleteDialog"
                @instance-confirm-suspend="showConfirmSuspendDialog"
            />
        </div>

        <InstanceStatusPolling :instance="instance" @instance-updated="instanceUpdated" />
    </ff-page>
</template>

<script>
import { ChevronLeftIcon } from '@heroicons/vue/solid'
import { mapState } from 'vuex'

import { Roles } from '../../../../forge/lib/roles.js'

import InstanceApi from '../../api/instances.js'
import SnapshotApi from '../../api/projectSnapshots.js'

import DropdownMenu from '../../components/DropdownMenu.vue'
import InstanceStatusPolling from '../../components/InstanceStatusPolling.vue'
import SideNavigationTeamOptions from '../../components/SideNavigationTeamOptions.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import SubscriptionExpiredBanner from '../../components/banners/SubscriptionExpired.vue'
import TeamTrialBanner from '../../components/banners/TeamTrial.vue'

import permissionsMixin from '../../mixins/Permissions.js'

import alerts from '../../services/alerts.js'
import Dialog from '../../services/dialog.js'

import { InstanceStateMutator } from '../../utils/InstanceStateMutator.js'

import ConfirmInstanceDeleteDialog from './Settings/dialogs/ConfirmInstanceDeleteDialog.vue'
import InstanceEditorLink from './components/EditorLink.vue'
import InstanceStatusBadge from './components/InstanceStatusBadge.vue'

export default {
    name: 'InstancePage',
    components: {
        ConfirmInstanceDeleteDialog,
        DropdownMenu,
        InstanceStatusPolling,
        InstanceStatusBadge,
        SideNavigationTeamOptions,
        StatusBadge,
        SubscriptionExpiredBanner,
        TeamTrialBanner,
        InstanceEditorLink
    },
    mixins: [permissionsMixin],
    data: function () {
        return {
            mounted: false,
            icons: {
                chevronLeft: ChevronLeftIcon
            },
            instance: {},
            navigation: [],
            checkInterval: null,
            checkWaitTime: 1000,
            loading: {
                deleting: false,
                suspend: false
            }
        }
    },
    computed: {
        ...mapState('account', ['teamMembership', 'team']),
        isVisitingAdmin: function () {
            return this.teamMembership?.role === Roles.Admin
        },
        isLoading: function () {
            return this.loading.deleting || this.loading.suspend
        },
        instanceRunning () {
            return this.instance?.meta?.state === 'running'
        },
        isHA () {
            return this.instance?.ha?.replicas !== undefined
        },
        editorAvailable () {
            return !this.isHA && this.instanceRunning
        },
        actionsDropdownOptions () {
            const flowActionsDisabled = !(this.instance.meta && this.instance.meta.state !== 'suspended')

            const instanceStateChanging = this.instance.pendingStateChange || this.instance.optimisticStateChange

            const result = [
                {
                    name: 'Start',
                    action: this.startInstance,
                    disabled: instanceStateChanging || this.instanceRunning
                },
                { name: 'Restart', action: this.restartInstance, disabled: instanceStateChanging || flowActionsDisabled },
                { name: 'Suspend', class: ['text-red-700'], action: this.showConfirmSuspendDialog, disabled: instanceStateChanging || flowActionsDisabled }
            ]

            if (this.hasPermission('project:delete')) {
                result.push(null)
                result.push({ name: 'Delete', class: ['text-red-700'], action: this.showConfirmDeleteDialog })
            }

            return result
        },
        disabledReason () {
            if (this.isHA) {
                return 'Cannot access the editor on a HA Instance'
            } else if (this.instance.settings.disableEditor) {
                return 'Access to the editor has been disabled in Settings > Editor'
            } else if (!this.instanceRunning) {
                return 'Instance is not running'
            }
            return null
        }
    },
    watch: {
        instance: 'instanceChanged'
    },
    async created () {
        await this.loadInstance()

        this.$watch(
            () => this.$route.params.id,
            async () => {
                await this.loadInstance()
            }
        )
    },
    mounted () {
        this.mounted = true
    },
    methods: {
        instanceUpdated (newData) {
            this.instanceStateMutator.clearState()
            this.instance = { ...this.instance, ...newData }
        },

        async loadInstance () {
            const instanceId = this.$route.params.id
            if (!instanceId) {
                return
            }
            try {
                const data = await InstanceApi.getInstance(instanceId)
                this.instance = { ...{ deviceSettings: {} }, ...this.instance, ...data }
                this.$store.dispatch('account/setTeam', this.instance.team.slug)
                this.instance.deviceSettings = await InstanceApi.getInstanceDeviceSettings(instanceId)
                if (this.instance.deviceSettings?.targetSnapshot) {
                    this.instance.targetSnapshot = await SnapshotApi.getSnapshot(instanceId, this.instance.deviceSettings.targetSnapshot)
                } else {
                    this.instance.targetSnapshot = null
                }
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
        instanceChanged () {
            this.instanceStateMutator = new InstanceStateMutator(this.instance)

            this.navigation = [
                { label: 'Overview', to: `/instance/${this.instance.id}/overview`, tag: 'instance-overview' },
                { label: 'Devices', to: `/instance/${this.instance.id}/devices`, tag: 'instance-remote' },
                { label: 'Snapshots', to: `/instance/${this.instance.id}/snapshots`, tag: 'instance-snapshots' },
                { label: 'Audit Log', to: `/instance/${this.instance.id}/audit-log`, tag: 'instance-activity' },
                { label: 'Node-RED Logs', to: `/instance/${this.instance.id}/logs`, tag: 'instance-logs' },
                { label: 'Settings', to: `/instance/${this.instance.id}/settings`, tag: 'instance-settings' }
            ]
        },
        async startInstance () {
            this.instanceStateMutator.setStateOptimistically('starting')

            try {
                await InstanceApi.startInstance(this.instance)
                this.instanceStateMutator.setStateAsPendingFromServer()
            } catch (err) {
                console.warn('Instance start failed.', err)
                alerts.emit('Instance start failed.', 'warning')
                this.instanceStateMutator.restoreState()
            }
        },
        async restartInstance () {
            this.instanceStateMutator.setStateOptimistically('restarting')
            try {
                await InstanceApi.restartInstance(this.instance)
                this.instanceStateMutator.setStateAsPendingFromServer()
            } catch (err) {
                console.warn('Instance restart failed.', err)
                alerts.emit('Instance restart failed.', 'warning')
                this.instanceStateMutator.restoreState()
            }
        },
        showConfirmDeleteDialog () {
            this.$refs.confirmInstanceDeleteDialog.show(this.instance)
        },
        deleteInstance () {
            const applicationId = this.instance.application.id
            this.loading.deleting = true
            InstanceApi.deleteInstance(this.instance).then(async () => {
                await this.$store.dispatch('account/refreshTeam')
                this.$router.push({ name: 'ApplicationInstances', params: { id: applicationId } })
                alerts.emit('Instance successfully deleted.', 'confirmation')
            }).catch(err => {
                console.warn(err)
                alerts.emit('Instance failed to delete.', 'warning')
                this.loading.deleting = false
            })
        },
        showConfirmSuspendDialog () {
            Dialog.show({
                header: 'Suspend Instance',
                text: 'Are you sure you want to suspend this instance?',
                confirmLabel: 'Suspend',
                kind: 'danger'
            }, () => {
                this.instanceStateMutator.setStateOptimistically('suspending')
                InstanceApi.suspendInstance(this.instance).then(() => {
                    this.instanceStateMutator.setStateAsPendingFromServer()
                    alerts.emit('Instance suspend request succeeded.', 'confirmation')
                }).catch(err => {
                    console.warn(err)
                    alerts.emit('Instance failed to suspend.', 'warning')
                    this.instanceStateMutator.restoreState()
                })
            })
        },
        openEditor () {
            window.open(this.instance.url, '_blank')
        }
    }
}
</script>
