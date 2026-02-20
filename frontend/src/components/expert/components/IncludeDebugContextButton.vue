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
import { mapActions, mapState } from 'vuex'

import { pluralize } from '../../../composables/String.js'

import ContextChip from './ContextChip/index.vue'

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
        ...mapState('product/assistant', ['debugLog']),
        selectedCounter () {
            return this.debugLog.length
        },
        selectionTitle () {
            const map = {}
            this.debugLog.forEach(n => {
                map[n.type] = (map[n.type] ?? 0) + 1
            })

            const list = this.debugLog.map(entry => entry.metadata ? `${entry.metadata.date} ${entry.metadata.name} ${entry.metadata.topic}` : (entry.id || 'debug')).join('\n')

            return `Selected Logs: \n${list}`
        }
    },
    methods: {
        ...mapActions('product/assistant', ['resetDebugLogContext']),
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
