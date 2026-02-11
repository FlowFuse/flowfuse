<template>
    <div ref="resizeTarget" class="ff--immersive-editor-wrapper" :class="{resizing: isEditorResizing}">
        <EditorWrapper
            :instance="instance"
            :disable-events="isEditorResizing"
            @toggle-drawer="toggleDrawer"
            @iframe-loaded="notifyDrawerState"
            @request-drawer-state="notifyDrawerState"
        />

        <DrawerTrigger :is-hidden="drawer.open" @toggle="toggleDrawer" />

        <section
            class="tabs-wrapper drawer"
            :class="{'open': drawer.open, resizing: isEditorResizing}"
            :style="{ width: editorWidthStyle }"
            data-el="tabs-drawer"
            @mouseenter="handleDrawerMouseEnter"
            @mouseleave="handleDrawerMouseLeave"
        >
            <resize-bar
                :is-resizing="isEditorResizing"
                @mousedown="startEditorResize"
            />

            <div class="header">
                <div class="logo">
                    <router-link title="Back to instance overview" :to="{ name: 'instance-overview', params: {id: instance.id} }">
                        <HomeIcon class="ff-btn--icon" style="width: 18px; height: 18px;" />
                    </router-link>
                </div>
                <ff-tabs :tabs="navigation" class="tabs" />
                <div class="side-actions">
                    <DashboardLink
                        v-if="instance.settings?.dashboard2UI" :instance="instance"
                        :disabled="!editorAvailable"
                    />
                    <InstanceActionsButton :instance="instance" @instance-deleted="onInstanceDelete" />
                    <button
                        title="Close drawer"
                        type="button"
                        class="close-drawer-button"
                        aria-label="Close drawer"
                        @click="toggleDrawer"
                    >
                        <XIcon class="ff-btn--icon" />
                    </button>
                </div>
            </div>

            <ff-page :no-padding="isExpertRoute">
                <router-view
                    :instance="instance"
                    :is-visiting-admin="isVisitingAdmin"
                    @instance-updated="loadInstance"
                    @instance-confirm-delete="showConfirmDeleteDialog"
                    @instance-confirm-suspend="showConfirmSuspendDialog"
                />
            </ff-page>
        </section>

        <ConfirmInstanceDeleteDialog ref="confirmInstanceDeleteDialog" :instance="instance" @confirm="onInstanceDelete" />

        <InstanceStatusPolling
            :instance="instance"
            @instance-updated="instanceUpdated"
        />
    </div>
</template>

<script>
import { HomeIcon, XIcon } from '@heroicons/vue/solid'
import { mapActions, mapGetters } from 'vuex'

import InstanceStatusPolling from '../../../components/InstanceStatusPolling.vue'
import ResizeBar from '../../../components/ResizeBar.vue'
import ExpertTabIcon from '../../../components/icons/ff-minimal-grey.js'
import DrawerTrigger from '../../../components/immersive-editor/DrawerTrigger.vue'
import EditorWrapper from '../../../components/immersive-editor/HostedInstanceEditorWrapper.vue'
import InstanceActionsButton from '../../../components/instance/ActionButton.vue'
import { useDrawerHelper } from '../../../composables/DrawerHelper.js'
import usePermissions from '../../../composables/Permissions.js'
import { useResizingHelper } from '../../../composables/ResizingHelper.js'

import FfPage from '../../../layouts/Page.vue'
import featuresMixin from '../../../mixins/Features.js'
import instanceMixin from '../../../mixins/Instance.js'
import { Roles } from '../../../utils/roles.js'
import ConfirmInstanceDeleteDialog from '../Settings/dialogs/ConfirmInstanceDeleteDialog.vue'
import DashboardLink from '../components/DashboardLink.vue'

// Drawer size constraints
const DRAWER_MIN_WIDTH = 310 // Minimum drawer width in pixels
const DRAWER_DEFAULT_WIDTH = 550 // Default drawer width in pixels
const DRAWER_MAX_VIEWPORT_MARGIN = 200 // Space to preserve when drawer is at max width
const DRAWER_MAX_WIDTH_RATIO = 0.9 // Maximum drawer width as percentage of viewport (desktop)

export default {
    name: 'InstanceEditor',
    components: {
        HomeIcon,
        ConfirmInstanceDeleteDialog,
        InstanceActionsButton,
        DashboardLink,
        EditorWrapper,
        DrawerTrigger,
        InstanceStatusPolling,
        XIcon,
        FfPage,
        ResizeBar
    },
    mixins: [instanceMixin, featuresMixin],
    setup () {
        const { hasAMinimumTeamRoleOf, isVisitingAdmin } = usePermissions()
        const {
            startResize: startEditorResize,
            widthStyle: editorWidthStyle,
            bindResizer: bindEditorResizer,
            isResizing: isEditorResizing,
            setWidth: setEditorWidth
        } = useResizingHelper()

        const {
            drawer,
            toggleDrawer,
            notifyDrawerState,
            handleDrawerMouseEnter,
            handleDrawerMouseLeave,
            runInitialTease,
            bindDrawer,
            cleanup: cleanupDrawer
        } = useDrawerHelper()

        return {
            drawer,
            isVisitingAdmin,
            isEditorResizing,
            editorWidthStyle,
            hasAMinimumTeamRoleOf,
            startEditorResize,
            bindEditorResizer,
            setEditorWidth,
            toggleDrawer,
            notifyDrawerState,
            handleDrawerMouseEnter,
            handleDrawerMouseLeave,
            runInitialTease,
            bindDrawer,
            cleanupDrawer
        }
    },
    computed: {
        ...mapGetters('account', ['featuresCheck']),
        navigation () {
            if (!this.instance.id) return []
            let versionHistoryRoute
            if (!this.isTimelineFeatureEnabled) {
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
    mounted () {
        this.bindEditorResizer({
            component: this.$refs.resizeTarget,
            initialWidth: DRAWER_DEFAULT_WIDTH,
            minWidth: DRAWER_MIN_WIDTH,
            maxViewportMarginX: DRAWER_MAX_VIEWPORT_MARGIN,
            maxWidthRatio: DRAWER_MAX_WIDTH_RATIO
        })

        this.bindDrawer({
            containerEl: this.$el,
            getInstance: () => this.instance,
            setEditorWidth: this.setEditorWidth,
            defaultWidth: DRAWER_DEFAULT_WIDTH
        })

        this.runInitialTease()
    },
    unmounted () {
        this.cleanupDrawer()
        this.clearInstance()
    },
    methods: {
        ...mapActions('context', ['setInstance', 'clearInstance'])
    }
}
</script>
