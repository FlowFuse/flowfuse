<template>
    <div class="font-mono text-xs border border-gray-200 rounded bg-gray-50 overflow-hidden mt-2">
        <div class="px-2 py-1 text-xs text-gray-500 bg-gray-100 border-b border-gray-200 flex items-center gap-1">
            <span>property</span>
            <span class="font-semibold text-gray-700">{{ prop }}</span>
        </div>
        <div class="overflow-auto max-h-64">
            <div
                v-for="(part, i) in parts"
                :key="i"
                :class="lineClass(part)"
                class="px-3 leading-5 whitespace-pre"
            >{{ linePrefix(part) }}{{ part.value }}</div>
        </div>
    </div>
</template>

<script>
import { diffLines } from 'diff'

export default {
    name: 'SnapshotDiffChangePanel',
    props: {
        prop: {
            type: String,
            default: ''
        },
        value1: {
            default: undefined
        },
        value2: {
            default: undefined
        }
    },
    computed: {
        parts () {
            const v1 = this.stringify(this.value1)
            const v2 = this.stringify(this.value2)
            // Use line diff for multiline values, otherwise show a simple 2-line before/after
            if (v1.includes('\n') || v2.includes('\n')) {
                return diffLines(v1, v2)
            }
            const parts = []
            if (v1 !== '') parts.push({ value: v1, removed: true, added: false })
            if (v2 !== '') parts.push({ value: v2, added: true, removed: false })
            return parts
        }
    },
    methods: {
        stringify (v) {
            if (v === undefined || v === null) return ''
            if (typeof v === 'object') return JSON.stringify(v, null, 2)
            return String(v)
        },
        lineClass (part) {
            if (part.added) return 'bg-green-50 text-green-800'
            if (part.removed) return 'bg-red-50 text-red-800'
            return 'text-gray-500'
        },
        linePrefix (part) {
            if (part.added) return '+ '
            if (part.removed) return '- '
            return '  '
        }
    }
}
</script>
