<template>
    <ff-loading v-if="loading.deleting" message="Deleting Instance..." />
    <ff-loading v-if="loading.suspend" message="Suspending Instance..." />
    <Teleport v-if="mounted" to="#platform-sidenav">
        <SideNavigationTeamOptions>
            <template #nested-menu>
                <div class="ff-nested-title">{{ instance.name }}</div>
                <router-link v-for="route in navigation" :key="route.label" :to="route.path">
                    <nav-item :icon="route.icon" :label="route.label" :data-nav="route.tag" />
                </router-link>
            </template>
        </SideNavigationTeamOptions>
    </Teleport>
    <main v-if="!instance?.id">
        <ff-loading message="Loading Instance..." />
    </main>
    <main v-else data-el="instances-section">
        <SectionTopMenu>
            <template #hero>
                <div class="flex-grow space-x-6 items-center inline-flex">
                    <router-link
                        :to="navigation[0]?.path ?? ''"
                        class="inline-flex items-center"
                    >
                        <div class="text-gray-800 text-xl font-bold">
                            {{ instance.name }}
                        </div>
                    </router-link>
                    <InstanceStatusBadge v-if="instance.meta" :status="instance.meta.state" :pendingStateChange="instance.pendingStateChange" />
                </div>
            </template>
            <template #tools>
                <div class="space-x-2 flex">
                    <div v-if="editorAvailable">
                        <a v-if="!isVisitingAdmin" :href="instance.url" target="_blank" class="ff-btn ff-btn--secondary" data-action="open-editor">
                            Open Editor
                            <span class="ff-btn--icon ff-btn--icon-right">
                                <ExternalLinkIcon />
                            </span>
                        </a>
                        <button v-else title="Unable to open editor when visiting as an admin" class="ff-btn ff-btn--secondary" disabled>
                            Open Editor
                            <span class="ff-btn--icon ff-btn--icon-right">
                                <ExternalLinkIcon />
                            </span>
                        </button>
                    </div>
                    <DropdownMenu v-if="hasPermission('project:change-status')" buttonClass="ff-btn ff-btn--primary" alt="Open actions menu" :options="actionsDropdownOptions" data-action="open-actions">Actions</DropdownMenu>
                </div>
            </template>
        </SectionTopMenu>
        <ConfirmInstanceDeleteDialog ref="confirmInstanceDeleteDialog" @confirm="deleteInstance" />
        <Teleport v-if="mounted" to="#platform-banner">
            <div v-if="isVisitingAdmin" class="ff-banner" data-el="banner-project-as-admin">You are viewing this instance as an Administrator</div>
            <SubscriptionExpiredBanner :team="team" />
            <TeamTrialBanner v-if="team.billing?.trial" :team="team" />
        </Teleport>
        <router-view
            :instance="instance"
            :is-visiting-admin="isVisitingAdmin"
            @instance-overview-exit="onOverviewExit"
            @instance-overview-enter="onOverviewEnter"
            @instance-updated="updateInstance"
        />
    </main>
</template>

<script>
import { Roles } from '@core/lib/roles'
import { ExternalLinkIcon } from '@heroicons/vue/outline'
import { ChevronLeftIcon, ClockIcon, CogIcon, TemplateIcon, TerminalIcon, ViewListIcon } from '@heroicons/vue/solid'
import { mapState } from 'vuex'

import ConfirmInstanceDeleteDialog from './Settings/dialogs/ConfirmInstanceDeleteDialog'

import InstanceStatusBadge from './components/InstanceStatusBadge'

import InstanceApi from '@/api/instances'
import SnapshotApi from '@/api/projectSnapshots'

import DropdownMenu from '@/components/DropdownMenu'
import NavItem from '@/components/NavItem'
import SectionTopMenu from '@/components/SectionTopMenu'
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
        SectionTopMenu,
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
        actionsDropdownOptions: function () {
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
    },
    mounted () {
        this.checkAccess()
        this.mounted = true
    },
    beforeUnmount () {
        this.onOverviewExit(true)
    },
    methods: {
        async onOverviewEnter () {
            await this.updateInstance()
            this.overviewActive = true
            if (this.instance.pendingRestart && !this.instanceTransitionStates.includes(this.instance.state)) {
                this.instance.pendingRestart = false
            }
            this.checkAccess()
        },
        onOverviewExit (unmounting) {
            this.overviewActive = false
            if (unmounting) {
                // ensure timer and flags are cleared when navigating away from page
                if (this.instance?.pendingStateChange || this.instance?.pendingRestart) {
                    this.instance.pendingStateChange = false
                    this.instance.pendingRestart = false
                }
                clearTimeout(this.checkInterval)
            }
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
            if (!this.overviewActive) {
                return // dont refresh if not on overview page
            }
            if (this.instance.pendingStateChange) {
                clearTimeout(this.checkInterval)
                this.checkInterval = setTimeout(async () => {
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
                }, 1000)
            }
        },
        checkAccess () {
            this.navigation = [
                { label: 'Overview', path: `/instance/${this.instance.id}/overview`, tag: 'instance-overview', icon: TemplateIcon },
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
            this.loading.deleting = true
            InstanceApi.deleteInstance(this.instance.id).then(async () => {
                await this.$store.dispatch('account/refreshTeam')
                this.$router.push({ name: 'Home' })
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
                header: 'Suspend Project',
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
