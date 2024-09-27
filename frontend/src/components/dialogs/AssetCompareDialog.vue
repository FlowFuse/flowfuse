<template>
    <ff-dialog
        ref="dialog" :header="header" confirm-label="Close" :closeOnConfirm="true" data-el="flow-view-dialog"
        boxClass="!min-w-[80%] !min-h-[80%] !w-[80%] !h-[80%]" contentClass="overflow-hidden flex-grow"
        @confirm="confirm()"
    >
        <template #default>
            <div class="flex gap-2" data-el="snapshot-compare-toolbar">
                <ff-listbox
                    v-model="compareSnapshot"
                    :options="compareSnapshotList"
                    data-el="snapshots-list"
                    label-key="label"
                    class="flex-grow"
                />
                <ff-button
                    v-if="true"
                    :disabled="!compareSnapshot"
                    data-action="compare-snapshots"
                    kind="secondary"
                    style="height: 30px; width: 106px"
                    class="w-32"
                    @click="renderComparison"
                >
                    Compare
                </ff-button>
            </div>
            <div v-if="changes.length" class="flex justify-between items-center gap-2 mt-2 ml-2">
                <div class="whitespace-nowrap">Change {{ changeIndex + 1 }} of {{ changes.length }}:</div>
                <div class="text-sm text-gray-500 flex-grow truncate overflow-ellipsis">
                    {{ changes[changeIndex].toString() }}
                </div>
                <ff-button kind="secondary" size="small" class="w-14" @click="gotoPreviousDifference">Prev</ff-button>
                <ff-button kind="secondary" size="small" class="w-14" @click="gotoNextDifference">Next</ff-button>
            </div>
            <div v-else class="mt-2">
                <div class="text-sm text-gray-500 flex-grow truncate overflow-ellipsis ml-2">No differences found</div>
            </div>
            <div ref="compareViewer" data-el="ff-flow-compare-view" class="ff-flow-compare-viewer pt-4" @click.stop.prevent>
              &nbsp;
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

import SnapshotsApi from '../../api/snapshots.js'

import Alerts from '../../services/alerts.js'
import FfListbox from '../../ui-components/components/form/ListBox.vue'

export default {
    name: 'AssetCompareDialog',
    components: { FfListbox },
    props: {
        title: {
            type: String,
            default: ''
        }
    },
    setup () {
        return {
        /**
         * Shows the compare flows dialog and presents the user with a list of snapshots to compare against
         * @param {{flows: { flows :[]}}} v1Snapshot - A snapshot object as the base for comparison
         * @param {[{label: String, value: String}]} snapshotList - A list of snapshots to compare against where label is the snapshot name and value is the snapshot id
         */
            show (v1Snapshot, snapshotList) {
                this.mode = 'compare'
                this.payload = v1Snapshot
                this.compareSnapshot = null
                this.changes = []
                this.changeIndex = 0
                this.compareSnapshotList = snapshotList
                this.$refs.dialog.show()
            }
        }
    },
    data () {
        return {
            payload: [],
            snapshotList: [],
            compareSnapshot: null,
            compareSnapshotList: [],
            mode: 'view', // view, compare
            changes: [],
            changeIndex: 0
        }
    },
    computed: {
        flow () {
            return this.payload?.flows?.flows || []
        },
        header () {
            return this.payload?.name || this.title || 'Flow'
        }
    },
    mounted () {
    },
    methods: {
        confirm () {
            this.cleanup()
            this.$refs.dialog.close()
        },
        renderFlows () {
            this.cleanup()
            const flowRenderer = new FlowRenderer()
            flowRenderer.renderFlows(this.flow, {
                container: this.$refs.compareViewer
            })
        },
        async renderComparison (snapshotId) {
            this.cleanup()
            const compareSnapshot = await SnapshotsApi.getFullSnapshot(this.compareSnapshot)
            if (!compareSnapshot?.flows?.flows) {
                Alerts.emit('Flows not found in the selected snapshot', 'warning')
                return
            }
            const flowRenderer = new FlowRenderer()
            const flows = [this.flow, compareSnapshot?.flows?.flows]
            const result = flowRenderer.compare(flows, {
                container: this.$refs.compareViewer
            })
            this.changes = result?.changes || []
        },
        gotoNextDifference () {
            this.changeIndex = (this.changeIndex + 1) % this.changes.length
            this.changes[this.changeIndex].highlight()
        },
        gotoPreviousDifference () {
            this.changeIndex = (this.changeIndex - 1 + this.changes.length) % this.changes.length
            this.changes[this.changeIndex].highlight()
        },
        cleanup () {
            while (this.$refs.compareViewer?.firstChild) {
                this.$refs.compareViewer.removeChild(this.$refs.compareViewer.firstChild)
            }
        }
    }
}
</script>

<style scoped>
.ff-flow-compare-viewer {
  height: calc(100% - 4.5rem);
}
</style>
