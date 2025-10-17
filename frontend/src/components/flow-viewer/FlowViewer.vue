<template>
    <div class="flow-viewer-wrapper">
        <div v-if="loading" class="overlay">
            <FfSpinner />
        </div>
        <div
            ref="viewer"
            data-el="ff-flow-previewer"
            class="ff-flow-viewer"
            :class="{loading}"
        >
            {{ flow }}
        </div>
    </div>
</template>

<script>

import FlowRenderer from '@flowfuse/flow-renderer'

import FfSpinner from '../../ui-components/components/Spinner.vue'

export default {
    name: 'FlowViewer',
    components: { FfSpinner },
    props: {
        flow: {
            required: true,
            type: Object
        }
    },
    data () {
        return {
            loading: true
        }
    },
    watch: {
        flow: {
            immediate: true,
            handler () {
                this.loading = true
                // initial render for empty spinner overlay backdrop
                this.$nextTick(() => this.render([]))
                setTimeout(() => {
                    this.render(this.flow)
                    this.loading = false
                }, 700)
            }
        }
    },
    methods: {
        render (flow) {
            const flowRenderer = new FlowRenderer()
            flowRenderer.renderFlows(flow, {
                container: this.$refs.viewer
            })
        }
    }
}
</script>

<style scoped lang="scss">
.flow-viewer-wrapper {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    flex-direction: column;
    position: relative;

    .overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(255, 255, 255, 0.4);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }

    .ff-flow-viewer {
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-height: 0;
        overflow: auto;
        opacity: 1;
        transition: ease-in-out .3s;

        &.loading {
            opacity: 0.5;
        }
    }
}
</style>
