<template>
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigationTeamOptions>
            <template #nested-menu>
                <div class="ff-nested-title">Instance</div>
                <router-link v-for="route in navigation" :key="route.label" :to="route.path">
                    <nav-item :icon="route.icon" :label="route.label" :data-nav="route.tag" />
                </router-link>
            </template>
        </SideNavigationTeamOptions>
    </Teleport>
    <ff-loading v-if="loading.deleting" message="Deleting Instance..." />
    <main v-else-if="!instance?.id">
        <ff-loading message="Loading Instance..." />
    </main>
    <main v-else data-el="instances-section" class="ff-with-status-header">
        <div class="ff-instance-header">
            <InstanceStatusHeader>
                <template #hero>
                    <div class="flex-grow items-center inline-flex flex-wrap" data-el="instance-name">
                        <div class="text-gray-800 text-xl font-bold mr-6">
                            {{ instance.name }}
                        </div>
                        <InstanceStatusBadge :status="instance.meta?.state" :optimisticStateChange="instance.optimisticStateChange" :pendingStateChange="instance.pendingStateChange" />
                        <div class="w-full text-sm mt-1">
                            Application:
                            <router-link :to="{name: 'Application', params: {id: instance.application.id}}" class="text-blue-600 cursor-pointer hover:text-blue-700 hover:underline">{{ instance.application.name }}</router-link>
                        </div>
                    </div>
                </template>
                <template #tools>
                    <div class="space-x-2 flex align-center">
                        <div v-if="editorAvailable">
                            <ff-button v-if="!isVisitingAdmin" kind="secondary" data-action="open-editor" :disabled="instance.settings.disableEditor" @click="openEditor()">
                                <template #icon-right>
                                    <ExternalLinkIcon />
                                </template>
                                {{ instance.settings.disableEditor ? 'Editor Disabled' : 'Open Editor' }}
                            </ff-button>
                            <button v-else title="Unable to open editor when visiting as an admin" class="ff-btn ff-btn--secondary" disabled>
                                Open Editor
                                <span class="ff-btn--icon ff-btn--icon-right">
                                    <ExternalLinkIcon />
                                </span>
                            </button>
                        </div>
                        <DropdownMenu v-if="hasPermission('project:change-status')" buttonClass="ff-btn ff-btn--primary" :options="actionsDropdownOptions">Actions</DropdownMenu>
                    </div>
                </template>
            </InstanceStatusHeader>
        </div>
        <ConfirmInstanceDeleteDialog ref="confirmInstanceDeleteDialog" @confirm="deleteInstance" />
        <Teleport v-if="mounted" to="#platform-banner">
            <div v-if="isVisitingAdmin" class="ff-banner" data-el="banner-project-as-admin">You are viewing this instance as an Administrator</div>
            <SubscriptionExpiredBanner :team="team" />
            <TeamTrialBanner v-if="team.billing?.trial" :team="team" />
        </Teleport>
        <div class="px-3 py-3 md:px-6 md:py-6">
            <router-view
                :instance="instance"
                :is-visiting-admin="isVisitingAdmin"
                @instance-updated="loadInstance"
                @instance-confirm-delete="showConfirmDeleteDialog"
                @instance-confirm-suspend="showConfirmSuspendDialog"
            />
        </div>

        <InstanceStatusPolling :instance="instance" @instance-updated="instanceUpdated" />
    </main>
</template>

<script>
import { ExternalLinkIcon } from '@heroicons/vue/outline'
import { ChevronLeftIcon, ChipIcon, ClockIcon, CogIcon, TemplateIcon, TerminalIcon, ViewListIcon } from '@heroicons/vue/solid'
import { mapState } from 'vuex'

import { Roles } from '../../../../forge/lib/roles.js'

import InstanceApi from '../../api/instances.js'
import SnapshotApi from '../../api/projectSnapshots.js'

