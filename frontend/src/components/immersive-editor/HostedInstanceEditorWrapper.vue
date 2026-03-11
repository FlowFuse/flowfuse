<template>
    <section class="editor-wrapper">
        <LoadingScreenWrapper
            v-if="shouldDisplayLoadingScreen"
            :state="instance.meta?.state"
            :optimisticStateChange="instance.optimisticStateChange"
            :pendingStateChange="instance.pendingStateChange"
        />

        <iframe
            v-else
            ref="iframe"
            width="100%"
            height="100%"
            name="immersive-editor-iframe"
            :src="instance.url"
            referrerpolicy="strict-origin-when-cross-origin"
            allowfullscreen
            :style="{'pointer-events': disableEvents ? 'none' : 'auto'}"
            data-el="editor-iframe"
        />
    </section>
</template>

<script>
import { mapActions } from 'vuex'

import LoadingScreenWrapper from './LoadingScreenWrapper.vue'
const States = {
    STOPPED: 'stopped',
    LOADING: 'loading',
    INSTALLING: 'installing',
    STARTING: 'starting',
    RUNNING: 'running',
    SAFE: 'safe',
    CRASHED: 'crashed',
    STOPPING: 'stopping'
}
export default {
    name: 'HostedInstanceEditorWrapper',
    components: { LoadingScreenWrapper },
    inject: ['$services'],
    props: {
        instance: {
            type: Object,
            required: true
        },
        disableEvents: {
            type: Boolean,
            default: false
        }
    },
    emits: ['iframe-loaded', 'toggle-drawer', 'request-drawer-state'],
    data () {
        return {
            posthogKeepAliveInterval: null
        }
    },
    computed: {
        isInstanceTransitioningStates () {
            const pendingState = (Object.hasOwnProperty.call(this.instance, 'pendingStateChange') && this.instance.pendingStateChange)
            const optimisticStateChange = (Object.hasOwnProperty.call(this.instance, 'optimisticStateChange') && this.instance.optimisticStateChange)

            return pendingState || optimisticStateChange
        },
        shouldDisplayLoadingScreen () {
            const unsafeStates = [
                ...Object.values(States).filter(state => ![States.RUNNING, States.SAFE].includes(state)),
                ...['suspending', 'suspended']
            ]

            return this.isInstanceTransitioningStates || unsafeStates.includes(this.instance.meta?.state)
        }
    },
    mounted () {
        // adding event listener to listen for messages from the iframe
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
        this.resetAssistant()
    },
    methods: {
        ...mapActions('product/assistant', {
            resetAssistant: 'reset'
        }),
        // todo this event listener should be moved in the messaging.service.js
        eventListener (event) {
            if (event.origin === this.instance.url) {
                // Forward iframe activity to the parent page so PostHog's idle timer
                // is reset when the user is active inside the cross-origin iframe.
                document.dispatchEvent(new MouseEvent('mousemove'))
                switch (event.data.type) {
                case 'load':
                    this.emitMessage('prevent-redirect', true)
                    this.$emit('iframe-loaded')
                    break
                case 'navigate':
                    window.location.href = event.data.payload
                    break
                case 'logout':
                    this.$router.push({ name: 'instance-overview', params: { id: this.instance.id } })
                    break
                case 'toggle-drawer':
                    this.$emit('toggle-drawer')
                    break
                case 'request-drawer-state':
                    this.$emit('request-drawer-state')
                    break
                default:
                }
            }
        },
        emitMessage (type, payload = {}) {
            this.$services.messaging.sendMessage({
                message: {
                    type,
                    payload
                },
                target: this.$refs.iframe.contentWindow,
                targetOrigin: this.instance.url
            })
        }
    }
}
</script>
