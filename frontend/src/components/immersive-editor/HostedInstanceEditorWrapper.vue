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
