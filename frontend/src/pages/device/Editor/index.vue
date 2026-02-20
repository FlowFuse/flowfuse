<template>
    <div ref="resizeTarget" class="ff--immersive-editor-wrapper remote-instance" :class="{resizing: isEditorResizing}">
        <EditorWrapper
            :disable-events="isEditorResizing"
            :device="device"
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
                @mousedown="startEditorResize"
            />

            <div class="header">
                <div class="logo">
                    <router-link
                        v-if="device"
                        title="Back to remote instance overview"
                        :to="{ name: 'device-overview', params: {id: device.id} }"
                    >
                        <HomeIcon class="ff-btn--icon" style="width: 18px; height: 18px;" />
                    </router-link>
                </div>

                <ff-tabs :tabs="navigation" class="tabs" />

                <div class="side-actions">
                    <DropdownMenu
                        v-if="hasPermission('device:change-status', permissionContext) && actionsDropdownOptions.length"
                        :options="actionsDropdownOptions"
                        :button-style="{padding: '6px 9px'}"
                        data-el="device-actions-dropdown"
                        buttonClass="ff-btn ff-btn--primary device-actions-dropdown"
                    >
                        <CogIcon class="ff-btn--icon ff-btn--icon-left mr-0" />
                    </DropdownMenu>

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
                    :device="device"
                    :instance="device?.instance"
                />
            </ff-page>
        </section>
    </div>
</template>

<script>

import { CogIcon, HomeIcon, XIcon } from '@heroicons/vue/solid/index.js'
import { mapActions, mapGetters, mapState } from 'vuex'

import DropdownMenu from '../../../components/DropdownMenu.vue'
import ResizeBar from '../../../components/ResizeBar.vue'
import ExpertTabIcon from '../../../components/icons/ff-minimal-grey.js'
import DrawerTrigger from '../../../components/immersive-editor/DrawerTrigger.vue'
import EditorWrapper from '../../../components/immersive-editor/RemoteInstanceEditorWrapper.vue'
import { useDeviceHelper } from '../../../composables/DeviceHelper.js'
import { useDrawerHelper } from '../../../composables/DrawerHelper.js'
import usePermissions from '../../../composables/Permissions.js'
import { useResizingHelper } from '../../../composables/ResizingHelper.js'
import Alerts from '../../../services/alerts.js'

const DRAWER_DEFAULT_WIDTH = 550 // Default drawer width in pixels
const DRAWER_MAX_VIEWPORT_MARGIN = 200 // Space to preserve when drawer is at max width
const DRAWER_MAX_WIDTH_RATIO = 0.9 // Maximum drawer width as percentage of viewport (desktop)
const DRAWER_MIN_WIDTH = 310 // Minimum drawer width in pixels

