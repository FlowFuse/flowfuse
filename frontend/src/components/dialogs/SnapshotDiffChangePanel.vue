<template>
    <div class="text-xs border-b border-gray-200 overflow-hidden">
        <!-- Compact mode (structural props: name, type, position, wires, tab …) -->
        <div v-if="compact" class="flex items-start gap-3 px-3 py-2">
            <span class="text-gray-500 shrink-0 w-20 pt-0.5 truncate">{{ label ?? prop }}</span>
            <div class="flex-1 flex flex-wrap items-center gap-1.5">
                <template v-for="(seg, i) in compactSegments" :key="i">
                    <span v-if="seg.type === 'arrow'" class="text-gray-400">→</span>
                    <span v-else-if="seg.type === 'sep'" class="text-gray-300 mx-0.5">|</span>
                    <span v-else-if="seg.type === 'nodesep'" class="text-gray-400 font-mono -mx-0.5">,</span>
                    <DiffValuePill v-else :kind="seg.kind" :text="seg.text" />
                </template>
            </div>
        </div>

        <!-- Git diff mode -->
        <template v-else>
            <!-- Collapsible header -->
            <div
                class="px-3 py-1 bg-gray-50 border-b border-gray-100 text-gray-500 sticky top-0 flex items-center gap-1 cursor-pointer select-none hover:bg-gray-100"
                @click="collapsed = !collapsed"
            >
                <svg
                    class="w-2.5 h-2.5 text-gray-400 transition-transform duration-150 shrink-0"
                    :class="{ 'rotate-90': !collapsed }"
                    viewBox="0 0 20 20" fill="currentColor"
                    aria-hidden="true"
                >
                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                </svg>
                <span>Property</span>
                <span class="font-semibold text-gray-700">{{ label ?? prop }}</span>
                <span class="ml-auto flex items-center gap-2">
                    <template v-if="!collapsed">
                        <!-- Wrap toggle (shown when any line exceeds 50 chars) -->
                        <button
                            v-if="hasLongLines"
                            class="text-gray-400 hover:text-gray-600 px-1 py-0.5 rounded-sm hover:bg-gray-200"
                            title="Toggle word wrap"
                            @click.stop="wrapped = !wrapped"
                        >Wrap</button>
                        <!-- Prettify button (shown when value looks like JSON) -->
                        <button
                            v-if="canPrettify && !prettified"
                            class="text-gray-400 hover:text-gray-600 px-1 py-0.5 rounded-sm hover:bg-gray-200"
                            title="Pretty-print JSON and re-diff"
                            @click.stop="prettify"
                        >Prettify</button>
                        <button
                            v-if="prettified"
                            class="text-blue-500 hover:text-blue-700 px-1 py-0.5 rounded-sm hover:bg-blue-50"
                            title="Show raw values"
                            @click.stop="unprettify"
                        >Raw</button>
                    </template>
                    <span class="text-gray-400">{{ changeSummary }}</span>
                </span>
            </div>
            <div v-show="!collapsed" class="font-mono">
                <div class="diff-scroll-container" :class="{ 'diff-wrap': wrapped }">
                    <div class="diff-content">
                        <template v-for="(line, i) in lines" :key="i">
                            <!-- Collapsed unchanged section -->
                            <div
                                v-if="line.type === 'collapsed'"
                                class="flex leading-5 text-blue-600 bg-blue-50 cursor-pointer hover:bg-blue-100 select-none border-y border-blue-100"
                                @click="expandSection(i)"
                            >
                                <span class="line-num border-r border-blue-200 text-blue-400" />
                                <span class="line-num border-r border-blue-200 text-blue-400" />
                                <span class="px-3 flex-1 text-center">&#8597; {{ line.count }} unchanged line{{ line.count === 1 ? '' : 's' }}</span>
                            </div>
                            <!-- Diff line -->
                            <div
                                v-else
                                :class="lineClass(line)"
                                :data-change="line.type !== 'unchanged' || undefined"
                                class="flex leading-5"
                            >
                                <span class="line-num border-r select-none shrink-0" :class="lineNumClass(line)">{{ line.oldNum || '' }}</span>
                                <span class="line-num border-r select-none shrink-0" :class="lineNumClass(line)">{{ line.newNum || '' }}</span>
                                <span class="px-2" :class="wrapped ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'">{{ linePrefix(line) }}<span
                                    v-for="(seg, s) in lineSegments(line)"
                                    :key="s"
                                    :class="seg.changed ? changedTextClass(line) : null"
                                >{{ seg.text }}</span></span>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script>
