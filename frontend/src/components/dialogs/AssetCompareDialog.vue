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

            <!-- Navigation bar — shown after comparison -->
            <div v-if="hasCompared" class="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 bg-white shrink-0">
                <button
                    class="px-2 py-0.5 text-sm rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    :disabled="currentGroupIndex === 0"
                    @click="navigate(-1)"
                >
                    ‹ Prev
                </button>
                <div v-if="currentGroup" class="flex-1 flex items-center gap-2 min-w-0">
                    <span class="text-xs font-semibold px-1.5 py-0.5 rounded shrink-0" :class="diffTypeBadgeClass(currentGroup.diffType)">{{ currentGroup.diffType }}</span>
                    <span class="font-semibold text-sm text-gray-800 truncate">{{ currentGroup.name }}</span>
                    <span class="text-xs text-gray-400 shrink-0">{{ currentGroup.type }}</span>
                </div>
                <div v-else class="flex-1 text-sm text-gray-400 text-center">No differences found</div>
                <span class="text-xs text-gray-400 shrink-0">{{ groupedChanges.length ? `${currentGroupIndex + 1} / ${groupedChanges.length}` : '0' }}</span>
                <button
                    class="px-2 py-0.5 text-sm rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    :disabled="currentGroupIndex >= groupedChanges.length - 1"
                    @click="navigate(1)"
                >
                    Next ›
                </button>
            </div>

            <!-- Main area: flow canvas (always visible) + property diff panel (when compared) -->
            <div class="ff-compare-main flex overflow-hidden" :class="hasCompared ? 'ff-compare-main--with-nav' : ''">
                <!-- Flow canvas -->
                <div
                    ref="compareViewer"
                    data-el="ff-flow-compare-view"
                    class="flex-1 min-w-0 pt-4"
                    @click.stop.prevent
                >&nbsp;</div>

                <!-- Property diff sidebar -->
                <div v-if="hasCompared" class="ff-compare-sidebar border-l border-gray-200 overflow-y-auto bg-white shrink-0">
                    <div v-if="!currentGroupChanges.length" class="px-3 py-4 text-xs text-gray-400 italic text-center">
                        No property changes for this node.
                    </div>
                    <SnapshotDiffChangePanel
                        v-for="change in currentGroupChanges"
                        :key="change.prop"
                        :prop="change.prop"
                        :label="change.label"
                        :value1="change.value1"
                        :value2="change.value2"
                        :compact="isCompactProp(change.prop)"
                    />
                </div>
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
            show (v1Snapshot, snapshotList) {
                this.payload = v1Snapshot
                this.compareSnapshot = null
                this.changes = []
                this.rendererChanges = []
                this.hasCompared = false
                this.nodeMap = {}
                this.compareSnapshotList = snapshotList
                this.currentGroupIndex = 0
                this.$refs.dialog.show()
            }
        }
    },
    data () {
        return {
            payload: [],
            compareSnapshot: null,
            compareSnapshotList: [],
            changes: [],
            rendererChanges: [],
            hasCompared: false,
            nodeMap: {},
            currentGroupIndex: 0
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
            const groups = new Map()
            for (const change of this.changes) {
                const key = change.item
                if (!groups.has(key)) {
                    const node = this.nodeMap[key] || {}
                    groups.set(key, {
                        nodeId: key,
                        name: node.name || node.label || key,
                        type: node.type || '',
                        diffType: change.diffType,
                        propChanges: []
                    })
                }
                const group = groups.get(key)
                if (change.diffType === 'added' || change.diffType === 'deleted') {
                    group.diffType = change.diffType
                    const node = this.nodeMap[key] || {}
                    const isAdded = change.diffType === 'added'
                    for (const [prop, val] of Object.entries(node)) {
                        if (prop === 'id') continue
                        group.propChanges.push({ prop, value1: isAdded ? undefined : val, value2: isAdded ? val : undefined })
                    }
                } else if (change.diffType === 'changed') {
                    group.propChanges.push({ prop: change.prop, value1: change.value1, value2: change.value2 })
                }
            }
            return [...groups.values()]
        },
        currentGroup () {
            return this.groupedChanges[this.currentGroupIndex] || null
        },
        currentGroupChanges () {
            const raw = this.currentGroup?.propChanges || []
            return this.transformChanges(raw)
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
        async renderComparison () {
            this.cleanup()
            this.hasCompared = false
            const compareSnapshot = await SnapshotsApi.getFullSnapshot(this.compareSnapshot)
            if (!compareSnapshot?.flows?.flows) {
                Alerts.emit('Flows not found in the selected snapshot', 'warning')
                return
            }
            const compareFlow = compareSnapshot.flows.flows

            const map = {}
            for (const node of [...this.flow, ...compareFlow]) {
                if (node.id) map[node.id] = node
            }
            this.nodeMap = map

            const flowRenderer = new FlowRenderer()
            const result = flowRenderer.compare([compareFlow, this.flow], {
                container: this.$refs.compareViewer
            })
            this.rendererChanges = result?.changes || []
            this.changes = this.computeDiff(compareFlow, this.flow)
            this.currentGroupIndex = 0
            this.hasCompared = true
            this.$nextTick(() => this.highlightCurrent())
        },
        navigate (dir) {
            const next = this.currentGroupIndex + dir
            if (next < 0 || next >= this.groupedChanges.length) return
            this.currentGroupIndex = next
            this.highlightCurrent()
        },
        highlightCurrent () {
            const group = this.currentGroup
            if (!group) return
            const rc = this.rendererChanges.find(c => c.item === group.nodeId)
            if (rc?.highlight) rc.highlight()
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
        isCompactProp (prop) {
            return ['position', 'z', 'name', 'label', 'type', 'wires'].includes(prop)
        },
        transformChanges (changes) {
            const result = []
            let xChange = null
            let yChange = null
            for (const c of changes) {
                if (c.prop === 'x') { xChange = c; continue }
                if (c.prop === 'y') { yChange = c; continue }
                if (c.prop === 'z') {
                    result.push({
                        prop: 'z',
                        label: 'tab',
                        value1: this.resolveTabName(c.value1),
                        value2: this.resolveTabName(c.value2)
                    })
                    continue
                }
                if (c.prop === 'wires') {
                    result.push({
                        prop: 'wires',
                        value1: this.resolveWires(c.value1),
                        value2: this.resolveWires(c.value2)
                    })
                    continue
                }
                result.push(c)
            }
            if (xChange || yChange) {
                const v1x = xChange?.value1
                const v1y = yChange?.value1
                const v2x = xChange?.value2
                const v2y = yChange?.value2
                result.push({
                    prop: 'position',
                    value1: (v1x !== undefined || v1y !== undefined) ? { x: v1x, y: v1y } : undefined,
                    value2: (v2x !== undefined || v2y !== undefined) ? { x: v2x, y: v2y } : undefined
                })
            }
            return result
        },
        resolveWires (wires) {
            if (!Array.isArray(wires)) return wires
            return wires.map(outputs =>
                Array.isArray(outputs)
                    ? outputs.map(id => {
                        const node = this.nodeMap[id]
                        return node ? (node.name || node.label || id) : id
                    })
                    : outputs
            )
        },
        resolveTabName (tabId) {
            if (!tabId) return tabId
            const tab = this.nodeMap[tabId]
            return tab ? (tab.label || tabId) : tabId
        },
        computeDiff (flow1, flow2) {
            const SKIP = new Set(['id'])
            const map1 = {}
            const map2 = {}
            for (const n of flow1) { if (n.id) map1[n.id] = n }
            for (const n of flow2) { if (n.id) map2[n.id] = n }

            const changes = []

            for (const id of Object.keys(map1)) {
                if (!map2[id]) changes.push({ item: id, diffType: 'deleted', prop: '' })
            }
            for (const id of Object.keys(map2)) {
                if (!map1[id]) changes.push({ item: id, diffType: 'added', prop: '' })
            }
            for (const id of Object.keys(map1)) {
                if (!map2[id]) continue
                const n1 = map1[id]
                const n2 = map2[id]
                const props = new Set([...Object.keys(n1), ...Object.keys(n2)])
                for (const prop of props) {
                    if (SKIP.has(prop)) continue
                    const v1 = n1[prop]
                    const v2 = n2[prop]
                    if (JSON.stringify(v1) !== JSON.stringify(v2)) {
                        changes.push({ item: id, diffType: 'changed', prop, value1: v1, value2: v2 })
                    }
                }
            }
            return changes
        }
    }
}
</script>

<style scoped>
.ff-compare-main {
    height: calc(100% - 2.5rem);
}
.ff-compare-main--with-nav {
    height: calc(100% - 5rem);
}
.ff-compare-sidebar {
    width: 380px;
}
</style>
