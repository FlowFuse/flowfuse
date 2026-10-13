<template>
    <collapsible-section class="ff-expert-timeline-item" :auto-open="false">
        <template #header>
            <WrenchIcon class="ff-expert-timeline-item--glyph" />
            <span class="ff-expert-timeline-item--name" :title="headline">{{ headline }}</span>
            <span v-if="failed" class="ff-expert-timeline-item--failed-hint">Failed</span>
        </template>

        <div class="ff-expert-timeline-item--body">
            <p v-if="reasonText" class="ff-expert-timeline-item--reason">{{ reasonText }}</p>
            <p v-if="reasonText" class="ff-expert-timeline-item--tool">{{ title }}</p>
            <p v-if="failed && errorText" class="ff-expert-timeline-item--error">{{ errorText }}</p>
            <!-- Dev-only raw tool key, on its own line so it never crowds the reason. -->
            <div v-if="showRawKey" class="ff-expert-timeline-item--raw-key" :title="kindFull">
                {{ rawKey }}
            </div>
            <!-- Input/output are dev-only today, but render whenever present so a future
                 flag flip needs no UI change. -->
            <div v-if="hasInput" class="ff-expert-timeline-item--section">
                <div
                    class="ff-expert-timeline-item--section-header"
                    @click="inputExpanded = !inputExpanded"
                >
                    <ChevronRightIcon
                        class="ff-icon-small"
                        :class="{ 'rotated': inputExpanded }"
                    />
                    <span class="ff-expert-timeline-item--section-label">Input</span>
                </div>
                <div v-if="inputExpanded" class="ff-expert-timeline-item--code">
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <pre><code v-html="highlightJson(item.input)" /></pre>
                </div>
            </div>
            <div v-if="hasOutput" class="ff-expert-timeline-item--section">
                <div
                    class="ff-expert-timeline-item--section-header"
                    @click="outputExpanded = !outputExpanded"
                >
                    <ChevronRightIcon
                        class="ff-icon-small"
                        :class="{ 'rotated': outputExpanded }"
                    />
                    <span class="ff-expert-timeline-item--section-label">Output</span>
                </div>
                <div v-if="outputExpanded" class="ff-expert-timeline-item--code">
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <pre><code v-html="highlightJson(item.output)" /></pre>
                </div>
            </div>
        </div>
    </collapsible-section>
</template>

<script>
import { ChevronRightIcon, WrenchIcon } from '@heroicons/vue/20/solid'
import hljs from 'highlight.js/lib/core'
import json from 'highlight.js/lib/languages/json'

import CollapsibleSection from './CollapsibleSection.vue'

hljs.registerLanguage('json', json)

// Names that must never surface: empty, the old backend placeholder (still in cached turns),
// and invoke_* wrappers (a non-dev support record's toolId is the wrapper, not the real tool).
const AUTOMATION_PLACEHOLDER = 'FlowFuse Automation'
function isUsableName (value) {
    if (typeof value !== 'string') return false
    const trimmed = value.trim()
    if (trimmed === '' || trimmed === AUTOMATION_PLACEHOLDER) return false
    return !trimmed.startsWith('invoke_')
}

export default {
    name: 'TimelineItem',
    components: { ChevronRightIcon, CollapsibleSection, WrenchIcon },
    props: {
        item: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            inputExpanded: false,
            outputExpanded: false
        }
    },
    computed: {
        reasonText () {
            return typeof this.item.reason === 'string' ? this.item.reason.trim() : ''
        },
        failed () {
            return this.item.ok === false
        },
        errorText () {
            return typeof this.item.error === 'string' ? this.item.error.trim() : ''
        },
        // First usable name: friendly title, else the tool's own name, else the raw key.
        title () {
            return [this.item.toolTitle, this.item.toolName, this.item.toolId].find(isUsableName) || 'Tool call'
        },
        // The reason says what the call is for, so it leads on one line; the full reason and
        // the tool title are in the body.
        headline () {
            return this.reasonText || this.title
        },
        rawKey () {
            return this.item.toolId || ''
        },
        // Dev-only, and hidden when it would just repeat the visible title.
        showRawKey () {
            return this.hasDevData && this.rawKey !== '' && this.rawKey !== this.title
        },
        kindFull () {
            return this.item.kind || 'Unknown'
        },
        hasInput () {
            return this.hasContent(this.item.input)
        },
        hasOutput () {
            return this.hasContent(this.item.output)
        },
        // Dev flag alone, not input/output presence - so `showToolIO` can surface I/O to
        // everyone without leaking the raw key.
        hasDevData () {
            return this.item.technical === true
        }
    },
    methods: {
        hasContent (data) {
            if (data === null || data === undefined) return false
            if (Array.isArray(data)) return data.length > 0
            if (typeof data === 'object') return Object.keys(data).length > 0
            if (typeof data === 'string') return data.trim() !== ''
            return true
        },
        highlightJson (data) {
            let jsonStr
            if (typeof data === 'string') {
                try {
                    jsonStr = JSON.stringify(JSON.parse(data), null, 2)
                } catch {
                    jsonStr = data
                }
            } else {
                jsonStr = JSON.stringify(data, null, 2)
            }
            return hljs.highlight(jsonStr, { language: 'json' }).value
        }
    }
}
</script>

<style scoped lang="scss">
.ff-expert-timeline-item {
    // Align with the approval card.
    max-width: 90%;
}

.ff-expert-timeline-item--glyph {
    width: 0.875rem;
    height: 0.875rem;
    flex-shrink: 0;
}

.ff-expert-timeline-item--name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 500;
    color: var(--ff-color-text);
}

.ff-expert-timeline-item--failed-hint {
    font-size: 0.6875rem;
    color: var(--ff-color-status-error-text);
    margin-left: auto;
    white-space: nowrap;
}

.ff-expert-timeline-item--body {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.25rem;
    padding-left: 0.75rem;
    border-left: 2px solid var(--ff-color-border-subtle);
}

.ff-expert-timeline-item--reason {
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.4;
    color: var(--ff-color-text);
}

.ff-expert-timeline-item--tool {
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.4;
    color: var(--ff-color-text-subtle);
}

.ff-expert-timeline-item--error {
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.4;
    color: var(--ff-color-status-error-text);
}

.ff-expert-timeline-item--raw-key {
    font-size: 0.6875rem;
    color: var(--ff-color-text-subtle);
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
    word-break: break-all;
}

.ff-expert-timeline-item--section {
    border: 1px solid var(--ff-color-border);
    border-radius: 0.375rem;
    overflow: hidden;
}

.ff-expert-timeline-item--section-header {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.75rem;
    background-color: var(--ff-color-bg-app);
    cursor: pointer;
    user-select: none;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--ff-color-text-deep);

    &:hover {
        background-color: var(--ff-color-bg-surface);
    }

    .ff-icon-small {
        width: 0.75rem;
        height: 0.75rem;
        color: var(--ff-color-text-subtle);
        flex-shrink: 0;
        transition: transform 0.2s ease;

        &.rotated {
            transform: rotate(90deg);
        }
    }
}

.ff-expert-timeline-item--section-label {
    flex: 1;
}

.ff-expert-timeline-item--code {
    pre {
        margin: 0;
        padding: 0.75rem;
        background-color: var(--ff-color-bg-surface-raised);
        border-radius: 0.375rem;
        overflow-x: auto;
        border-top: 1px solid var(--ff-color-border);

        code {
            font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
            font-size: 0.8125rem;
            color: var(--ff-color-text);
            white-space: pre-wrap;
            word-break: break-word;
            border: none;
            background: transparent;
            padding: 0;
        }
    }
}
</style>