import { diffLines, diffWordsWithSpace } from 'diff'

import DiffValuePill from '../diff/DiffValuePill.vue'

const CONTEXT = 3
const LONG_LINE_THRESHOLD = 50
const MAX_WORD_EDITS = 200

export default {
    name: 'SnapshotDiffChangePanel',
    components: { DiffValuePill },
    props: {
        prop: { type: String, default: '' },
        label: { type: String, default: null },
        value1: { type: [String, Number, Boolean, Array, Object], default: undefined },
        value2: { type: [String, Number, Boolean, Array, Object], default: undefined },
        compact: { type: Boolean, default: false },
        initiallyExpanded: { type: Boolean, default: true }
    },
    data () {
        return { lines: [], collapsed: !this.initiallyExpanded, wrapped: false, prettified: false }
    },
    computed: {
        changeSummary () {
            const added = this.lines.filter(l => l.type === 'added').length
            const removed = this.lines.filter(l => l.type === 'removed').length
            if (added && removed) return `+${added} -${removed}`
            if (added) return `+${added}`
            if (removed) return `-${removed}`
            return ''
        },
        hasLongLines () {
            return this.lines.some(l => l.text && l.text.length > LONG_LINE_THRESHOLD)
        },
        canPrettify () {
            return this.looksLikeJson(this.value1) || this.looksLikeJson(this.value2)
        },
        compactSegments () {
            const segments = []

            // Wires: array-of-arrays → show per output port, one badge per node
            if (Array.isArray(this.value1) || Array.isArray(this.value2)) {
                const w1 = Array.isArray(this.value1) ? this.value1 : []
                const w2 = Array.isArray(this.value2) ? this.value2 : []
                const len = Math.max(w1.length, w2.length)
                for (let i = 0; i < len; i++) {
                    if (i > 0) segments.push({ type: 'sep' })
                    const nodes1 = Array.isArray(w1[i]) ? w1[i] : (w1[i] ? [w1[i]] : [])
                    const nodes2 = Array.isArray(w2[i]) ? w2[i] : (w2[i] ? [w2[i]] : [])
                    const s1 = nodes1.join(',')
                    const s2 = nodes2.join(',')
                    if (s1 === s2) {
                        if (nodes1.length === 0) {
                            segments.push({ type: 'value', kind: 'unchanged', text: '(none)' })
                        } else {
                            nodes1.forEach((node, idx) => {
                                if (idx > 0) segments.push({ type: 'nodesep' })
                                segments.push({ type: 'value', kind: 'unchanged', text: node })
                            })
                        }
                    } else {
                        nodes1.forEach((node, idx) => {
                            if (idx > 0) segments.push({ type: 'nodesep' })
                            segments.push({ type: 'value', kind: 'removed', text: node })
                        })
                        if (nodes1.length && nodes2.length) segments.push({ type: 'arrow' })
                        nodes2.forEach((node, idx) => {
                            if (idx > 0) segments.push({ type: 'nodesep' })
                            segments.push({ type: 'value', kind: 'added', text: node })
                        })
                    }
                }
                if (!segments.length) segments.push({ type: 'value', kind: 'unchanged', text: '(empty)' })
                return segments
            }

            // Scalar / object
            const f1 = this.formatCompact(this.value1)
            const f2 = this.formatCompact(this.value2)
            if (f1 === f2) {
                segments.push({ type: 'value', kind: 'unchanged', text: f1 || '—' })
            } else {
                if (f1) segments.push({ type: 'value', kind: 'removed', text: f1 })
                if (f1 && f2) segments.push({ type: 'arrow' })
                if (f2) segments.push({ type: 'value', kind: 'added', text: f2 })
            }
            return segments
        }
    },
    watch: {
        value1: { immediate: true, handler: 'rebuildLines' },
        value2: 'rebuildLines',
        initiallyExpanded (val) {
            if (!this.compact) this.collapsed = !val
        }
    },
    methods: {
        rebuildLines () {
            if (!this.compact) {
                this.prettified = false
                this.lines = this.buildLines(this.value1, this.value2)
            }
        },
        looksLikeJson (v) {
            if (typeof v === 'string' && v.length >= 2) {
                const trimmed = v.trim()
                const first = trimmed[0]
                const last = trimmed[trimmed.length - 1]
                return (first === '{' && last === '}') || (first === '[' && last === ']')
            }
            return false
        },
        tryPrettify (v) {
            if (this.looksLikeJson(v)) {
                try { return JSON.stringify(JSON.parse(v), null, 2) } catch (_) { /* not valid JSON */ }
            }
            return null
        },
        prettify () {
            const p1 = this.tryPrettify(this.value1)
            const p2 = this.tryPrettify(this.value2)
            if (p1 !== null || p2 !== null) {
                this.prettified = true
                this.lines = this.buildLines(
                    p1 !== null ? p1 : this.value1,
                    p2 !== null ? p2 : this.value2
                )
                this.collapsed = false
            }
        },
        unprettify () {
            this.prettified = false
            this.lines = this.buildLines(this.value1, this.value2)
        },
        buildLines (v1Raw, v2Raw) {
            const v1 = this.stringify(v1Raw)
            const v2 = this.stringify(v2Raw)

            if (!v1.includes('\n') && !v2.includes('\n')) {
                const result = []
                if (v1 !== '') result.push({ type: 'removed', text: v1, oldNum: 1, newNum: null })
                if (v2 !== '') result.push({ type: 'added', text: v2, oldNum: null, newNum: 1 })
                return this.markChangedText(result)
            }

            const flat = []
            let oldNum = 1
            let newNum = 1
            for (const part of diffLines(v1, v2)) {
                const type = part.added ? 'added' : part.removed ? 'removed' : 'unchanged'
                for (const text of part.value.replace(/\n$/, '').split('\n')) {
                    if (type === 'removed') flat.push({ type, text, oldNum: oldNum++, newNum: null })
                    else if (type === 'added') flat.push({ type, text, oldNum: null, newNum: newNum++ })
                    else flat.push({ type, text, oldNum: oldNum++, newNum: newNum++ })
                }
            }
            return this.collapseContext(this.markChangedText(flat))
        },
        // Pairs each removed line with the added line that replaced it and marks the words that differ,
        // so only those are highlighted instead of the whole line. Runs of different lengths can't be
        // paired by position reliably, so their lines stay fully highlighted
        markChangedText (flat) {
            let i = 0
            while (i < flat.length) {
                if (flat[i].type !== 'removed') {
                    i++
                    continue
                }
                let removedEnd = i
                while (removedEnd < flat.length && flat[removedEnd].type === 'removed') removedEnd++
                let addedEnd = removedEnd
                while (addedEnd < flat.length && flat[addedEnd].type === 'added') addedEnd++
                const removedCount = removedEnd - i
                if (removedCount === addedEnd - removedEnd) {
                    for (let k = 0; k < removedCount; k++) {
                        this.markLinePair(flat[i + k], flat[removedEnd + k])
                    }
                }
                i = addedEnd
            }
            return flat
        },
        markLinePair (removedLine, addedLine) {
            // JSON properties with different keys are different lines, even when their values match
            if (this.jsonKey(removedLine.text) !== this.jsonKey(addedLine.text)) {
                return
            }
            // The word diff is quadratic for very different lines, so give up past MAX_WORD_EDITS and
            // keep the whole line highlighted
            const parts = diffWordsWithSpace(removedLine.text, addedLine.text, { maxEditLength: MAX_WORD_EDITS })
            if (!parts) {
                return
            }
            const sharedText = parts.filter(part => !part.added && !part.removed).map(part => part.value).join('')
            // Lines sharing only whitespace and punctuation are a full replacement, so keep the whole line highlighted
            if (!/[\p{L}\p{N}]/u.test(sharedText)) {
                return
            }
            removedLine.segments = parts
                .filter(part => !part.added)
                .map(part => ({ text: part.value, changed: !!part.removed }))
            addedLine.segments = parts
                .filter(part => !part.removed)
                .map(part => ({ text: part.value, changed: !!part.added }))
        },
        jsonKey (text) {
            const match = text.match(/^\s*"((?:[^"\\]|\\.)*)"\s*:/)
            return match ? match[1] : null
        },
        collapseContext (flat) {
            const result = []
            let i = 0
            while (i < flat.length) {
                if (flat[i].type !== 'unchanged') {
                    result.push(flat[i++])
                    continue
                }
                let j = i
                while (j < flat.length && flat[j].type === 'unchanged') j++
                const count = j - i
                const isLeading = i === 0
                const isTrailing = j === flat.length

                if (count <= CONTEXT * 2) {
                    for (let k = i; k < j; k++) result.push(flat[k])
                } else if (isLeading) {
                    const hidden = flat.slice(i, j - CONTEXT)
                    result.push({ type: 'collapsed', count: hidden.length, hiddenLines: hidden })
                    for (let k = j - CONTEXT; k < j; k++) result.push(flat[k])
                } else if (isTrailing) {
                    for (let k = i; k < i + CONTEXT; k++) result.push(flat[k])
                    const hidden = flat.slice(i + CONTEXT, j)
                    if (hidden.length) result.push({ type: 'collapsed', count: hidden.length, hiddenLines: hidden })
                } else {
                    for (let k = i; k < i + CONTEXT; k++) result.push(flat[k])
                    const hidden = flat.slice(i + CONTEXT, j - CONTEXT)
                    result.push({ type: 'collapsed', count: hidden.length, hiddenLines: hidden })
                    for (let k = j - CONTEXT; k < j; k++) result.push(flat[k])
                }
                i = j
            }
            return result
        },
        expandSection (index) {
            this.lines.splice(index, 1, ...this.lines[index].hiddenLines)
        },
        formatCompact (v) {
            if (v === undefined || v === null) return ''
            if (typeof v === 'object' && 'x' in v && 'y' in v) return `(${v.x}, ${v.y})`
            if (typeof v === 'object') return JSON.stringify(v)
            return String(v)
        },
        stringify (v) {
            if (v === undefined || v === null) return ''
            if (typeof v === 'object') return JSON.stringify(v, null, 2)
            return String(v)
        },
        lineClass (line) {
            if (line.type === 'added') return 'diff-line-added'
            if (line.type === 'removed') return 'diff-line-removed'
            return 'text-gray-400'
        },
        lineSegments (line) {
            return line.segments ?? [{ text: line.text, changed: false }]
        },
        changedTextClass (line) {
            if (line.type === 'added') return 'diff-word-added'
            return 'diff-word-removed'
        },
        lineNumClass (line) {
            if (line.type === 'added') return 'diff-num-added'
            if (line.type === 'removed') return 'diff-num-removed'
            return 'bg-gray-50 text-gray-400 border-gray-200'
        },
        linePrefix (line) {
            if (line.type === 'added') return '+'
            if (line.type === 'removed') return '-'
            return ' '
        }
    }
}
</script>

<style scoped>
.diff-line-added {
    background-color: var(--ff-color-diff-added-line-bg);
}
.diff-line-removed {
    background-color: var(--ff-color-diff-removed-line-bg);
}
.diff-num-added {
    background-color: var(--ff-color-diff-added-num-bg);
    border-color: transparent;
}
.diff-num-removed {
    background-color: var(--ff-color-diff-removed-num-bg);
    border-color: transparent;
}
.diff-word-added {
    background-color: var(--ff-color-diff-added-word-bg);
    border-radius: 0.2rem;
}
.diff-word-removed {
    background-color: var(--ff-color-diff-removed-word-bg);
    border-radius: 0.2rem;
}
.line-num {
    display: inline-block;
    width: 3rem;
    min-width: 3rem;
    text-align: right;
    padding: 0 0.4rem;
    user-select: none;
}
.diff-scroll-container {
    overflow-x: auto;
    padding-bottom: 0.5rem;
}
.diff-scroll-container:not(.diff-wrap) .diff-content {
    width: max-content;
    min-width: 100%;
}
.diff-scroll-container:not(.diff-wrap) .diff-content > div {
    min-width: 100%;
}
</style>
