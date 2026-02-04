<template>
    <div ref="resizeTarget" class="ff--immersive-editor-wrapper" :class="{resizing: isEditorResizing}">
        <EditorWrapper
            :url="device?.editor?.url"
            :device="device"
        />

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
        </section>
    </div>
</template>

<script>

import semver from 'semver'
import { mapActions } from 'vuex'

import deviceApi from '../../../api/devices.js'
import ResizeBar from '../../../components/ResizeBar.vue'
import EditorWrapper from '../../../components/immersive-editor/RemoteInstanceEditorWrapper.vue'
import { useDrawerHelper } from '../../../composables/DrawerHelper.js'
import { useResizingHelper } from '../../../composables/ResizingHelper.js'
import Alerts from '../../../services/alerts.js'

export default {
    name: 'DeviceEditor',
    components: {
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
            isResizing: isEditorResizing
        } = useResizingHelper()

        return {
            startEditorResize,
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
            openTunnelTimeout: null
        }
    },
    computed: {

    },
    watch: {
        device (device) {
            if (device && Object.prototype.hasOwnProperty.call(device, 'editor')) {
                this.setContextDevice(device)
            } else {
                Alerts.emit('Unable to connect to the Remote Instance', 'warning')

                setTimeout(() => this.$router.push({ name: 'device-overview' }), 2000)
            }
        }
    },
    mounted () {
        this.loadDevice().catch(err => err)
    },
    methods: {
        ...mapActions('context', { setContextDevice: 'setDevice' }),
        loadDevice: async function () {
            try {
                this.device = await deviceApi.getDevice(this.$route.params.id)
            } catch (err) {
                if (err.status === 403) {
                    clearTimeout(this.openTunnelTimeout)
                    return this.$router.push({ name: 'Home' })
                }
            } finally {
                this.loading = false
            }

            this.agentSupportsDeviceAccess = this.device.agentVersion && semver.gte(this.device.agentVersion, '0.8.0')
            this.agentSupportsActions = this.device.agentVersion && semver.gte(this.device.agentVersion, '2.3.0')

            // todo we first need to get the device and set the team afterwards
            await this.$store.dispatch('account/setTeam', this.device.team.slug)
        }
    }
}
</script>

<style scoped lang="scss">

</style>
