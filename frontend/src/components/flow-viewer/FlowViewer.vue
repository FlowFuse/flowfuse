<template>
    <div ref="viewer" data-el="ff-flow-previewer" class="ff-flow-viewer">
        {{ flow }}
    </div>
</template>

<script>

import FlowRenderer from '@flowfuse/flow-renderer'

export default {
    name: 'FlowViewer',
    props: {
        flow: { required: true, type: Object }
    },
    mounted () {
        this.render()
    },
    methods: {
        render () {
            const flowRenderer = new FlowRenderer()
            flowRenderer.renderFlows(this.flow, {
                container: this.$refs.viewer
            })
        }
    }
}
</script>

<style scoped>
.ff-flow-viewer {
    height: 600px;
}
</style>
