<template>
    <ff-dialog
        ref="dialog" :header="header" confirm-label="Close" :closeOnConfirm="true" data-el="flow-view-dialog"
        boxClass="!min-w-[80%] !min-h-[80%] !w-[80%] !h-[80%]" contentClass="overflow-hidden flex-grow"
        @confirm="confirm()"
    >
        <template #default>
            <!-- Toolbar -->
            <div class="flex gap-2 items-center" data-el="snapshot-compare-toolbar">
                <ff-listbox
                    v-model="compareSnapshot"
                    :options="compareSnapshotList"
                    data-el="snapshots-list"
                    label-key="label"
                    option-title-key="description"
                    class="flex-grow"
                />
            </div>

            <!-- Tab bar — shown after a comparison is run -->
            <div v-if="hasCompared" class="flex mt-2 border-b border-gray-200">
                <button
                    class="px-4 py-1.5 text-sm font-medium border-b-2 transition-colors"
                    :class="activeTab === 'changes' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
                    @click="activeTab = 'changes'"
                >
                    Changes
                    <span
                        class="ml-1.5 px-1.5 py-0.5 text-xs rounded-full"
                        :class="groupedChanges.length ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'"
                    >{{ groupedChanges.length }}</span>
                </button>
                <button
                    class="px-4 py-1.5 text-sm font-medium border-b-2 transition-colors"
                    :class="activeTab === 'flow' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
                    @click="activeTab = 'flow'"
                >
                    Flow
                </button>
            </div>

            <!-- Changes tab: groups all changed nodes, each with their property diffs -->
            <div
                v-if="hasCompared && activeTab === 'changes'"
                class="ff-snapshot-changes-view overflow-y-auto"
            >
                <div v-if="groupedChanges.length === 0" class="flex items-center justify-center py-8 text-sm text-gray-400">
                    No differences found
                </div>
                <template v-else>
                    <!-- Global collapse/expand -->
                    <div class="flex items-center justify-end px-3 py-1 border-b border-gray-100 bg-white sticky top-0 z-20">
                        <button
                            class="text-xs text-blue-600 hover:text-blue-800"
                            @click="allCollapsed ? expandAll() : collapseAll()"
                        >
                            {{ allCollapsed ? 'Expand all' : 'Collapse all' }}
                        </button>
                    </div>
                    <!-- Node sections -->
                    <div v-for="(group, gi) in groupedChanges" :key="group.nodeId" class="border-b border-gray-200">
                        <!-- Node header (click to collapse/expand) -->
                        <div
                            class="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 sticky top-7 z-10 cursor-pointer select-none"
                            @click="toggleNodeCollapse(group.nodeId)"
                        >
                            <svg
                                class="w-3 h-3 text-gray-400 transition-transform duration-150 flex-shrink-0"
                                :class="{ 'rotate-90': !collapsedNodes.has(group.nodeId) }"
                                viewBox="0 0 20 20" fill="currentColor"
                            >
                                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                            </svg>
                            <span class="text-xs font-semibold px-1.5 py-0.5 rounded" :class="diffTypeBadgeClass(group.diffType)">{{ group.diffType }}</span>
                            <span class="font-semibold text-sm text-gray-800">{{ group.name }}</span>
                            <span class="text-xs text-gray-400">{{ group.type }}</span>
                            <span v-if="group.movedTo" class="ml-auto text-xs text-gray-400">
                                moved to <span class="font-medium text-gray-600">{{ group.movedTo }}</span>
                            </span>
                        </div>
                        <!-- Node body (hidden when collapsed) -->
                        <template v-if="!collapsedNodes.has(group.nodeId)">
                            <template v-if="group.diffType === 'changed'">
                                <!-- Libraries -->
                                <template v-if="group.libsDiff">
                                    <div class="px-3 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Libraries</div>
                                    <SnapshotDiffChangePanel prop="libs" :value1="group.libsDiff.v1" :value2="group.libsDiff.v2" />
                                </template>
                                <!-- Code -->
                                <template v-if="group.categorizedChanges.code.length">
                                    <div class="px-3 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Code</div>
                                    <SnapshotDiffChangePanel
                                        v-for="(change, ci) in group.categorizedChanges.code"
                                        :key="change.prop"
                                        :prop="change.prop"
                                        :value1="change.value1"
                                        :value2="change.value2"
                                        :auto-scroll-to-first="gi === 0 && ci === 0 && !group.libsDiff"
                                    />
                                </template>
                                <!-- Wires -->
                                <template v-if="group.categorizedChanges.wires.length">
                                    <div class="px-3 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Wires</div>
                                    <SnapshotDiffChangePanel
                                        v-for="change in group.categorizedChanges.wires"
                                        :key="change.prop"
                                        :prop="change.prop"
                                        :value1="change.value1"
                                        :value2="change.value2"
                                    />
                                </template>
                                <!-- Properties -->
                                <template v-if="group.categorizedChanges.properties.length">
                                    <div class="px-3 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Properties</div>
                                    <SnapshotDiffChangePanel
                                        v-for="change in group.categorizedChanges.properties"
                                        :key="change.prop"
                                        :prop="change.prop"
                                        :value1="change.value1"
                                        :value2="change.value2"
                                    />
                                </template>
                            </template>
                            <div v-else class="px-3 py-2 text-xs text-gray-400 italic">
                                {{ group.diffType === 'added' ? 'Node was added to the flow.' : group.diffType === 'deleted' ? 'Node was removed from the flow.' : '' }}
                            </div>
                        </template>
                    </div>
                </template>
            </div>

            <!-- Flow canvas — always in the DOM so the renderer can inject into it.
                 Hidden when the Changes tab is active after a comparison. -->
            <div
                ref="compareViewer"
                data-el="ff-flow-compare-view"
                class="ff-flow-compare-viewer pt-4"
                :class="{ 'ff-flow-compare-viewer--with-tabs': hasCompared, 'hidden': hasCompared && activeTab === 'changes' }"
                @click.stop.prevent
            >&nbsp;</div>
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

