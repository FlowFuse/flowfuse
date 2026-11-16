<template>
    <span class="table-cell" :class="`table-cell--${cell.kind}`" :title="cell.original" data-el="table-cell">
        <span v-if="cell.kind === 'boolean'" class="pill" :class="`pill--${cell.text}`">{{ cell.text }}</span>
        <template v-else>{{ cell.text }}</template>
    </span>
</template>

<script>
import { defineComponent } from 'vue'

import { formatCellValue } from '@/utils/tables/cellValues.ts'

export default defineComponent({
    name: 'TableCell',
    props: {
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
    max-width: 320px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

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