export default {
    name: 'DeviceEditor',
    components: {
        CogIcon,
        DropdownMenu,
        XIcon,
        HomeIcon,
        DrawerTrigger,
        ResizeBar,
        EditorWrapper
    },
    setup () {
        const { hasPermission } = usePermissions()
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

        const {
            startResize: startEditorResize,
            widthStyle: editorWidthStyle,
            bindResizer: bindDrawerResizer,
            isResizing: isEditorResizing,
            setEditorWidth: setDeviceEditorWidth
        } = useResizingHelper()

        const {
            device,
            bindDevice,
            fetchDevice,
            restartDevice,
            showDeleteDialog: showDeleteDeviceDialog,
            isPolling,
            isInTransitionState: isDeviceInTransitionState,
            startPolling,
            stopPolling,
            resumePolling,
            pausePolling,
            getDeviceEditorProxy
        } = useDeviceHelper()

        return {
            device,
            drawer,
            setDeviceEditorWidth,
            editorWidthStyle,
            isEditorResizing,
            startEditorResize,
            bindDrawerResizer,
            toggleDrawer,
            notifyDrawerState,
            handleDrawerMouseEnter,
            handleDrawerMouseLeave,
            runInitialTease,
            bindDrawer,
            cleanupDrawer,
            hasPermission,
            restartDevice,
            bindDevice,
            fetchDevice,
            isPolling,
            isDeviceInTransitionState,
            startPolling,
            stopPolling,
            resumePolling,
            pausePolling,
            showDeleteDeviceDialog,
            getDeviceEditorProxy
        }
    },
    computed: {
        ...mapState('account', ['features']),
        ...mapGetters('account', ['featuresCheck']),
        isExpertRoute () {
            return this.$route.name === 'device-editor-expert'
        },
        isDevModeAvailable: function () {
            return !!this.features.deviceEditor
        },
        isEditorAvailable () {
            return this.device &&
                Object.prototype.hasOwnProperty.call(this.device, 'editor') &&
                Object.prototype.hasOwnProperty.call(this.device.editor, 'connected') &&
                this.device.editor.connected
        },
        navigation () {
            if (!this.device) return []

            return [
                {
                    label: 'Expert',
                    to: {
                        name: 'device-editor-expert',
                        params: { id: this.device.id }
                    },
                    tag: 'device-expert',
                    icon: ExpertTabIcon,
                    hidden: !this.featuresCheck.isExpertAssistantFeatureEnabled
                },
                {
                    label: 'Overview',
                    to: { name: 'device-editor-overview' },
                    tag: 'device-overview'
                },
                {
                    label: 'Version History',
                    to: {
                        name: 'device-editor-version-history',
                        params: { id: this.$route.params.id }
                    },
                    tag: 'version-history'
                },
                {
                    label: 'Audit Log',
                    to: { name: 'device-editor-audit-log' },
                    tag: 'device-audit-log'
                },
                {
                    label: 'Node-RED Logs',
                    to: { name: 'device-editor-logs' },
                    tag: 'device-logs'
                },
                {
                    label: 'Performance',
                    to: { name: 'device-editor-performance' },
                    tag: 'device-performance'
                },
                {
                    label: 'Settings',
                    to: { name: 'device-editor-settings' },
                    tag: 'device-settings'
                }
                // {
                //     label: 'Developer Mode',
                //     to: { name: 'device-editor-developer-mode' },
                //     tag: 'device-devmode',
                //     hidden: !(this.isDevModeAvailable && this.device.mode === 'developer')
                // }
            ]
        },
        permissionContext () {
            if (this.device?.ownerType === 'application' || this.device?.ownerType === 'instance') {
                return { application: this.device.application }
            }
            return {}
        },
        actionsDropdownOptions () {
            if (!this.device) return []

            const flowActionsDisabled = !(this.device.status !== 'suspended')
            const deviceStateChanging = this.device.pendingStateChange || this.device.optimisticStateChange

            const result = [
                {
                    name: 'Restart',
                    action: this.restartDevice,
                    disabled: deviceStateChanging || flowActionsDisabled,
                    hidden: !this.device.lastSeenAt
                },
                {
                    type: 'hr',
                    hidden: !this.hasPermission('device:delete', this.permissionContext)
                },
                {
                    name: 'Delete',
                    class: ['text-red-700'],
                    action: this.showConfirmDeleteDialog,
                    hidden: !this.hasPermission('device:delete', this.permissionContext)
                }
            ]

            return result.filter(res => !res.hidden)
        }

    },
    watch: {
        '$route.name': 'handlePolling',
        device: {
            deep: true,
            handler (device) {
                if (device && this.isEditorAvailable) {
                    this.setContextDevice(device)
                    this.bindDevice(device, true)
                    this.handlePolling()
                } else {
                    this.$router.push({ name: 'device-overview' })
                        .then(() => Alerts.emit('Unable to connect to the Remote Instance', 'warning'))
                        .catch(e => e)
                }
            }
        }
    },
    mounted () {
        this.loadDevice()
            .then(() => {
                this.bindDrawer({
                    containerEl: this.$el,
                    getInstance: () => this.device,
                    setEditorWidth: this.setDeviceEditorWidth,
                    defaultWidth: DRAWER_DEFAULT_WIDTH
                })
            })
            .then(() => {
                this.bindDrawerResizer({
                    component: this.$refs.resizeTarget,
                    initialWidth: DRAWER_DEFAULT_WIDTH,
                    minWidth: DRAWER_MIN_WIDTH,
                    maxViewportMarginX: DRAWER_MAX_VIEWPORT_MARGIN,
                    maxWidthRatio: DRAWER_MAX_WIDTH_RATIO
                })
            })
            .then(() => {
                this.runInitialTease()
            })
            .catch(err => err)
    },
    unmounted () {
        this.stopPolling()
    },
    methods: {
        ...mapActions('context', { setContextDevice: 'setDevice' }),
        loadDevice: async function () {
            let tries = 0
            let device = await this.fetchDevice(this.$route.params.id, false)

            // When running multiple replicas of the forge app, the affinity token may be missing if the request is routed to a
            // backend endpoint that didn't initiate the tunnel. If we receive a 502 from the device editor proxy,
            // we retry the editor API call until the correct affinity token is acquired (200/302).
            while (tries <= 5) {
                try {
                    await this.getDeviceEditorProxy(device)
                    break
                } catch (e) {
                    if (e?.response?.status === 502) {
                        tries += 1

                        // 1s interval timeout between tries
                        await new Promise(resolve => setTimeout(resolve, 1000))

                        device = await this.fetchDevice(this.$route.params.id, false)
                        continue
                    }

                    break
                }
            }

            this.device = device
            await this.$store.dispatch('account/setTeam', this.device.team.slug)
        },
        showConfirmDeleteDialog () {
            this.showDeleteDeviceDialog()
        },
        handlePolling () {
            const pollingRoutes = [
                'device-editor-overview',
                'device-editor-developer-mode'
            ]

            switch (true) {
            case typeof this.device?.status === 'undefined':
            case this.device?.status === 'stopped':
            case this.isDeviceInTransitionState:
            case pollingRoutes.includes(this.$route.name):
                this.resumePolling()
                break
            default:
                this.pausePolling()
            }
        }
    }
}
</script>

<style lang="scss">
.ff--immersive-editor-wrapper {
    &.remote-instance {
        .device-actions-dropdown {
            padding: 6px 9px;

            svg {
                margin: 0;
            }
        }
    }
}
</style>
