<template>
    <ff-dialog ref="dialog" :header="header" confirm-label="Close" :closeOnConfirm="true" data-el="snapshot-view-dialog" boxClass="!min-w-[80%] !min-h-[80%] !w-[80%] !h-[80%]" contentClass="overflow-hidden" @confirm="confirm()">
        <template #default>
            <div ref="viewer" data-el="ff-flow-previewer" class="ff-flow-viewer">
                Loading...
            </div>
        </template>
        <template #actions>
            <div class="flex justify-end">
                <ff-button @click="confirm()">Close</ff-button>
            </div>
        </template>
    </ff-dialog>
</template>
<script>

import FlowRenderer from '@flowfuse/flow-renderer'

export default {
    name: 'FlowViewerDialog',
    components: {
        // FlowViewer
    },
    setup () {
        return {
            show (snapshot) {
                this.$refs.dialog.show()
                this.snapshot = snapshot
                setTimeout(() => {
                    this.renderFlows()
                }, 20)
            }
        }
    },
    data () {
        return {
            snapshot: []
        }
    },
    computed: {
        flow () {
            return this.snapshot?.flows?.flows || []
        },
        header () {
            return this.snapshot?.name || 'Snapshot'
        }
    },
    mounted () {
    },
    methods: {
        confirm () {
            this.$refs.dialog.close()
        },
        renderFlows () {
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
    height: 100%;
}
</style>
