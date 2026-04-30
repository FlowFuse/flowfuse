<template>
    <section class="editor-wrapper">
        <LoadingScreenWrapper
            v-if="shouldDisplayLoadingScreen"
            :state="instance.meta?.state"
            :optimisticStateChange="instance.optimisticStateChange"
            :pendingStateChange="instance.pendingStateChange"
        />

        <EmptyState v-else-if="isEditorDisabled" data-el="editor-disabled-empty-state">
            <template #img>
                <LockClosedIcon class="w-20 h-20 text-gray-400 mx-auto" />
            </template>
            <template #header>Editor Disabled</template>
            <template #message>
                <p>Access to the editor has been disabled in Settings &gt; Editor.</p>
                <p>Re-enable it to resume editing flows for this instance.</p>
            </template>
            <template #actions>
                <ff-button
                    kind="primary"
                    data-action="go-to-editor-settings"
                    @click="goToEditorSettings"
                >
                    Go to Editor Settings
                </ff-button>
            </template>
        </EmptyState>

        <EmptyState v-else-if="awaitingEditorRestart" data-el="editor-restart-required-empty-state">
            <template #img>
                <RefreshIcon class="w-20 h-20 text-gray-400 mx-auto" />
            </template>
            <template #header>Restart Required</template>
            <template #message>
                <p>The editor has been re-enabled, but the instance must be restarted for the change to take effect.</p>
            </template>
        </EmptyState>

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
import { LockClosedIcon, RefreshIcon } from '@heroicons/vue/outline'
import { mapActions } from 'pinia'

import EmptyState from '../EmptyState.vue'

import LoadingScreenWrapper from './LoadingScreenWrapper.vue'

import { useProductAssistantStore } from '@/stores/product-assistant.js'
import { useUxDrawersStore } from '@/stores/ux-drawers.js'

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
    components: { EmptyState, LoadingScreenWrapper, LockClosedIcon, RefreshIcon },
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
        },
        isEditorDisabled () {
            return !!this.instance.settings?.disableEditor
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
        shouldDisplayLoadingScreen (isLoading) {
            if (this.awaitingEditorRestart && isLoading) {
                this.awaitingEditorRestart = false
            }
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
        ...mapActions(useUxDrawersStore, ['openEditorImmersiveDrawer']),
        goToEditorSettings () {
            this.openEditorImmersiveDrawer()
            this.$router.push({
                name: 'instance-editor-settings-editor',
                params: { id: this.instance.id }
            })
        },
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
        }
    }
}
</script>
