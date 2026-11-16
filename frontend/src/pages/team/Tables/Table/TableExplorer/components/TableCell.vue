<template>
    <span
        ref="cell" class="table-cell" :class="[`table-cell--${cell.kind}`, { 'table-cell--open': isOpen }]"
        :title="cell.original" data-el="table-cell"
        role="button" :aria-expanded="isOpen" :tabindex="isTabStop ? 0 : -1"
        @click="onClick" @focus="grid.tabStop = id"
        @keydown.enter.self.prevent="toggle({ focusViewer: true })"
        @keydown.space.self.prevent="toggle({ focusViewer: true })"
    >
        <span v-if="cell.kind === 'boolean'" class="pill" :class="`pill--${cell.text}`">{{ cell.text }}</span>
        <template v-else>{{ cell.text }}</template>
        <CellViewer
            v-if="isOpen" :anchor="$refs.cell" :column="name" :value="value" :type="type" :show-original="showOriginal"
            :take-focus="focusViewer" @close="isOpen = false"
        />
    </span>
</template>

<script>
import { defineComponent, reactive } from 'vue'

import CellViewer from './CellViewer.vue'

import { formatCellValue } from '@/utils/tables/cellValues.ts'

export default defineComponent({
    name: 'TableCell',
    components: { CellViewer },
    inject: {
        // shared by the cells of a grid, which is one stop for the Tab key: the cell that last had focus
        grid: { default: () => reactive({ tabStop: null }) }
    },
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
            isOpen: false,
            // opened from the keyboard, so focus goes to the value's copy button
            focusViewer: false
        }
    },
    computed: {
        cell () {
            return formatCellValue(this.value, this.type, { original: this.showOriginal })
        },
        id () {
            return this.$.uid
        },
        isTabStop () {
            return this.grid.tabStop === this.id
        }
    },
    beforeUnmount () {
        if (this.isTabStop) this.grid.tabStop = null
    },
    methods: {
        onClick () {
            // selecting text by dragging over it ends in a click too, which is not a request to open the value
            if (!window.getSelection().isCollapsed) return
            this.toggle({ focusViewer: false })
        },
        toggle ({ focusViewer }) {
            this.focusViewer = focusViewer
            this.isOpen = !this.isOpen
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

    &:focus-visible {
        outline: none;
        box-shadow: inset 0 0 0 2px var(--ff-color-focus);
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
