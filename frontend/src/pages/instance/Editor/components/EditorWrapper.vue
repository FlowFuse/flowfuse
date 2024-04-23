<template>
    <section class="editor-wrapper">
        <div v-if="isInstanceTransitioningStates" class="status-wrapper">
            <InstanceStatusBadge
                :status="instance.meta?.state"
                :optimisticStateChange="instance.optimisticStateChange"
                :pendingStateChange="instance.pendingStateChange"
            />
        </div>

        <iframe
            v-else
            ref="iframe"
            width="100%"
            height="100%"
            :src="instance.url"
            referrerpolicy="strict-origin-when-cross-origin"
            allowfullscreen
            :style="{'pointer-events': disableEvents ? 'none' : 'auto'}"
        />
    </section>
</template>

<script>
import InstanceStatusBadge from '../../components/InstanceStatusBadge.vue'

export default {
    name: 'EditorWrapper',
    components: { InstanceStatusBadge },
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
            return pendingState || optimisticStateChange || ['starting', 'suspended', 'suspending'].includes(this.instance.meta?.state)
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

  .status-wrapper {
    display: flex;
    justify-content: center;
  }
}
</style>
