<template>
    <div ref="resizeTarget" class="ff--immersive-editor-wrapper" :class="{resizing: isEditorResizing}">
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
                        title="Back to remote instance overview"
                        :to="{ name: 'device-overview', params: {id: device.id} }"
                    >
                        <ArrowLeftIcon class="ff-btn--icon" />
                    </router-link>
                </div>
                <ff-tabs :tabs="navigation" class="tabs" />
                <div class="side-actions">
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
                    :instance="device.instance"
                />
            </ff-page>
        </section>
    </div>
</template>

<script>

import { ArrowLeftIcon, XIcon } from '@heroicons/vue/solid/index.js'
import semver from 'semver'
import { mapActions, mapGetters, mapState } from 'vuex'

import deviceApi from '../../../api/devices.js'
import ResizeBar from '../../../components/ResizeBar.vue'
import ExpertTabIcon from '../../../components/icons/ff-minimal-grey.js'
import DrawerTrigger from '../../../components/immersive-editor/DrawerTrigger.vue'
import EditorWrapper from '../../../components/immersive-editor/RemoteInstanceEditorWrapper.vue'
import { useDrawerHelper } from '../../../composables/DrawerHelper.js'
import { useResizingHelper } from '../../../composables/ResizingHelper.js'
import FfPage from '../../../layouts/Page.vue'
import Alerts from '../../../services/alerts.js'

const DRAWER_DEFAULT_WIDTH = 550 // Default drawer width in pixels
const DRAWER_MAX_VIEWPORT_MARGIN = 200 // Space to preserve when drawer is at max width
const DRAWER_MAX_WIDTH_RATIO = 0.9 // Maximum drawer width as percentage of viewport (desktop)
const DRAWER_MIN_WIDTH = 310 // Minimum drawer width in pixels

export default {
    name: 'DeviceEditor',
    components: {
        XIcon,
        ArrowLeftIcon,
        FfPage,
        DrawerTrigger,
        ResizeBar,
        EditorWrapper
    },
    setup () {
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

        return {
            startEditorResize,
            setDeviceEditorWidth,
            bindDrawerResizer,
            editorWidthStyle,
            drawer,
            isEditorResizing,
            toggleDrawer,
            notifyDrawerState,
            handleDrawerMouseEnter,
            handleDrawerMouseLeave,
            runInitialTease,
            bindDrawer,
            cleanupDrawer
        }
    },
    data () {
        return {
            agentSupportsDeviceAccess: null,
            agentSupportsActions: null,
            device: null,
            openingTunnel: false,
            ws: null
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
        }
    },
    watch: {
        device (device) {
            if (device && this.isEditorAvailable) {
                this.setContextDevice(device)
                this.pollDeviceComms()
                this.runInitialTease()
            } else {
                this.$router.push({ name: 'device-overview' })
                    .then(() => Alerts.emit('Unable to connect to the Remote Instance', 'warning'))
                    .catch(e => e)
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
            .catch(err => err)
    },
    beforeUnmount () {
        this.closeComms()
    },
    methods: {
        ...mapActions('context', { setContextDevice: 'setDevice' }),
        loadDevice: async function () {
            try {
                this.device = await deviceApi.getDevice(this.$route.params.id)
            } catch (err) {
                if (err.status === 403) {
                    return this.$router.push({ name: 'device-overview' })
                }
            }

            this.agentSupportsDeviceAccess = this.device.agentVersion && semver.gte(this.device.agentVersion, '0.8.0')
            this.agentSupportsActions = this.device.agentVersion && semver.gte(this.device.agentVersion, '2.3.0')

            // todo we first need to get the device and set the team afterwards
            await this.$store.dispatch('account/setTeam', this.device.team.slug)
        },
        pollDeviceComms () {
            if (!this.isEditorAvailable || this.ws) return

            const uri = `/api/v1/devices/${this.device.id}/editor/proxy/comms`

            this.ws = new WebSocket(uri)

            this.ws.addEventListener('error', this.handleCommsDisconnect)
            this.ws.addEventListener('close', this.handleCommsDisconnect)
        },
        handleCommsDisconnect () {
            this.$router.push({ name: 'device-overview' })
                .then(() => Alerts.emit('Disconnected from remote instance.', 'warning'))
                .catch(e => e)
        },
        closeComms () {
            if (this.ws) {
                this.ws.removeEventListener('error', this.handleCommsDisconnect)
                this.ws.removeEventListener('close', this.handleCommsDisconnect)
                this.ws.close()
                this.ws = null
            }
        }
    }
}
</script>
