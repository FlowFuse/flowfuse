<template>
    <ff-loading v-if="loading.deleting" :message="$t('ui.deletingInstance')" />
    <main v-else-if="!instance?.id">
        <ff-loading :message="$t('ui.loadingInstance')" />
    </main>
    <ff-page v-else>
        <template #header>
            <ff-page-header :title="instance.name" :tabs="navigation">
                <template #breadcrumbs>
                    <ff-nav-breadcrumb :to="{name: 'team-hosted-instances', params: {team_slug: team.slug}}">{{ $t('ui.instances') }}</ff-nav-breadcrumb>
                </template>
                <template #status>
                    <InstanceStatusBadge
                        :status="instance.meta?.state"
                        :optimisticStateChange="instance.optimisticStateChange"
                        :pendingStateChange="instance.pendingStateChange"
                        :instanceId="instance.id"
                        instanceType="instance"
                    />
                    <router-link v-if="instance.ha?.replicas !== undefined" :to="{name: 'instance-settings-ha', params: { id: instance.id }}" @click.stop>
                        <StatusBadge class="ml-2 text-gray-400 hover:text-blue-600" status="high-availability" />
                    </router-link>
                    <router-link v-if="instance.protected?.enabled" :to="{ name: 'instance-settings-protect'}" @click.stop>
                        <StatusBadge class="ml-2 text-gray-400 hover:text-blue-600" data-el="protected-pill" status="protected" :text="$t('ui.protected')" />
                    </router-link>
                    <router-link v-if="instance.settings.disableEditor" :to="{name: 'instance-settings-editor', params: { id: instance.id }}" @click.stop>
                        <StatusBadge class="ml-2 text-gray-400 cursor-pointer hover:text-blue-600" :status="$t('ui.editorDisabled')">
                            <template #icon><LockClosedIcon class="w-4 h-4" /></template>
                        </StatusBadge>
                    </router-link>
                </template>
                <template #context>
                    {{ $t('ui.application2') }}
                    <ff-team-link :to="{name: 'application', params: {id: instance.application.id}}" class="text-blue-600 cursor-pointer hover:text-blue-700 hover:underline">
                        {{ instance.application.name }}
                    </ff-team-link>
                </template>
                <template #tools>
                    <div class="space-x-2 flex align-center">
                        <DashboardLink
                            v-if="hasDashboard2"
                            :instance="instance"
                            :disabled="!editorAvailable"
                            scope="application"
                        />
                        <InstanceEditorLink
                            :editorDisabled="instance.settings.disableEditor || isHA"
                            :disabled="!editorAvailable"
                            :disabled-reason="disabledReason"
                            :instance="instance"
                            :primary="editorAvailable && !instance.settings.disableEditor"
                        />
                        <InstanceActionsButton :instance="instance" @instance-deleted="onInstanceDelete" />
                    </div>
                </template>
            </ff-page-header>
        </template>
        <ConfirmInstanceDeleteDialog ref="confirmInstanceDeleteDialog" :instance="instance" @confirm="onInstanceDelete" />
        <Teleport v-if="mounted" to="#platform-banner">
            <div v-if="isVisitingAdmin" class="ff-banner" data-el="banner-project-as-admin">{{ $t('ui.youAreViewingThisInstanceAsAnAdministrator') }}</div>
            <SubscriptionExpiredBanner :team="team" />
            <TeamTrialBanner v-if="team.billing?.trial" :team="team" />
        </Teleport>
        <div class="flex flex-col flex-1 overflow-auto">
            <router-view
                :instance="instance"
                :is-visiting-admin="isVisitingAdmin"
                @instance-updated="loadInstance"
                @instance-confirm-delete="showConfirmDeleteDialog"
                @instance-confirm-suspend="showConfirmSuspendDialog"
            />
        </div>

        <InstanceStatusPolling v-if="!statusChannelLive" :instance="instance" @instance-updated="instanceUpdated" />
    </ff-page>
