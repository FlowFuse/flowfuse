<template>
    <section class="editor-wrapper">
        <LoadingScreenWrapper
            v-if="!isDeviceRunning"
            :state="computedStatus"
        />

        <iframe
            v-else
            ref="iframe"
            width="100%"
            height="100%"
            name="immersive-editor-iframe"
            :src="device.editor.url"
            referrerpolicy="strict-origin-when-cross-origin"
            allowfullscreen
            :style="{'pointer-events': disableEvents ? 'none' : 'auto'}"
            data-el="editor-iframe"
        />
    </section>
</template>

<script>
import { mapState } from 'pinia'

import LoadingScreenWrapper from './LoadingScreenWrapper.vue'

import { useThemeStore } from '@/stores/theme'
import { isInstanceOnNR5Plus } from '@/utils/instanceVersion'

export default {
    name: 'RemoteInstanceEditorWrapper',
    components: { LoadingScreenWrapper },
    inject: ['$services'],
    props: {
        device: {
            required: false,
            type: Object,
            default: null
        },
        disableEvents: {
            type: Boolean,
            default: false
        }
    },
    data () {
        return {
            posthogKeepAliveInterval: null
        }
    },
    computed: {
        ...mapState(useThemeStore, { themeMode: 'mode' }),
        isDeviceRunning () {
            return this.computedStatus === 'running'
        },
        isEditorAvailable () {
            return Object.prototype.hasOwnProperty.call(this.device, 'editor') &&
                Object.prototype.hasOwnProperty.call(this.device.editor, 'connected') &&
                this.device.editor.connected
        },
        computedStatus () {
            switch (true) {
            case !this.device:
            case !this.isEditorAvailable:
            case this.device?.status === 'stopped':
                // forces the loading animation
                return 'loading'
            default:
                return this.device.status
            }
        }
    },
    watch: {
        themeMode () {
            this.$services.postMessage.broadcastTheme()
        }
    },
    mounted () {
        window.addEventListener('message', this.eventListener)
        // Dispatch a synthetic mousemove every 25 minutes to keep PostHog's idle
        // session timer alive. PostHog resets its recording after ~30 minutes of
        // inactivity on the parent page — but the user may be actively working
        // inside the cross-origin iframe where events don't reach the parent.
        this.posthogKeepAliveInterval = setInterval(() => {
            window.dispatchEvent(new MouseEvent('mousemove'))
        }, 25 * 60 * 1000)
    },
    beforeUnmount () {
        clearInterval(this.posthogKeepAliveInterval)
        // Remove from DOM before unmount so rrweb doesn't try to access the
        // cross-origin contentWindow during teardown.
        if (this.$refs.iframe) {
            this.$services.postMessage.unregisterEditorTarget(this.$refs.iframe.contentWindow)
            this.$refs.iframe.parentNode?.removeChild(this.$refs.iframe)
        }
    },
    unmounted () {
        window.removeEventListener('message', this.eventListener)
    },
    methods: {
        eventListener (event) {
            const editorOrigin = this.device?.editor?.url
                ? new URL(this.device.editor.url, window.location.origin).origin
                : null
            if (event.origin !== editorOrigin) return
            if (event.data?.type === 'load' || event.data?.type === 'request-theme') this.registerEditorForThemeSync()
        },
        registerEditorForThemeSync () {
            if (!isInstanceOnNR5Plus(this.device)) return
            this.$services.postMessage.registerEditorTarget({
                target: this.$refs.iframe.contentWindow,
                targetOrigin: this.device.editor.url
            })
        }
    }
}
</script>

<style scoped lang="scss">

</style>
