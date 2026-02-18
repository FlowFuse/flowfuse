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
    }
}
</script>

<style scoped lang="scss">

</style>
