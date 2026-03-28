<template>
    <div class="font-mono text-xs border-b border-gray-200 overflow-hidden">
        <div class="px-3 py-1 text-xs bg-gray-50 border-b border-gray-100 text-gray-500 sticky top-0 flex items-center gap-1">
            <span>property</span>
            <span class="font-semibold text-gray-700">{{ prop }}</span>
        </div>
        <div ref="content">
            <template v-for="(line, i) in lines" :key="i">
                <!-- Collapsed unchanged section -->
                <div
                    v-if="line.type === 'collapsed'"
                    class="flex leading-5 text-blue-600 bg-blue-50 cursor-pointer hover:bg-blue-100 select-none border-y border-blue-100"
                    @click="expandSection(i)"
                >
                    <span class="line-num border-r border-blue-200 text-blue-400" />
                    <span class="line-num border-r border-blue-200 text-blue-400" />
                    <span class="px-3 flex-1 text-center">&#8597; {{ line.count }} unchanged lines</span>
                </div>
                <!-- Diff line -->
                <div
                    v-else
                    :class="lineClass(line)"
                    :data-change="line.type !== 'unchanged' || undefined"
                    class="flex leading-5"
                >
                    <span class="line-num border-r select-none" :class="lineNumClass(line)">{{ line.oldNum || '' }}</span>
                    <span class="line-num border-r select-none" :class="lineNumClass(line)">{{ line.newNum || '' }}</span>
                    <span class="px-2 whitespace-pre flex-1">{{ linePrefix(line) }}{{ line.text }}</span>
                </div>
            </template>
        </div>
    </div>
</template>

<script>
import { diffLines } from 'diff'

const CONTEXT = 3

export default {
    name: 'SnapshotDiffChangePanel',
    props: {
        prop: { type: String, default: '' },
        value1: { default: undefined },
        value2: { default: undefined },
        autoScrollToFirst: { type: Boolean, default: false }
    },
    data () {
        return { lines: [] }
    },
    watch: {
        value1: { immediate: true, handler: 'rebuildLines' },
        value2: 'rebuildLines'
    },
    mounted () {
        if (this.autoScrollToFirst) {
            this.$nextTick(this.scrollToFirstChange)
        }
    },
    methods: {
        rebuildLines () {
            this.lines = this.buildLines()
        },
        buildLines () {
            const v1 = this.stringify(this.value1)
            const v2 = this.stringify(this.value2)

            // Single-line: just show before/after without line numbers
            if (!v1.includes('\n') && !v2.includes('\n')) {
                const result = []
                if (v1 !== '') result.push({ type: 'removed', text: v1, oldNum: 1, newNum: null })
                if (v2 !== '') result.push({ type: 'added', text: v2, oldNum: null, newNum: 1 })
                return result
            }

            // Flatten diffLines parts into per-line objects with line numbers
            const flat = []
            let oldNum = 1
            let newNum = 1
            for (const part of diffLines(v1, v2)) {
                const type = part.added ? 'added' : part.removed ? 'removed' : 'unchanged'
                for (const text of part.value.replace(/\n$/, '').split('\n')) {
                    if (type === 'removed') {
                        flat.push({ type, text, oldNum: oldNum++, newNum: null })
                    } else if (type === 'added') {
                        flat.push({ type, text, oldNum: null, newNum: newNum++ })
                    } else {
                        flat.push({ type, text, oldNum: oldNum++, newNum: newNum++ })
                    }
                }
            }

            return this.collapseContext(flat)
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
            // Replace the collapsed marker with the actual line objects (which already have line numbers)
            this.lines.splice(index, 1, ...this.lines[index].hiddenLines)
        },
        scrollToFirstChange () {
            this.$refs.content?.querySelector('[data-change]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        },
        stringify (v) {
            if (v === undefined || v === null) return ''
            if (typeof v === 'object') return JSON.stringify(v, null, 2)
            return String(v)
        },
        lineClass (line) {
            if (line.type === 'added') return 'bg-green-50 text-green-800'
            if (line.type === 'removed') return 'bg-red-50 text-red-800'
            return 'text-gray-400'
        },
        lineNumClass (line) {
            if (line.type === 'added') return 'bg-green-100 text-green-600 border-green-200'
            if (line.type === 'removed') return 'bg-red-100 text-red-500 border-red-200'
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
.line-num {
    display: inline-block;
    width: 3rem;
    min-width: 3rem;
    text-align: right;
    padding: 0 0.4rem;
    user-select: none;
}
</style>
