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
    <ff-loading v-else-if="loading.suspend" message="Suspending Instance..." />
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
                        <InstanceStatusBadge v-if="instance.meta" :status="instance.meta.state" :pendingStateChange="instance.pendingStateChange" />
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
                @instance-updated="updateInstance"
                @instance-confirm-delete="showConfirmDeleteDialog"
            />
        </div>
    </main>
</template>

<script>
import { Roles } from '@core/lib/roles'
import { ExternalLinkIcon } from '@heroicons/vue/outline'
import { ChevronLeftIcon, ChipIcon, ClockIcon, CogIcon, TemplateIcon, TerminalIcon, ViewListIcon } from '@heroicons/vue/solid'
import { mapState } from 'vuex'

import ConfirmInstanceDeleteDialog from './Settings/dialogs/ConfirmInstanceDeleteDialog'

import InstanceStatusBadge from './components/InstanceStatusBadge'

import InstanceApi from '@/api/instances'
import SnapshotApi from '@/api/projectSnapshots'

import DropdownMenu from '@/components/DropdownMenu'
import InstanceStatusHeader from '@/components/InstanceStatusHeader'
import NavItem from '@/components/NavItem'
import SideNavigationTeamOptions from '@/components/SideNavigationTeamOptions.vue'
import SubscriptionExpiredBanner from '@/components/banners/SubscriptionExpired.vue'
import TeamTrialBanner from '@/components/banners/TeamTrial.vue'

import permissionsMixin from '@/mixins/Permissions'

import alerts from '@/services/alerts'
import Dialog from '@/services/dialog'

const instanceTransitionStates = [
    'loading',
    'installing',
    'starting',
    'stopping',
    'restarting',
    'suspending',
    'importing'
]

export default {
    name: 'InstancePage',
    components: {
        ConfirmInstanceDeleteDialog,
        DropdownMenu,
        ExternalLinkIcon,
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

            const result = [
                {
                    name: 'Start',
                    action: this.startInstance,
                    disabled: this.instance.pendingStateChange || this.instanceRunning
                },
                { name: 'Restart', action: this.restartInstance, disabled: flowActionsDisabled },
                { name: 'Suspend', class: ['text-red-700'], action: this.showConfirmSuspendDialog, disabled: flowActionsDisabled }
            ]

            if (this.hasPermission('project:delete')) {
                result.push(null)
                result.push({ name: 'Delete', class: ['text-red-700'], action: this.showConfirmDeleteDialog })
            }

            return result
        }
    },
    watch: {
        instance: 'checkAccess',
        teamMembership: 'checkAccess',
        'instance.pendingStateChange': 'refreshInstance'
    },
    async created () {
        await this.updateInstance()

        this.$watch(
            () => this.$route.params.id,
            async () => {
                await this.updateInstance()
            }
        )
    },
    mounted () {
        this.mounted = true

        this.startPolling()
    },
    beforeUnmount () {
        this.stopPolling()
    },
    methods: {
        startPolling () {
            this.checkWaitTime = 1000
            if (this.instance.pendingRestart && !this.instanceTransitionStates.includes(this.instance.state)) {
                this.instance.pendingRestart = false
            }
            this.checkAccess()
        },
        stopPolling () {
            // ensure timer and flags are cleared when navigating away from page
            if (this.instance?.pendingStateChange || this.instance?.pendingRestart) {
                this.instance.pendingStateChange = false
                this.instance.pendingRestart = false
            }
            clearTimeout(this.checkInterval)
        },
        async updateInstance () {
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
        async refreshInstance () {
            if (this.instance.pendingStateChange) {
                clearTimeout(this.checkInterval)
                this.checkInterval = setTimeout(async () => {
                    this.checkWaitTime *= 1.1

                    if (this.instance.id) {
                        const data = await InstanceApi.getInstance(this.instance.id)
                        const wasPendingRestart = this.instance.pendingRestart
                        const wasPendingStateChange = this.instance.pendingStateChange
                        const wasPendingStatePrevious = this.instance.pendingStatePrevious
                        this.instance = data
                        if (wasPendingRestart && this.instance.meta.state !== 'running') {
                            this.instance.pendingRestart = true
                        }
                        this.instance.pendingStatePrevious = wasPendingStatePrevious
                        this.instance.pendingStateChange = wasPendingStateChange
                    }
                }, this.checkWaitTime)
            }
        },
        checkAccess () {
            this.navigation = [
                { label: 'Overview', path: `/instance/${this.instance.id}/overview`, tag: 'instance-overview', icon: TemplateIcon },
                { label: 'Devices', path: `/instance/${this.instance.id}/devices`, tag: 'instance-remote', icon: ChipIcon },
                { label: 'Snapshots', path: `/instance/${this.instance.id}/snapshots`, tag: 'instance-snapshots', icon: ClockIcon },
                { label: 'Audit Log', path: `/instance/${this.instance.id}/audit-log`, tag: 'instance-activity', icon: ViewListIcon },
                { label: 'Node-RED Logs', path: `/instance/${this.instance.id}/logs`, tag: 'instance-logs', icon: TerminalIcon },
                { label: 'Settings', path: `/instance/${this.instance.id}/settings`, tag: 'instance-settings', icon: CogIcon }
            ]
            if (this.mounted && this.instance.meta) {
                let doRefresh = false
                if (this.instance.pendingStatePrevious && this.instance.pendingStatePrevious !== this.instance.meta.state) {
                    // state has changed (i.e. something did occur) so reset pendingRestart
                    // and rely on instanceTransitionStates to continue polling
                    this.instance.pendingRestart = false
                    doRefresh = true // refresh once more to get the new state
                }
                if (instanceTransitionStates.includes(this.instance.meta.state)) {
                    doRefresh = true // refresh
                }
                this.instance.pendingStatePrevious = this.instance.meta.state
                if (this.instance.pendingRestart || doRefresh) {
                    this.instance.pendingStateChange = true
                    this.refreshInstance()
                } else {
                    this.instance.pendingStateChange = false
                }
            }
        },
        async startInstance () {
            const prevState = this.instance.meta.state
            const res = await InstanceApi.startInstance(this.instance.id)
            // check for successful start command before polling state
            if (res) {
                console.warn('Instance start failed.', res)
                alerts.emit('Instance start failed.', 'warning')
            } else {
                this.instance.pendingStatePrevious = prevState
                this.instance.pendingStateChange = true
            }
        },
        async restartInstance () {
            const prevState = this.instance.meta.state
            const res = await InstanceApi.restartInstance(this.instance.id)
            // check for successful restart command before polling state
            if (res) {
                console.warn('Instance restart failed.', res)
                alerts.emit('Instance restart failed.', 'warning')
            } else {
                this.instance.pendingStatePrevious = prevState
                this.instance.pendingRestart = true
                this.instance.pendingStateChange = true
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
                this.$router.push({ name: 'Application', params: { id: applicationId } })
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
                this.loading.suspend = true
                InstanceApi.suspendInstance(this.instance.id).then(() => {
                    this.$router.push({ name: 'Home' })
                    alerts.emit('Instance successfully suspended.', 'confirmation')
                }).catch(err => {
                    console.warn(err)
                    alerts.emit('Instance failed to suspend.', 'warning')
                }).finally(() => {
                    this.loading.suspend = false
                })
            })
        }
    }
}
</script>
