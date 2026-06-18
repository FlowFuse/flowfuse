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
        },
        editorOrigin () {
            if (!this.device?.editor?.url) {
                return null
            }
            try {
                return new URL(this.device.editor.url, window.location.origin).origin
            } catch (e) {
                return null
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
            window.dispatchEvent(new MouseEvent('mousemove'))
        }, 25 * 60 * 1000)
    },
    beforeUnmount () {
        window.removeEventListener('message', this.eventListener)
        clearInterval(this.posthogKeepAliveInterval)
        // Remove from DOM before unmount so rrweb doesn't try to access the
        // cross-origin contentWindow during teardown.
        if (this.$refs.iframe) {
            this.$refs.iframe.parentNode?.removeChild(this.$refs.iframe)
        }
    },
    methods: {
        eventListener (event) {
            if (!this.editorOrigin || event.origin !== this.editorOrigin) {
                return
            }
            switch (event.data?.type) {
            case 'load':
                this.emitMessage('prevent-redirect', true)
                break
            case 'navigate':
                window.location.href = event.data.payload
                break
            case 'logout':
                this.$router.push({ name: 'device-overview', params: { id: this.device.id } })
                break
            default:
            }
        },
        emitMessage (type, payload = {}) {
            if (this.$refs.iframe?.contentWindow && this.editorOrigin) {
                this.$services.postMessage.sendMessage({
                    message: { type, payload },
                    target: this.$refs.iframe.contentWindow,
                    targetOrigin: this.editorOrigin
                })
            }
        }
    }
}
</script>

<style scoped lang="scss">

</style>