</template>

<script>
import { ChevronLeftIcon } from '@heroicons/vue/20/solid'
import { LockClosedIcon } from '@heroicons/vue/24/outline'
import { mapState } from 'pinia'

import InstanceStatusPolling from '../../components/InstanceStatusPolling.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import SubscriptionExpiredBanner from '../../components/banners/SubscriptionExpired.vue'
import TeamTrialBanner from '../../components/banners/TeamTrial.vue'
import InstanceActionsButton from '../../components/instance/ActionButton.vue'
import usePermissions from '../../composables/Permissions.js'

import { t } from '../../i18n.js'
import instanceMixin from '../../mixins/Instance.js'

import ConfirmInstanceDeleteDialog from './Settings/dialogs/ConfirmInstanceDeleteDialog.vue'
import DashboardLink from './components/DashboardLink.vue'
import InstanceEditorLink from './components/EditorLink.vue'
import InstanceStatusBadge from './components/InstanceStatusBadge.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'

export default {
    name: 'InstancePage',
    components: {
        ConfirmInstanceDeleteDialog,
        InstanceActionsButton,
        DashboardLink,
        InstanceStatusPolling,
        InstanceStatusBadge,
        StatusBadge,
        SubscriptionExpiredBanner,
        TeamTrialBanner,
        InstanceEditorLink,
        LockClosedIcon
    },
    mixins: [instanceMixin],
    setup () {
        const { hasPermission, isVisitingAdmin } = usePermissions()

        return {
            hasPermission,
            isVisitingAdmin
        }
    },
    data: function () {
        return {
            mounted: false,
            icons: {
                chevronLeft: ChevronLeftIcon
            }
        }
    },
    computed: {
        ...mapState(useAccountSettingsStore, ['featuresCheck']),
        ...mapState(useContextStore, ['team']),
        navigation () {
            if (!this.instance.id) return []
            let versionHistoryRoute
            if (!this.featuresCheck.isTimelineFeatureEnabled) {
                versionHistoryRoute = {
                    name: 'instance-snapshots',
                    params: { id: this.instance.id }
                }
            } else {
                versionHistoryRoute = {
                    name: 'instance-version-history',
                    params: { id: this.instance.id }
                }
            }
            return [
                { label: t('ui.overview'), to: { name: 'instance-overview', params: { id: this.instance.id } }, tag: 'instance-overview' },
                { label: t('ui.devices'), to: { name: 'instance-devices', params: { id: this.instance.id } }, tag: 'instance-remote' },
                { label: t('ui.dashboard'), to: { name: 'instance-dashboard', params: { id: this.instance.id } }, tag: 'instance-dashboard', hidden: !this.hasDashboard2 },
                { label: t('ui.versionHistory'), to: versionHistoryRoute, tag: 'instance-version-history' },
                { label: t('ui.assets'), to: { name: 'instance-assets', params: { id: this.instance.id } }, tag: 'instance-assets', hidden: !this.hasPermission('project:files:list', { application: this.instance.application }) },
                { label: t('ui.auditLog'), to: { name: 'instance-audit-log', params: { id: this.instance.id } }, tag: 'instance-activity' },
                { label: t('ui.nodeRedLogs'), to: { name: 'instance-logs', params: { id: this.instance.id } }, tag: 'instance-logs' },
                { label: t('ui.performance'), to: { name: 'instance-performance', params: { id: this.instance.id } }, tag: 'instance-performance' },
                { label: t('ui.settings'), to: { name: 'instance-settings', params: { id: this.instance.id } }, tag: 'instance-settings' }
            ]
        },
        isLoading: function () {
            return this.loading.deleting || this.loading.suspend
        },
        editorAvailable () {
            return !this.isHA && this.instanceRunning
        },
        hasDashboard2 () {
            return !!this.instance?.settings?.dashboard2UI
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
    mounted () {
        this.mounted = true
    }
}
</script>
