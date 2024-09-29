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
            :src="instance.url"
            referrerpolicy="strict-origin-when-cross-origin"
            allowfullscreen
            :style="{'pointer-events': disableEvents ? 'none' : 'auto'}"
            data-el="editor-iframe"
        />
    </section>
</template>

<script>
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
    name: 'EditorWrapper',
    components: { LoadingScreenWrapper },
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
    },
    methods: {
        eventListener (event) {
            if (event.origin === this.instance.url) {
                switch (event.data.type) {
                case 'load':
                    this.emitMessage('prevent-redirect', true)
                    break
                case 'navigate':
                    window.location.href = event.data.payload
                    break
                case 'logout':
                    this.$router.push({ name: 'instance-overview', params: { id: this.instance.id } })
                    break
                default:
                }
            }
        },
        emitMessage (type, payload = {}) {
            this.$refs.iframe.contentWindow.postMessage({ type, payload }, '*')
        }
    }
}
</script>

<style scoped lang="scss">
.editor-wrapper {
  height: 100%;
  width: 100%;
  position: absolute;
  display: flex;
  flex-direction: column;
  align-content: center;
  justify-content: center;
}
.editor-wrapper .status-wrapper {
    margin-top: -64px;
}
</style>
