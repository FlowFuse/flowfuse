<template>
    <teleport to="body">
        <div
            ref="panel" class="cell-viewer" data-el="cell-viewer"
            :style="{ top: position.top + 'px', left: position.left + 'px' }"
        >
            <header class="cell-viewer--header">
                <span class="cell-viewer--column" data-el="cell-viewer-column">{{ column }}</span>
                <span class="cell-viewer--type" :title="type" data-el="cell-viewer-type">{{ typeLabel }}</span>
                <TextCopier v-if="detail.copy !== null" :text="detail.copy" :show-text="false" title="Copy" data-action="copy-cell-value" />
            </header>
            <pre class="cell-viewer--value" :class="`cell-viewer--value-${detail.kind}`" data-el="cell-viewer-value">{{ detail.text }}</pre>
            <p v-if="detail.note" class="cell-viewer--note" data-el="cell-viewer-note">{{ detail.note }}</p>
        </div>
    </teleport>
</template>

<script>
import { defineComponent } from 'vue'

import TextCopier from '@/components/TextCopier.vue'
import { formatCellDetail } from '@/utils/tables/cellValues.ts'
import { getColumnTypeLabel } from '@/utils/tables/columnTypes.ts'

// the space kept between the panel and its cell, and between the panel and the edge of the window
const GAP = 4
const EDGE = 8

export default defineComponent({
    name: 'CellViewer',
    components: { TextCopier },
    props: {
        // the cell the panel opens next to
        anchor: {
            type: Object,
            required: true
        },
        column: {
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
    emits: ['close'],
    data () {
        return {
            position: { top: 0, left: 0 }
        }
    },
    computed: {
        detail () {
            return formatCellDetail(this.value, this.type, { original: this.showOriginal })
        },
        typeLabel () {
            return getColumnTypeLabel(this.type)
        }
    },
    mounted () {
        this.updatePosition()
        // caught on the way down, so the click that opened the panel is not taken for one outside it
        document.addEventListener('click', this.onClick, true)
        document.addEventListener('keydown', this.onKeydown)
        window.addEventListener('resize', this.close)
        window.addEventListener('scroll', this.onScroll, true)
    },
    beforeUnmount () {
        document.removeEventListener('click', this.onClick, true)
        document.removeEventListener('keydown', this.onKeydown)
        window.removeEventListener('resize', this.close)
        window.removeEventListener('scroll', this.onScroll, true)
    },
    methods: {
        close () {
            this.$emit('close')
        },
        onClick (event) {
            // a click on the cell itself is left to the cell, which closes the panel
            if (this.$refs.panel.contains(event.target) || this.anchor.contains(event.target)) return
            this.close()
        },
        onKeydown (event) {
            if (event.key === 'Escape') this.close()
        },
        onScroll (event) {
            // the grid moving takes the cell away from the panel, a long value scrolling inside it does not
            if (!this.$refs.panel.contains(event.target)) this.close()
        },
        updatePosition () {
            const cell = this.anchor.getBoundingClientRect()
            const panel = this.$refs.panel.getBoundingClientRect()
            // below the cell and lined up with its left edge, unless that runs off the window
            let top = cell.bottom + GAP
            if (top + panel.height > window.innerHeight - EDGE) {
                top = cell.top - panel.height - GAP
            }
            const left = Math.min(cell.left, window.innerWidth - panel.width - EDGE)
            this.position = { top: Math.max(EDGE, top), left: Math.max(EDGE, left) }
        }
    }
})
</script>

<style scoped lang="scss">
.cell-viewer {
    position: fixed;
    z-index: 200;
    width: max-content;
    min-width: 240px;
    max-width: min(480px, calc(100vw - 16px));
    background: var(--ff-color-bg-surface);
    border: 1px solid var(--ff-color-border);
    border-radius: 6px;
    box-shadow: 0 4px 12px rgb(0 0 0 / 15%);
    font-size: 0.875rem;

    &--header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 6px 12px;
        border-bottom: 1px solid var(--ff-color-border);
    }

    &--column {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 600;
    }

    &--type {
        color: var(--ff-color-text-muted);
        font-size: 0.75rem;
        white-space: nowrap;
    }

    &--value {
        margin: 0;
        padding: 12px;
        max-height: 320px;
        overflow: auto;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        font-family: inherit;

        &-json, &-uuid, &-binary {
            font-family: monospace;
        }

        &-empty {
            color: var(--ff-color-text-disabled);
            font-style: italic;
        }
    }

    &--note {
        padding: 6px 12px;
        border-top: 1px solid var(--ff-color-border);
        color: var(--ff-color-text-muted);
        font-size: 0.75rem;
    }
}
</style>
