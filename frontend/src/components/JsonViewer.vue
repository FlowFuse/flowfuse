<template>
    <div class="json-viewer">
        <div v-if="showHeader" class="json-viewer__header">
            <ff-button
                v-if="collapsible"
                kind="tertiary"
                size="small"
                class="json-viewer__collapse-toggle"
                :title="collapsed ? 'Expand' : 'Collapse'"
                @click="collapsed = !collapsed"
            >
                <template #icon-left>
                    <ChevronRightIcon
                        class="json-viewer__caret"
                        :class="{ 'json-viewer__caret--open': !collapsed }"
                    />
                </template>
                {{ label || 'Payload' }}
            </ff-button>
            <span v-else-if="label" class="json-viewer__label">{{ label }}</span>
            <ff-button
                v-if="hasLongLines && !collapsed"
                :kind="wrapped ? 'secondary' : 'tertiary'"
                size="small"
                class="json-viewer__wrap-toggle"
                :title="wrapped ? 'Word wrap on' : 'Word wrap off'"
                @click="wrapped = !wrapped"
            >
                Wrap
            </ff-button>
        </div>
        <div
            v-show="!collapsed"
            class="json-viewer__scroll"
            :class="{ 'json-viewer__scroll--wrap': wrapped }"
        >
            <pre class="json-viewer__content">{{ text }}</pre>
        </div>
    </div>
</template>

<script>
// Read-only single-value JSON viewer with prettify, word-wrap and optional collapse,
// following the presentation of SnapshotDiffChangePanel without its two-sided diff
// machinery. Used for payloads such as the tool approval card's call parameters.
import { ChevronRightIcon } from '@heroicons/vue/20/solid'

const LONG_LINE_THRESHOLD = 50

// Stringify that never throws — if the payload can't be serialised for any
// reason, show a plain error instead of breaking the surrounding card.
function safeStringify (value) {
    try {
        return JSON.stringify(value, null, 2)
    } catch (err) {
        return 'Could not display the payload.'
    }
}

export default {
    name: 'JsonViewer',
    components: { ChevronRightIcon },
    props: {
        value: {
            type: [Object, Array, String, Number, Boolean],
            default: undefined
        },
        label: {
            type: String,
            default: null
        },
        collapsible: {
            type: Boolean,
            default: false
        },
        defaultCollapsed: {
            type: Boolean,
            default: false
        }
    },
    data () {
        return {
            wrapped: false,
            collapsed: this.defaultCollapsed
        }
    },
    computed: {
        // Prettified JSON for objects/arrays, plain string for scalars.
        text () {
            const v = this.value
            if (v === undefined || v === null) return ''
            if (typeof v === 'object') return safeStringify(v)
            return String(v)
        },
        hasLongLines () {
            return this.text.split('\n').some(line => line.length > LONG_LINE_THRESHOLD)
        },
        showHeader () {
            return this.collapsible || !!this.label || this.hasLongLines
        }
    },
    watch: {
        // Let the parent drive collapse on a state change (e.g. a tool decision)
        // while still leaving the header toggle live for manual expand/collapse.
        defaultCollapsed (val) {
            this.collapsed = val
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

.json-viewer__collapse-toggle {
    font-weight: 600;
    color: var(--ff-color-text-subtle);
}

.json-viewer__caret {
    width: 1rem;
    height: 1rem;
    transition: transform 0.2s ease;

    &--open {
        transform: rotate(90deg);
    }
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
