<template>
    <ff-dialog
        ref="dialog" :header="header" :sub-header="`Node-RED Version: ${nrVersion}`" confirm-label="Close" :closeOnConfirm="true"
        data-el="flow-view-dialog" boxClass="min-w-[80%]! min-h-[80%]! w-[80%]! h-[80%]!"
        contentClass="overflow-hidden grow" @confirm="confirm()"
    >
        <template #default>
            <div ref="viewer" data-el="ff-flow-previewer" class="ff-flow-viewer" @click.stop.prevent>
                Loading...
            </div>
        </template>
        <template #actions>
            <div class="flex justify-end">
                <ff-button data-action="dialog-confirm" @click="confirm()">Close</ff-button>
            </div>
        </template>
    </ff-dialog>
</template>
<script>

import FlowRenderer from '@flowfuse/flow-renderer'

import BlueprintAPI from '../../api/flowBlueprints.js'

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
            async show (payload) { // accepts blueprints, snapshots and libraries
                // If there is no flows property, but there is a category property, we assume this is a blueprint
                // and try to load the content dynamically
                if (!payload.flows && Object.hasOwn(payload, 'category')) {
                    const blueprint = await BlueprintAPI.getFlowBlueprint(payload.id)
                    payload.flows = blueprint.flows
                }
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
            const mods = this.payload?.settings?.modules
            if (mods) {
                return mods['node-red'] || 'Unavailable'
            }
            return ''
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
