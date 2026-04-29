<template>
    <div
        class="ff--immersive-editor-wrapper"
        :class="[`editor-side-${editorSide}`, {resizing: isEditorResizing}]"
    >
        <Drawer @resizing="v => isEditorResizing = v">
            <EditorPanel
                :navigation="navigation"
                :is-expert-route="isExpertRoute"
                :entity="instance"
            >
                <template #actions>
                    <DashboardLink
                        v-if="instance.settings?.dashboard2UI" :instance="instance"
                        :disabled="!editorAvailable"
                    />
                    <InstanceActionsButton :instance="instance" @instance-deleted="onInstanceDelete" />
                </template>
                <router-view
                    :instance="instance"
                    :is-visiting-admin="isVisitingAdmin"
                    @instance-updated="loadInstance"
                    @instance-confirm-delete="showConfirmDeleteDialog"
                    @instance-confirm-suspend="showConfirmSuspendDialog"
                />
            </EditorPanel>
        </Drawer>

        <div class="ff--immersive-editor-content">
            <EditorWrapper
                :instance="instance"
                :disable-events="isEditorResizing"
                @toggle-drawer="toggleDrawer"
                @iframe-loaded="notifyDrawerState"
                @request-drawer-state="notifyDrawerState"
            />

            <DrawerTrigger
                :is-hidden="drawer.state"
                @toggle="toggleDrawer"
            />
        </div>

        <ConfirmInstanceDeleteDialog ref="confirmInstanceDeleteDialog" :instance="instance" @confirm="onInstanceDelete" />

        <InstanceStatusPolling
            :instance="instance"
            @instance-updated="instanceUpdated"
        />
    </div>
</template>

<script>
import { mapActions, mapState } from 'pinia'

import InstanceStatusPolling from '../../../components/InstanceStatusPolling.vue'
import Drawer from '../../../components/drawers/Drawer.vue'
import ExpertTabIcon from '../../../components/icons/ff-minimal-grey.js'
import DrawerTrigger from '../../../components/immersive-editor/DrawerTrigger.vue'
import EditorPanel from '../../../components/immersive-editor/EditorPanel.vue'
import EditorWrapper from '../../../components/immersive-editor/HostedInstanceEditorWrapper.vue'
import InstanceActionsButton from '../../../components/instance/ActionButton.vue'
import usePermissions from '../../../composables/Permissions.js'
import instanceMixin from '../../../mixins/Instance.js'
import { getServiceFactory } from '../../../services/service.factory.js'

import { Roles } from '../../../utils/roles.js'
import ConfirmInstanceDeleteDialog from '../Settings/dialogs/ConfirmInstanceDeleteDialog.vue'
import DashboardLink from '../components/DashboardLink.vue'

import { useAccountSettingsStore } from '@/stores/account-settings.js'
import { useContextStore } from '@/stores/context.js'
import { useUxDrawersStore } from '@/stores/ux-drawers.js'

export default {
    name: 'InstanceEditor',
    components: {
        ConfirmInstanceDeleteDialog,
        DashboardLink,
        Drawer,
        DrawerTrigger,
        EditorPanel,
        EditorWrapper,
        InstanceActionsButton,
        InstanceStatusPolling
    },
    mixins: [instanceMixin],
    setup () {
        const { hasAMinimumTeamRoleOf, isVisitingAdmin } = usePermissions()
        return { isVisitingAdmin, hasAMinimumTeamRoleOf }
    },
    data () {
        return {
            isEditorResizing: false
        }
    },
    computed: {
        ...mapState(useAccountSettingsStore, ['featuresCheck']),
        ...mapState(useUxDrawersStore, ['drawer']),
        editorSide () { return this.drawer.expertState.editorSide },
        navigation () {
            if (!this.instance.id) return []
            let versionHistoryRoute
            if (!this.featuresCheck.isTimelineFeatureEnabled) {
                versionHistoryRoute = {
                    name: 'instance-editor-snapshots',
                    params: { id: this.instance.id }
                }
            } else {
                versionHistoryRoute = {
                    name: 'instance-editor-version-history',
                    params: { id: this.instance.id }
                }
            }
            return [
                {
                    label: 'Expert',
                    to: { name: 'instance-editor-expert', params: { id: this.instance.id } },
                    tag: 'instance-expert',
                    icon: ExpertTabIcon,
                    hidden: !this.featuresCheck.isExpertAssistantFeatureEnabled
                },
                { label: 'Overview', to: { name: 'instance-editor-overview', params: { id: this.instance.id } }, tag: 'instance-overview' },
                { label: 'Devices', to: { name: 'instance-editor-devices', params: { id: this.instance.id } }, tag: 'instance-remote' },
                { label: 'Version History', to: versionHistoryRoute, tag: 'instance-version-history' },
                { label: 'Assets', to: { name: 'instance-editor-assets', params: { id: this.instance.id } }, tag: 'instance-assets', hidden: !this.hasAMinimumTeamRoleOf(Roles.Member) },
                { label: 'Audit Log', to: { name: 'instance-editor-audit-log', params: { id: this.instance.id } }, tag: 'instance-activity' },
                { label: 'Node-RED Logs', to: { name: 'instance-editor-logs', params: { id: this.instance.id } }, tag: 'instance-logs' },
                { label: 'Settings', to: { name: 'instance-editor-settings', params: { id: this.instance.id } }, tag: 'instance-settings' }
            ]
        },
        editorAvailable () {
            return !this.isHA && this.instanceRunning
        },
        isExpertRoute () {
            return this.$route.name === 'instance-editor-expert'
        }
    },
    watch: {
        instance (instance) {
            this.setInstance(instance)
        },
        'drawer.state' () {
            this.$nextTick(() => this.notifyDrawerState())
        }
    },
    created () {
        // Wipe any leftover stack content (e.g. ExpertDrawer pinned from a
        // non-editor page) so the editor's slot content renders immediately
        // without a transient overlay flash. Set the drawer to the user's
        // persisted editor side preference.
        this.resetDrawerStack()
        this.setDrawerSide(this.editorSide)
    },
    mounted () {
        // Respect the user's persisted open/closed preference.
        if (this.drawer.expertState.open) {
            this.openDrawer()
        }
    },
    unmounted () {
        // Reset the drawer for non-editor pages: clear the stack and snap back
        // to the right side (snapshots/notifications/expert always opened on
        // the right historically).
        this.clearDrawer()
        this.setDrawerSide('right')
        this.clearInstance()
    },
    methods: {
        ...mapActions(useContextStore, ['setInstance', 'clearInstance']),
        ...mapActions(useUxDrawersStore, ['openDrawer', 'closeDrawer', 'toggleDrawer', 'clearDrawer', 'resetDrawerStack', 'setDrawerSide']),
        notifyDrawerState () {
            if (!this.instance) return
            const iframe = window.frames['immersive-editor-iframe']
            if (!iframe) return
            const targetOrigin = this.instance.url || window.location.origin
            const serviceFactory = getServiceFactory()
            serviceFactory.$serviceInstances.messaging.sendMessage({
                message: {
                    type: 'drawer-state',
                    payload: { open: this.drawer.state }
                },
                target: iframe,
                targetOrigin
            })
        }
    }
}
</script>