import SnapshotDiffChangePanel from './SnapshotDiffChangePanel.vue'

export default {
    name: 'AssetCompareDialog',
    components: { SnapshotDiffChangePanel },
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
                this.hasCompared = false
                this.activeTab = 'changes'
                this.nodeMap = {}
                this.compareSnapshotList = snapshotList
                this.collapsedNodes = new Set()
                this.allCollapsed = false
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
            hasCompared: false,
            activeTab: 'changes',
            nodeMap: {},
            collapsedNodes: new Set(),
            allCollapsed: false
        }
    },
    computed: {
        flow () {
            return this.payload?.flows?.flows || []
        },
        header () {
            return this.payload?.name || this.title || 'Flow'
        },
        groupedChanges () {
            const CODE_PROPS = new Set(['func', 'initialize', 'finalize'])
            const groups = new Map()
            for (const change of this.changes) {
                if (change.diffType === 'positionChanged') continue
                const key = change.item
                if (!groups.has(key)) {
                    const node = this.nodeMap[key] || {}
                    groups.set(key, {
                        nodeId: key,
                        name: node.name || node.label || key,
                        type: node.type || '',
                        diffType: change.diffType,
                        movedTo: null,
                        libsDiff: null,
                        categorizedChanges: { libraries: [], code: [], wires: [], properties: [] }
                    })
                }
                const group = groups.get(key)
                if (change.diffType === 'added' || change.diffType === 'deleted') {
                    group.diffType = change.diffType
                } else if (change.diffType === 'moved') {
                    group.movedTo = this.nodeMap[change.value2]?.label || change.value2
                } else if (change.diffType === 'changed' && change.value1 !== change.value2) {
                    const { prop } = change
                    if (/^libs\[/.test(prop)) group.categorizedChanges.libraries.push(change)
                    else if (CODE_PROPS.has(prop)) group.categorizedChanges.code.push(change)
                    else if (/^wires\[/.test(prop)) group.categorizedChanges.wires.push(change)
                    else group.categorizedChanges.properties.push(change)
                }
            }
            const result = [...groups.values()]
            for (const group of result) {
                if (group.categorizedChanges.libraries.length) {
                    group.libsDiff = this.buildLibsDiff(group.categorizedChanges.libraries)
                }
            }
            return result
        }
    },
    watch: {
        compareSnapshot (newVal) {
            if (newVal) this.renderComparison()
        }
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
        async renderComparison () {
            this.cleanup()
            this.hasCompared = false
            const compareSnapshot = await SnapshotsApi.getFullSnapshot(this.compareSnapshot)
            if (!compareSnapshot?.flows?.flows) {
                Alerts.emit('Flows not found in the selected snapshot', 'warning')
                return
            }
            const compareFlow = compareSnapshot.flows.flows

            // Build a node lookup map from both flows to resolve names and types
            const map = {}
            for (const node of [...this.flow, ...compareFlow]) {
                if (node.id) map[node.id] = node
            }
            this.nodeMap = map

            const flowRenderer = new FlowRenderer()
            const result = flowRenderer.compare([compareFlow, this.flow], {
                container: this.$refs.compareViewer
            })
            this.changes = result?.changes || []
            this.hasCompared = true
            this.collapsedNodes = new Set()
            this.allCollapsed = false
            this.activeTab = 'changes'
        },
        diffTypeBadgeClass (diffType) {
            switch (diffType) {
            case 'added': return 'bg-green-100 text-green-700'
            case 'deleted': return 'bg-red-100 text-red-700'
            case 'moved': return 'bg-yellow-100 text-yellow-700'
            default: return 'bg-blue-100 text-blue-700'
            }
        },
        cleanup () {
            while (this.$refs.compareViewer?.firstChild) {
                this.$refs.compareViewer.removeChild(this.$refs.compareViewer.firstChild)
            }
        },
        toggleNodeCollapse (nodeId) {
            const next = new Set(this.collapsedNodes)
            if (next.has(nodeId)) next.delete(nodeId)
            else next.add(nodeId)
            this.collapsedNodes = next
            this.allCollapsed = next.size === this.groupedChanges.length
        },
        collapseAll () {
            this.collapsedNodes = new Set(this.groupedChanges.map(g => g.nodeId))
            this.allCollapsed = true
        },
        expandAll () {
            this.collapsedNodes = new Set()
            this.allCollapsed = false
        },
        buildLibsDiff (libraryChanges) {
            const entries = {}
            for (const change of libraryChanges) {
                const match = change.prop.match(/^libs\[(\d+)\]$/)
                if (match) entries[match[1]] = { value1: change.value1, value2: change.value2 }
            }
            const v1Lines = []
            const v2Lines = []
            for (const idx of Object.keys(entries).sort((a, b) => +a - +b)) {
                const { value1, value2 } = entries[idx]
                if (value1 && typeof value1 === 'object') v1Lines.push(`${value1.var} = require("${value1.module}")`)
                if (value2 && typeof value2 === 'object') v2Lines.push(`${value2.var} = require("${value2.module}")`)
            }
            return { v1: v1Lines.join('\n'), v2: v2Lines.join('\n') }
        }
    }
}
</script>

<style scoped>
/*
 * The dialog content area has a definite height (flex-grow inside the dialog box).
 * We use calc() here — matching the original pattern — to fill the remaining
 * height after the toolbar (~2.5rem) and optional tab bar (~2.5rem).
 */
.ff-flow-compare-viewer {
    height: calc(100% - 2.5rem);
}
.ff-flow-compare-viewer--with-tabs {
    height: calc(100% - 5rem);
}
.ff-snapshot-changes-view {
    height: calc(100% - 5rem);
}
</style>
