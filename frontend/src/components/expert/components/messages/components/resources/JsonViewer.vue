<template>
    <div class="json-viewer">
        <div v-if="label || hasLongLines" class="json-viewer__header">
            <span v-if="label" class="json-viewer__label">{{ label }}</span>
            <ff-button
                v-if="hasLongLines"
                :kind="wrapped ? 'secondary' : 'tertiary'"
                size="small"
                class="json-viewer__wrap-toggle"
                :title="wrapped ? 'Word wrap on' : 'Word wrap off'"
                @click="wrapped = !wrapped"
            >
                Wrap
            </ff-button>
        </div>
        <div class="json-viewer__scroll" :class="{ 'json-viewer__scroll--wrap': wrapped }">
            <pre class="json-viewer__content">{{ text }}</pre>
        </div>
    </div>
</template>

<script>
// Single-value JSON viewer with prettify + word-wrap, mirroring the presentation
// of the snapshot comparison diff panel (SnapshotDiffChangePanel) without its
// two-sided diff machinery — used for read-only payloads such as the tool
// approval card's call parameters. The wrap toggle only appears when a line is
// long enough to overflow horizontally.
const LONG_LINE_THRESHOLD = 50

export default {
    name: 'JsonViewer',
    props: {
        value: {
            type: [Object, Array, String, Number, Boolean],
            default: undefined
        },
        label: {
            type: String,
            default: null
        }
    },
    data () {
        return { wrapped: false }
    },
    computed: {
        // Prettified JSON for objects/arrays, plain string for scalars — the same
        // stringify the snapshot diff panel uses.
        text () {
            const v = this.value
            if (v === undefined || v === null) return ''
            if (typeof v === 'object') return JSON.stringify(v, null, 2)
            return String(v)
        },
        hasLongLines () {
            return this.text.split('\n').some(line => line.length > LONG_LINE_THRESHOLD)
        }
    }
}
</script>

<style scoped lang="scss">
.json-viewer {
    border: 1px solid var(--ff-color-border);
    border-radius: 4px;
    overflow: hidden;
    background: var(--ff-color-bg-surface);
}

.json-viewer__header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 8px;
    background: var(--ff-color-bg-emphasis);
    border-bottom: 1px solid var(--ff-color-border);
}

.json-viewer__label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--ff-color-text-subtle);
}

.json-viewer__wrap-toggle {
    margin-left: auto;
}

.json-viewer__scroll {
    overflow-x: auto;
}

.json-viewer__content {
    margin: 0;
    padding: 8px;
    font-family: monospace;
    font-size: 0.8125rem;
    white-space: pre;
}

.json-viewer__scroll--wrap .json-viewer__content {
    white-space: pre-wrap;
    word-break: break-all;
}
</style>
