<template>
    <ff-button class="deploy-this-snapshot-button" :disabled="disabled" @click="emitAction()">Deploy<span class="hidden sm:inline">&nbsp;Snapshot</span></ff-button>
</template>

<script>
export default {
    name: 'DeployThisSnapshot',
    props: {
        snapshotId: {
            type: String,
            required: true
        },
        deviceId: {
            type: String,
            required: true
        },
        disabled: {
            type: Boolean,
            default: false
        }
    },
    emits: ['deploy-snapshot'],
    methods: {
        emitAction () {
            this.$emit('deploy-snapshot', this.snapshotId, this.deviceId)
        }
    }
}
</script>
