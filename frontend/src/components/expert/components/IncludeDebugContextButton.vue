<template>
    <ContextChip
        class="flow-selection-button"
        :modelValue="modelValue"
        @toggle="toggleSelection"
    >
        <template #text>
            <span>Debug</span>
            <span class="counter italic" :title="selectionTitle">( {{ selectedCounter }} {{ pluralize('log', selectedCounter) }} )</span>
        </template>
    </ContextChip>
</template>

<script>
import { mapActions, mapState } from 'pinia'

import { pluralize } from '../../../composables/String.js'

import ContextChip from './ContextChip/index.vue'

import { useProductAssistantStore } from '@/stores/product-assistant.js'

export default {
    name: 'IncludeDebugContextButton',
    components: {
        ContextChip
    },
    props: {
        modelValue: {
            type: Boolean,
            required: false,
            default: true
        }
    },
    emits: ['update:modelValue'],
    computed: {
        ...mapState(useProductAssistantStore, ['debugLog']),
        selectedCounter () {
            return this.debugLog.length
        },
        selectionTitle () {
            const map = {}
            this.debugLog.forEach(n => {
                map[n.type] = (map[n.type] ?? 0) + 1
            })

            const tipBuilder = (logEntry, index) => {
                logEntry = logEntry || {}
                const level = logEntry.level || ''
                const nonDebugLevel = level !== 'debug' ? level : ''
                const topic = logEntry.metadata?.topic || ''
                const name = logEntry.source?.name || logEntry.source?.id || logEntry.metadata?.path || ''
                const format = logEntry.metadata?.format || ''
                const type = logEntry.source?.type || ''
                const property = logEntry.metadata?.property || ''
                const strBuilder = []
                if (name) strBuilder.push(`node: ${name}`)
                if (topic) strBuilder.push(`topic: ${topic}`)
                if (nonDebugLevel) {
                    if (type) {
                        strBuilder.push(`${type} : (${nonDebugLevel})`)
                    }
                }
                if (property) {
                    if (format) {
                        strBuilder.push(`property: ${property} ${format}`)
                    } else {
                        strBuilder.push(`property: ${property}`)
                    }
                }
                return `${index + 1}: ${strBuilder.join(', ')}`
            }

            const list = this.debugLog.map(tipBuilder).join('\n')

            return `Selected Logs: \n${list}`
        }
    },
    methods: {
        ...mapActions(useProductAssistantStore, ['resetDebugLogContext']),
        pluralize,
        toggleSelection () {
            this.$emit('update:modelValue', !this.modelValue)
            this.resetDebugLogContext()
        }
    }
}
</script>

<style lang="scss">
.flow-selection-button {
    .text {
        .counter {
            color: $ff-grey-500;
            margin-left: 4px;
            font-size: $ff-funit-xs;
        }
    }
}
</style>