import DropdownMenu from '../../components/DropdownMenu.vue'
import InstanceStatusHeader from '../../components/InstanceStatusHeader.vue'
import InstanceStatusPolling from '../../components/InstanceStatusPolling.vue'
import NavItem from '../../components/NavItem.vue'
import SideNavigationTeamOptions from '../../components/SideNavigationTeamOptions.vue'
import SubscriptionExpiredBanner from '../../components/banners/SubscriptionExpired.vue'
import TeamTrialBanner from '../../components/banners/TeamTrial.vue'

import permissionsMixin from '../../mixins/Permissions.js'

import alerts from '../../services/alerts.js'
import Dialog from '../../services/dialog.js'

import { InstanceStateMutator } from '../../utils/InstanceStateMutator.js'

import ConfirmInstanceDeleteDialog from './Settings/dialogs/ConfirmInstanceDeleteDialog.vue'
import InstanceStatusBadge from './components/InstanceStatusBadge.vue'

export default {
    name: 'InstancePage',
    components: {
        ConfirmInstanceDeleteDialog,
        DropdownMenu,
        ExternalLinkIcon,
        InstanceStatusPolling,
        NavItem,
        InstanceStatusBadge,
        InstanceStatusHeader,
        SideNavigationTeamOptions,
        SubscriptionExpiredBanner,
        TeamTrialBanner
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
            return this.teamMembership.role === Roles.Admin
        },
        isLoading: function () {
            return this.loading.deleting || this.loading.suspend
        },
        instanceRunning () {
            return this.instance?.meta?.state === 'running'
        },
        editorAvailable () {
            return this.instanceRunning
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
                { label: 'Overview', path: `/instance/${this.instance.id}/overview`, tag: 'instance-overview', icon: TemplateIcon },
                { label: 'Devices', path: `/instance/${this.instance.id}/devices`, tag: 'instance-remote', icon: ChipIcon },
                { label: 'Snapshots', path: `/instance/${this.instance.id}/snapshots`, tag: 'instance-snapshots', icon: ClockIcon },
                { label: 'Audit Log', path: `/instance/${this.instance.id}/audit-log`, tag: 'instance-activity', icon: ViewListIcon },
                { label: 'Node-RED Logs', path: `/instance/${this.instance.id}/logs`, tag: 'instance-logs', icon: TerminalIcon },
                { label: 'Settings', path: `/instance/${this.instance.id}/settings`, tag: 'instance-settings', icon: CogIcon }
            ]
        },
        async startInstance () {
            this.instanceStateMutator.setStateOptimistically('starting')

            const err = await InstanceApi.startInstance(this.instance.id)
            if (err) {
                console.warn('Instance start failed.', err)
                alerts.emit('Instance start failed.', 'warning')

                this.instanceStateMutator.restoreState()
            } else {
                this.instanceStateMutator.setStateAsPendingFromServer()
            }
        },
        async restartInstance () {
            this.instanceStateMutator.setStateOptimistically('restarting')

            const err = await InstanceApi.restartInstance(this.instance.id)
            if (err) {
                console.warn('Instance restart failed.', err)
                alerts.emit('Instance restart failed.', 'warning')

                this.instanceStateMutator.restoreState()
            } else {
                this.instanceStateMutator.setStateAsPendingFromServer()
            }
        },
        showConfirmDeleteDialog () {
            this.$refs.confirmInstanceDeleteDialog.show(this.instance)
        },
        deleteInstance () {
            const applicationId = this.instance.application.id
            this.loading.deleting = true
            InstanceApi.deleteInstance(this.instance.id).then(async () => {
                await this.$store.dispatch('account/refreshTeam')
                this.$router.push({ name: 'ApplicationInstances', params: { id: applicationId } })
                alerts.emit('Instance successfully deleted.', 'confirmation')
            }).catch(err => {
                console.warn(err)
                alerts.emit('Instance failed to delete.', 'warning')
            }).finally(() => {
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
                InstanceApi.suspendInstance(this.instance.id).then(() => {
                    this.instanceStateMutator.setStateAsPendingFromServer()
                    alerts.emit('Instance suspend request succeeded.', 'confirmation')
                }).catch(err => {
                    console.warn(err)
                    alerts.emit('Instance failed to suspend.', 'warning')
                    this.instanceStateMutator.restoreState()
                })
            })
        }
    }
}
</script>
