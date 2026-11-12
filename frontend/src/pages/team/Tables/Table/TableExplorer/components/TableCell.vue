<template>
    <span
        ref="cell" class="table-cell" :class="[`table-cell--${cell.kind}`, { 'table-cell--open': isOpen }]"
        :title="cell.original" data-el="table-cell" @click="isOpen = !isOpen"
    >
        <span v-if="cell.kind === 'boolean'" class="pill" :class="`pill--${cell.text}`">{{ cell.text }}</span>
        <template v-else>{{ cell.text }}</template>
        <CellViewer
            v-if="isOpen" :anchor="$refs.cell" :column="name" :value="value" :type="type" :show-original="showOriginal"
            @close="isOpen = false"
        />
    </span>
</template>

<script>
import { defineComponent } from 'vue'

import CellViewer from './CellViewer.vue'

import { formatCellValue } from '@/utils/tables/cellValues.ts'

export default defineComponent({
    name: 'TableCell',
    components: { CellViewer },
    props: {
        // the name of the column the value belongs to
        name: {
            type: String,
            default: ''
        },
        value: {
            type: null,
            default: null
        },
        type: {
            type: String,
            default: ''
        },
        showOriginal: {
            type: Boolean,
            default: false
        }
    },
    data () {
        return {
            isOpen: false
        }
    },
    computed: {
        cell () {
            return formatCellValue(this.value, this.type, { original: this.showOriginal })
        }
    }
})
</script>

<style scoped lang="scss">
.table-cell {
    display: block;
    max-width: 344px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    // fills the whole table cell, so a click anywhere in it opens the value
    margin: -12px;
    padding: 12px;
    cursor: pointer;

    &:hover, &--open {
        background: var(--ff-color-bg-emphasis);
    }

    // the cell whose value is open keeps a frame, so it is clear what the panel belongs to
    &--open {
        box-shadow: inset 0 0 0 1px var(--ff-color-border-accent);
    }

    &--empty {
        color: var(--ff-color-text-disabled);
        font-style: italic;
    }

    &--number {
        text-align: right;
        font-variant-numeric: tabular-nums;
    }

    &--json, &--uuid, &--binary {
        font-family: monospace;
    }

    // a cut off id is of no use to anyone
    &--uuid {
        max-width: none;
    }

    .pill {
        display: inline-block;
        padding: 0 8px;
        border-radius: 9999px;
        font-size: 0.75rem;
        line-height: 1.25rem;
        background: var(--ff-color-bg-emphasis);
        color: var(--ff-color-text-muted);

        &--true {
            background: var(--ff-color-status-success-bg);
            color: var(--ff-color-status-success-text);
        }
    }
}
</style>
