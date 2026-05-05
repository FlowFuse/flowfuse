<template>
    <ff-dialog
        ref="dialog" :header="header" confirm-label="Close" :closeOnConfirm="true" data-el="flow-view-dialog"
        boxClass="min-w-[80%]! min-h-[80%]! w-[80%]! h-[80%]!" contentClass="overflow-hidden grow"
        @confirm="confirm"
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
                    class="grow"
                />
                <button
                    v-if="hasCompared"
                    v-ff-tooltip:left="'Simple view hides changes to node positions'"
                    class="text-xs px-2 py-1 rounded-sm border font-medium shrink-0"
                    :class="hidePositionChanges
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'"
                    @click="hidePositionChanges = !hidePositionChanges"
                >
                    Simple view
                </button>
            </div>

            <!-- Loading state -->
            <div v-if="loading" class="flex-1 flex items-center justify-center text-sm text-gray-400">
                Loading snapshot…
            </div>

            <!-- Navigation bar — shown after comparison -->
            <div v-if="hasCompared && !loading" class="flex items-center gap-2 px-3 py-1.5 border-b border-gray-200 bg-white shrink-0">
                <div v-if="currentGroup" class="flex-1 flex items-center gap-2 min-w-0">
                    <span class="text-xs font-semibold px-1.5 py-0.5 rounded-sm capitalize shrink-0" :class="diffTypeBadgeClass(currentGroup.diffType)">{{ currentGroup.diffType }}</span>
                    <span class="font-semibold text-sm text-gray-800 truncate">{{ currentGroup.name }}</span>
                    <span class="text-xs font-semibold text-gray-700 bg-gray-200 px-1.5 py-0.5 rounded-sm shrink-0">{{ currentGroup.type }}</span>
                    <span v-if="currentGroupCategoryLabel" class="text-xs font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-sm shrink-0">{{ currentGroupCategoryLabel }}</span>
                    <span v-if="currentGroupTabMove" class="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-sm shrink-0">
                        {{ currentGroupTabMove.from }} → {{ currentGroupTabMove.to }}
                    </span>
                </div>
                <div v-else class="flex-1 text-sm text-gray-400 text-center">No differences found</div>
                <!-- Prev / counter / Next grouped so the two buttons are adjacent -->
                <div class="flex items-center gap-1 shrink-0">
                    <button
                        class="px-2 py-0.5 text-sm rounded-sm border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                        :disabled="currentGroupIndex === 0"
                        title="Previous change (←)"
                        @click="navigate(-1)"
                    >
                        ‹ Prev
                    </button>
                    <span class="text-xs text-gray-400 px-1">{{ groupedChanges.length ? `${currentGroupIndex + 1} / ${groupedChanges.length}` : '0' }}</span>
                    <button
                        class="px-2 py-0.5 text-sm rounded-sm border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                        :disabled="currentGroupIndex >= groupedChanges.length - 1"
                        title="Next change (→)"
                        @click="navigate(1)"
                    >
                        Next ›
                    </button>
                </div>
            </div>

            <!-- Main area: flow canvas (always visible) + property diff panel (when compared) -->
            <div v-show="!loading" class="ff-compare-main flex overflow-hidden" :class="hasCompared ? 'ff-compare-main--with-nav' : ''">
                <!-- Flow canvas -->
                <div
                    ref="compareViewer"
                    data-el="ff-flow-compare-view"
                    class="ff-flow-compare-view flex-1 min-w-0 pt-4"
                    @click.stop.prevent
                >
&nbsp;
                </div>

                <!-- Drag handle -->
                <div v-if="hasCompared" class="ff-resize-handle shrink-0" @mousedown.prevent="startResize" />

                <!-- Property diff sidebar -->
                <div v-if="hasCompared" class="ff-compare-sidebar border-l border-gray-200 overflow-y-auto bg-white shrink-0" :style="{ width: sidebarWidth + 'px' }">
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
                <ff-button data-action="dialog-confirm" @click="confirm">Close</ff-button>
            </div>
        </template>
    </ff-dialog>
</template>

<script>
import FlowRenderer from '@flowfuse/flow-renderer'

import SnapshotsApi from '../../api/snapshots.js'
import Alerts from '../../services/alerts.js'

import SnapshotDiffChangePanel from './SnapshotDiffChangePanel.vue'

