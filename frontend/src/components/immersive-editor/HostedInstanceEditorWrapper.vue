<template>
    <section class="editor-wrapper">
        <LoadingScreenWrapper
            v-if="shouldDisplayLoadingScreen"
            :state="loadingScreen.state"
            :label="loadingScreen.label"
            :optimisticStateChange="instance.optimisticStateChange"
            :pendingStateChange="instance.pendingStateChange"
            :data-el="loadingScreen.dataEl"
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
import { mapActions, mapState } from 'pinia'

import LoadingScreenWrapper from './LoadingScreenWrapper.vue'

import { useProductAssistantStore } from '@/stores/product-assistant.js'
import { useThemeStore } from '@/stores/theme'
import { isInstanceOnNR5Plus } from '@/utils/instanceVersion'

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
            posthogKeepAliveInterval: null,
            awaitingEditorRestart: false
        }
    },
    computed: {
        ...mapState(useThemeStore, { themeMode: 'mode' }),
        isInstanceTransitioningStates () {
            const pendingState = (Object.hasOwnProperty.call(this.instance, 'pendingStateChange') && this.instance.pendingStateChange)
            const optimisticStateChange = (Object.hasOwnProperty.call(this.instance, 'optimisticStateChange') && this.instance.optimisticStateChange)

            return pendingState || optimisticStateChange
        },
        isInstanceLoading () {
            const unsafeStates = [
                ...Object.values(States).filter(state => ![States.RUNNING, States.SAFE].includes(state)),
                ...['suspending', 'suspended']
            ]

            return this.isInstanceTransitioningStates || unsafeStates.includes(this.instance.meta?.state)
        },
        isEditorDisabled () {
            return !!this.instance.settings?.disableEditor
        },
        shouldDisplayLoadingScreen () {
            return this.isInstanceLoading || this.isEditorDisabled || this.awaitingEditorRestart
        },
        loadingScreen () {
            if (this.isInstanceLoading) {
                return { state: this.instance.meta?.state, label: null, dataEl: null }
            }
            if (this.isEditorDisabled) {
                return { state: 'editor-disabled', label: 'Editor Disabled', dataEl: 'editor-disabled-empty-state' }
            }
            if (this.awaitingEditorRestart) {
                return { state: 'restart-required', label: 'Restart Required', dataEl: 'editor-restart-required-empty-state' }
            }
            return { state: this.instance.meta?.state, label: null, dataEl: null }
        }
    },
    watch: {
        isEditorDisabled (newVal, oldVal) {
            // Running Node-RED keeps the old (disabled) config until restart,
            // so suppress the iframe to avoid leaking "Cannot GET /".
            if (oldVal === true && newVal === false) {
                this.awaitingEditorRestart = true
            } else if (newVal === true) {
                this.awaitingEditorRestart = false
            }
        },
        isInstanceLoading (isLoading) {
            if (this.awaitingEditorRestart && isLoading) {
                this.awaitingEditorRestart = false
            }
        }
    },
    watch: {
        themeMode () {
            this.$services.postMessage.broadcastTheme()
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
        this.resetAssistant()
    },
    methods: {
        ...mapActions(useProductAssistantStore, {
            resetAssistant: 'reset'
        }),
        // todo this event listener should be moved in the messaging.service.js
        eventListener (event) {
            if (event.origin === this.instance.url) {
                // Forward iframe activity to the parent page so PostHog's idle timer
                // is reset when the user is active inside the cross-origin iframe.
                window.dispatchEvent(new MouseEvent('mousemove'))
                switch (event.data.type) {
                case 'load':
                    this.emitMessage('prevent-redirect', true)
                    this.$emit('iframe-loaded')
                    this.registerEditorForThemeSync()
                    break
                case 'request-theme':
                    this.registerEditorForThemeSync()
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
            this.$services.postMessage.sendMessage({
                message: {
                    type,
                    payload
                },
                target: this.$refs.iframe.contentWindow,
                targetOrigin: this.instance.url
            })
        },
        registerEditorForThemeSync () {
            if (!isInstanceOnNR5Plus(this.instance)) return
            this.$services.postMessage.registerEditorTarget({
                target: this.$refs.iframe.contentWindow,
                targetOrigin: this.instance.url
            })
        }
    }
}
</script>
