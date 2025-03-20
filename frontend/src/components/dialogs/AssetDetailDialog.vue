<template>
    <ff-dialog ref="dialog" :header="header" confirm-label="Close" :closeOnConfirm="true" data-el="flow-view-dialog" boxClass="!min-w-[80%] !min-h-[80%] !w-[80%] !h-[80%]" contentClass="overflow-hidden flex-grow" @confirm="confirm()">
        <template #default>
            <div ref="viewer" data-el="ff-flow-previewer" class="ff-flow-viewer" @click.stop.prevent>
                Loading...
            </div>
        </template>
        <template #actions>
            Node-RED {{ nrVersion }}
            <div class="flex justify-end">
                <ff-button data-action="dialog-confirm" @click="confirm()">Close</ff-button>
            </div>
        </template>
    </ff-dialog>
</template>
<script>

import FlowRenderer from '@flowfuse/flow-renderer'

export default {
    name: 'FlowViewerDialog',
    props: {
        title: {
            type: String,
            default: ''
        }
    },
    setup () {
        return {
            show (payload) { // accepts blueprints, snapshots and libraries
                this.mode = 'view'
                this.$refs.dialog.show()
                this.payload = payload
                setTimeout(() => {
                    this.renderFlows()
                }, 20)
            }
        }
    },
    data () {
        return {
            payload: []
        }
    },
    computed: {
        flow () {
            return this.payload?.flows?.flows || []
        },
        nrVersion () {
            try {
                const mods = this.payload?.settings?.modules
                if (mods) {
                    return mods['node-red'] || 'ben'
                } else {
                    return ''
                }
            } catch (e) {
                console.log(e)
            }
        },
        header () {
            return this.payload?.name || this.title || 'Flow'
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
