<template>
    <ContextChip
        class="flow-selection-button"
        :modelValue="modelValue"
        @toggle="toggleSelection"
    >
        <template #text>
            <span>Selection</span>
            <span class="counter italic" :title="selectionTitle">( {{ selectedCounter }} {{ pluralize('node', selectedCounter) }} )</span>
        </template>
    </ContextChip>
</template>

<script>
import { mapActions, mapState } from 'vuex'

import { pluralize } from '../../../composables/String.js'

import ContextChip from './ContextChip/index.vue'

export default {
    name: 'IncludeSelectionButton',
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
        ...mapState('product/assistant', ['selectedNodes']),
        filteredSelectedNodes () {
            return this.selectedNodes.filter(n => !['global-config'].includes(n.type))
        },
        selectedCounter () {
            return this.filteredSelectedNodes.length
        },
        selectionTitle () {
            const map = {}
            this.filteredSelectedNodes.forEach(n => {
                map[n.type] = (map[n.type] ?? 0) + 1
            })

            const nodesList = Object.keys(map).map(k => `${map[k]} x ${k}`).join('\n')

            return `Selected nodes: \n${nodesList}`
        }
    },
    methods: {
        ...mapActions('product/assistant', ['setSelectedNodes']),
        pluralize,
        toggleSelection () {
            this.$emit('update:modelValue', !this.modelValue)
            this.setSelectedNodes([])
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
