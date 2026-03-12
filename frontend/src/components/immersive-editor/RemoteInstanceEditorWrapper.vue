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
import LoadingScreenWrapper from './LoadingScreenWrapper.vue'

export default {
    name: 'RemoteInstanceEditorWrapper',
    components: { LoadingScreenWrapper },
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
    mounted () {
        window.addEventListener('message', this.eventListener)
        // Dispatch a synthetic mousemove every 25 minutes to keep PostHog's idle
        // session timer alive. PostHog resets its recording after ~30 minutes of
        // inactivity on the parent page — but the user may be actively working
        // inside the cross-origin iframe where events don't reach the parent.
        this.posthogKeepAliveInterval = setInterval(() => {
            document.dispatchEvent(new MouseEvent('mousemove'))
        }, 25 * 60 * 1000)
    },
    beforeUnmount () {
        clearInterval(this.posthogKeepAliveInterval)
        // Clear the iframe src before unmount so PostHog's rrweb recorder can safely
        // detach its event listeners. Without this, rrweb throws a SecurityError when
        // calling contentWindow.removeEventListener on the cross-origin Node-RED iframe.
        if (this.$refs.iframe) {
            this.$refs.iframe.src = 'about:blank'
        }
    },
    unmounted () {
        window.removeEventListener('message', this.eventListener)
    },
    methods: {
        eventListener (event) {
            if (this.device?.editor?.url && event.origin === this.device.editor.url) {
                // Forward iframe activity to the parent page so PostHog's idle timer
                // is reset when the user is active inside the cross-origin iframe.
                document.dispatchEvent(new MouseEvent('mousemove'))
            }
        }
    }
}
</script>

<style scoped lang="scss">

</style>