// Props shown in compact (single-line) mode in the diff sidebar
const COMPACT_PROPS = new Set(['position', 'z', 'g', 'name', 'label', 'type', 'wires', 'disabled'])
// Props to skip entirely in computeDiff — computed by Node-RED at render time, not user data
const IGNORED_PROPS = new Set(['id', 'w', 'h'])
// Props that represent node position — can be toggled off by the user
const POSITION_PROPS = new Set(['x', 'y'])
// Props shown in the nav header — skip when expanding all props for added/deleted nodes
const HEADER_PROPS = new Set(['id', 'type', 'z', 'name', 'label'])
// Node categories that have no visual presence on the SVG canvas
const CONFIG_CATEGORIES = new Set(['global-config', 'flow-config'])

const SIDEBAR_MIN_WIDTH = 200
const SIDEBAR_MAX_WIDTH = 800

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
             * @param {{flows: { flows: [] }}} v1Snapshot - A snapshot object as the base for comparison
             * @param {Array<{label: string, value: string}>} snapshotList - Snapshots to compare against
             */
            show (v1Snapshot, snapshotList) {
                this.payload = v1Snapshot
                this.compareSnapshot = null
                this.changes = []
                this.rendererChanges = []
                this.hasCompared = false
                this.nodeMap = {}
                this.compareSnapshotList = snapshotList.filter(s => s.value !== v1Snapshot?.id)
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
            loading: false,
            nodeMap: {},
            currentGroupIndex: 0,
            sidebarWidth: 380,
            resizing: false,
            resizeStartX: 0,
            resizeStartWidth: 0,
            hidePositionChanges: false
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
                if (this.hidePositionChanges && change.prop && POSITION_PROPS.has(change.prop)) continue
                const key = change.item
                if (!groups.has(key)) {
                    const node = this.nodeMap[key] || {}
                    groups.set(key, {
                        nodeId: key,
                        // Prefer explicit name/label; fall back to type (e.g. "inject")
                        // before the raw UUID so the nav bar stays readable
                        name: node.name || node.label || node.type || key,
                        type: node.type || '',
                        diffType: change.diffType,
                        category: this.nodeCategory(node),
                        propChanges: []
                    })
                }
                const group = groups.get(key)
                if (change.diffType === 'added' || change.diffType === 'deleted') {
                    const node = this.nodeMap[key] || {}
                    const isAdded = change.diffType === 'added'
                    for (const [prop, val] of Object.entries(node)) {
                        if (HEADER_PROPS.has(prop)) continue
                        if (IGNORED_PROPS.has(prop)) continue
                        if (this.hidePositionChanges && POSITION_PROPS.has(prop)) continue
                        group.propChanges.push({ prop, value1: isAdded ? undefined : val, value2: isAdded ? val : undefined })
                    }
                } else if (change.diffType === 'changed') {
                    group.propChanges.push({ prop: change.prop, value1: change.value1, value2: change.value2 })
                }
            }
            // When hiding position changes, drop nodes that only had position diffs
            if (this.hidePositionChanges) {
                for (const [key, group] of groups) {
                    if (group.diffType === 'changed' && group.propChanges.length === 0) {
                        groups.delete(key)
                    }
                }
            }
            return [...groups.values()]
        },
        currentGroup () {
            return this.groupedChanges[this.currentGroupIndex] || null
        },
        currentGroupChanges () {
            return this.transformChanges(this.currentGroup?.propChanges || [])
        },
        currentGroupCategoryLabel () {
            const cat = this.currentGroup?.category
            if (cat === 'global-config') return 'Global Config'
            if (cat === 'flow-config') return 'Flow Config'
            return null
        },
        currentGroupTabMove () {
            // Returns { from, to } if a changed node moved between tabs, null otherwise.
            // Not shown for added/deleted nodes — the tab is part of their identity,
            // not a move.
            if (this.currentGroup?.diffType !== 'changed') return null
            const zChange = this.currentGroup?.propChanges?.find(c => c.prop === 'z')
            if (!zChange || zChange.value1 === zChange.value2) return null
            return {
                from: this.resolveTabName(zChange.value1),
                to: this.resolveTabName(zChange.value2)
            }
        }
    },
    watch: {
        compareSnapshot (val) {
            if (val) this.renderComparison()
        },
        hidePositionChanges () {
            // Clamp index — the list may have shrunk
            if (this.currentGroupIndex >= this.groupedChanges.length) {
                this.currentGroupIndex = Math.max(0, this.groupedChanges.length - 1)
            }
            this.highlightCurrent()
        }
    },
    mounted () {
        document.addEventListener('keydown', this.onKeyDown)
    },
    beforeUnmount () {
        document.removeEventListener('keydown', this.onKeyDown)
        document.removeEventListener('mousemove', this.onResize)
        document.removeEventListener('mouseup', this.stopResize)
    },
    methods: {
        confirm () {
            this.cleanup()
            this.$refs.dialog.close()
        },
        async renderComparison () {
            this.cleanup()
            this.hasCompared = false
            this.loading = true
            let compareSnapshot
            try {
                compareSnapshot = await SnapshotsApi.getFullSnapshot(this.compareSnapshot)
            } finally {
                this.loading = false
            }
            if (!compareSnapshot?.flows?.flows) {
                Alerts.emit('Flows not found in the selected snapshot', 'warning')
                return
            }
            const compareFlow = compareSnapshot.flows.flows

            const map = {}
            for (const node of [...compareFlow, ...this.flow]) {
                if (node.id) map[node.id] = node
            }
            this.nodeMap = map

            const flowRenderer = new FlowRenderer()
            const result = flowRenderer.compare([compareFlow, this.flow], {
                container: this.$refs.compareViewer,
                // Explicit scope prevents the renderer from using Tailwind utility
                // classes (e.g. flex-1) as CSS selectors, which would leak
                // svg sizing rules to the rest of the page.
                scope: 'ff-flow-compare-view',
                persistentHighlight: true,
                allChanges: true
            })
            this.rendererChanges = result?.changes || []
            this.clearRendererHighlight = result?.clearHighlight || (() => {})
            this.changes = this.computeDiff(compareFlow, this.flow)
            this.currentGroupIndex = 0
            this.hasCompared = true
            await this.$nextTick()
            await this.$nextTick()
            this.highlightCurrent()
        },
        navigate (dir) {
            const next = this.currentGroupIndex + dir
            if (next < 0 || next >= this.groupedChanges.length) return
            this.currentGroupIndex = next
            this.highlightCurrent()
        },
        onKeyDown (e) {
            if (!this.hasCompared) return
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
            if (e.key === 'ArrowLeft') { e.preventDefault(); this.navigate(-1) } else if (e.key === 'ArrowRight') { e.preventDefault(); this.navigate(1) }
        },
        highlightCurrent () {
            const group = this.currentGroup
            if (!group) return
            this.clearRendererHighlight()
            if (CONFIG_CATEGORIES.has(group.category)) return
            // Always pass layerNo explicitly from our own diffType so the renderer
            // shows the correct layer regardless of its internal change classification.
            const layerNo = group.diffType === 'added' ? 1 : group.diffType === 'deleted' ? 0 : -1
            // Jump the slider directly to the target and dispatch one input event so
            // the renderer updates layer opacities immediately.
            if (layerNo !== -1) {
                const slider = this.$refs.compareViewer?.querySelector('.flow-compare-slider')
                const target = layerNo === 1 ? 90 : 10
                if (slider && parseInt(slider.value) !== target) {
                    slider.value = target
                    slider.dispatchEvent(new Event('input', { bubbles: true }))
                }
            }
            if (group.type === 'tab') {
                const proxy = this.rendererChanges.find(rc => rc.tab === group.nodeId && rc.highlight)
                if (proxy) proxy.highlight(layerNo)
            } else {
                for (const rc of this.rendererChanges) {
                    if (rc.item === group.nodeId && rc.highlight) {
                        rc.highlight(layerNo)
                    }
                }
            }
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
        startResize (e) {
            this.resizing = true
            this.resizeStartX = e.clientX
            this.resizeStartWidth = this.sidebarWidth
            document.addEventListener('mousemove', this.onResize)
            document.addEventListener('mouseup', this.stopResize)
        },
        onResize (e) {
            if (!this.resizing) return
            const delta = this.resizeStartX - e.clientX
            this.sidebarWidth = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, this.resizeStartWidth + delta))
        },
        stopResize () {
            this.resizing = false
            document.removeEventListener('mousemove', this.onResize)
            document.removeEventListener('mouseup', this.stopResize)
        },
        isCompactProp (prop) {
            return COMPACT_PROPS.has(prop)
        },
        transformChanges (changes) {
            const result = []
            let xChange = null
            let yChange = null
            for (const c of changes) {
                if (c.prop === 'x') { xChange = c; continue }
                if (c.prop === 'y') { yChange = c; continue }
                if (c.prop === 'z') {
                    result.push({ prop: 'z', label: 'Tab', value1: this.resolveTabName(c.value1), value2: this.resolveTabName(c.value2) })
                    continue
                }
                if (c.prop === 'g') {
                    result.push({ prop: 'g', label: 'Group', value1: this.resolveNodeName(c.value1), value2: this.resolveNodeName(c.value2) })
                    continue
                }
                if (c.prop === 'disabled') {
                    // Show as "enabled" / "disabled" rather than raw true/false
                    result.push({ prop: 'disabled', label: 'Status', value1: this.resolveDisabled(c.value1), value2: this.resolveDisabled(c.value2) })
                    continue
                }
                if (c.prop === 'wires') {
                    result.push({ prop: 'wires', value1: this.resolveWires(c.value1), value2: this.resolveWires(c.value2) })
                    continue
                }
                result.push(c)
            }
            if (xChange || yChange) {
                const node = this.nodeMap[this.currentGroup?.nodeId] || {}
                const v1 = { x: xChange ? xChange.value1 : node.x, y: yChange ? yChange.value1 : node.y }
                const v2 = { x: xChange ? xChange.value2 : node.x, y: yChange ? yChange.value2 : node.y }
                result.push({
                    prop: 'position',
                    value1: (v1.x !== undefined || v1.y !== undefined) ? v1 : undefined,
                    value2: (v2.x !== undefined || v2.y !== undefined) ? v2 : undefined
                })
            }
            // Compact props always appear first as a block
            result.sort((a, b) => (this.isCompactProp(a.prop) ? 0 : 1) - (this.isCompactProp(b.prop) ? 0 : 1))
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
        resolveNodeName (nodeId) {
            if (!nodeId) return nodeId
            const node = this.nodeMap[nodeId]
            return node ? (node.name || node.label || nodeId) : nodeId
        },
        resolveDisabled (val) {
            if (val === undefined || val === null) return undefined
            return val ? 'disabled' : 'enabled'
        },
        nodeCategory (node) {
            if (!node || !node.type) return 'node'
            if (node.type === 'tab') return 'tab'
            if (node.type === 'group') return 'group'
            if (node.type === 'subflow') return 'subflow'
            // Config nodes have no canvas position — works for all node packages
            if (node.x === undefined && node.y === undefined) {
                return node.z ? 'flow-config' : 'global-config'
            }
            return 'node'
        },
        computeDiff (flow1, flow2) {
            const map1 = {}
            const map2 = {}
            for (const n of flow1) { if (n.id) map1[n.id] = n }
            for (const n of flow2) { if (n.id) map2[n.id] = n }

            const changes = []

            for (const id of Object.keys(map1)) {
                if (!map2[id]) changes.push({ item: id, diffType: 'deleted' })
            }
            for (const id of Object.keys(map2)) {
                if (!map1[id]) changes.push({ item: id, diffType: 'added' })
            }
            for (const id of Object.keys(map1)) {
                if (!map2[id]) continue
                const n1 = map1[id]
                const n2 = map2[id]
                for (const prop of new Set([...Object.keys(n1), ...Object.keys(n2)])) {
                    if (IGNORED_PROPS.has(prop)) continue
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
/* The renderer applies -webkit-appearance:none but leaves the input box
   with a white user-agent background. Make it transparent so only the
   styled track is visible. */
.ff-flow-compare-view :deep(input[type='range'].flow-compare-slider) {
    background: transparent;
}

/* Smooth opacity transitions for SVG flow layers and tab labels.
   The renderer normally steps opacity via a slow JS loop; we bypass that
   loop and let CSS handle the fade (see highlightCurrent). */
.ff-flow-compare-view :deep(.flow-layer-0),
.ff-flow-compare-view :deep(.flow-layer-1) {
    transition: opacity 250ms ease;
}
.ff-flow-compare-view :deep(.red-ui-tab-label) {
    transition: opacity 250ms ease;
}

.ff-compare-main {
    height: calc(100% - 2.5rem);
}
.ff-compare-main--with-nav {
    height: calc(100% - 5rem);
}
.ff-resize-handle {
    width: 4px;
    cursor: col-resize;
    background: transparent;
    transition: background 0.15s;
}
.ff-resize-handle:hover {
    background: #93c5fd; /* blue-300 */
}
</style>
