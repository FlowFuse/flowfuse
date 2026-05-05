<template>
    <div class="ff--immersive-editor-wrapper" :class="{resizing: isEditorResizing}">
        <EditorDrawer
            ref="editorDrawer"
            :navigation="navigation"
            :is-expert-route="isExpertRoute"
            :entity="instance"
            @resizing="v => isEditorResizing = v"
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
        </EditorDrawer>

        <div class="ff-layout--immersive--content">
            <EditorWrapper
                :instance="instance"
                :disable-events="isEditorResizing"
                @toggle-drawer="toggleEditorImmersiveDrawer"
                @iframe-loaded="notifyDrawerState"
                @request-drawer-state="notifyDrawerState"
            />

            <DrawerTrigger
                :is-hidden="editorImmersiveDrawer.state"
                @toggle="toggleEditorImmersiveDrawer"
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
import ExpertTabIcon from '../../../components/icons/ff-minimal-grey.js'
import DrawerTrigger from '../../../components/immersive-editor/DrawerTrigger.vue'
import EditorDrawer from '../../../components/immersive-editor/EditorDrawer.vue'
import EditorWrapper from '../../../components/immersive-editor/HostedInstanceEditorWrapper.vue'
import InstanceActionsButton from '../../../components/instance/ActionButton.vue'
import usePermissions from '../../../composables/Permissions.js'
import instanceMixin from '../../../mixins/Instance.js'

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
        EditorDrawer,
        EditorWrapper,
        DrawerTrigger,
        InstanceActionsButton,
        InstanceStatusPolling
    },
    mixins: [instanceMixin],
    setup () {
        const { hasAMinimumTeamRoleOf, isVisitingAdmin } = usePermissions()

        return {
            isVisitingAdmin,
            hasAMinimumTeamRoleOf
        }
    },
    data () {
        return {
            isEditorResizing: false
        }
    },
    computed: {
        ...mapState(useAccountSettingsStore, ['featuresCheck']),
        ...mapState(useUxDrawersStore, ['editorImmersiveDrawer']),
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
                {
                    label: 'Overview',
                    to: { name: 'instance-editor-overview', params: { id: this.instance.id } },
                    tag: 'instance-overview'
                },
                {
                    label: 'Devices',
                    to: { name: 'instance-editor-devices', params: { id: this.instance.id } },
                    tag: 'instance-remote'
                },
                {
                    label: 'Version History',
                    to: versionHistoryRoute,
                    tag: 'instance-version-history'
                },
                {
                    label: 'Assets',
                    to: { name: 'instance-editor-assets', params: { id: this.instance.id } },
                    tag: 'instance-assets',
                    hidden: !this.hasAMinimumTeamRoleOf(Roles.Member)
                },
                {
                    label: 'Audit Log',
                    to: { name: 'instance-editor-audit-log', params: { id: this.instance.id } },
                    tag: 'instance-activity'
                },
                {
                    label: 'Node-RED Logs',
                    to: { name: 'instance-editor-logs', params: { id: this.instance.id } },
                    tag: 'instance-logs'
                },
                {
                    label: 'Performance',
                    to: { name: 'instance-editor-performance', params: { id: this.instance.id } },
                    tag: 'instance-performance'
                },
                {
                    label: 'Settings',
                    to: { name: 'instance-editor-settings', params: { id: this.instance.id } },
                    tag: 'instance-settings'
                }
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
        }
    },
    unmounted () {
        this.clearInstance()
    },
    methods: {
        ...mapActions(useContextStore, ['setInstance', 'clearInstance']),
        ...mapActions(useUxDrawersStore, ['toggleEditorImmersiveDrawer']),
        notifyDrawerState () {
            this.$refs.editorDrawer?.notifyDrawerState()
        }
    }
}
</script>
