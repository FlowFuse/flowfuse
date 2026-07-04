<template>
    <div class="expert-tool-approval" :class="`status-${effectiveStatus}`">
        <div class="tool-approval-header">
            <span class="tool-approval-name">{{ name }}</span>
            <span v-if="toolClass" class="tool-approval-tag" :class="`tag-${toolClass}`">
                {{ classLabel }}
            </span>
        </div>
        <json-viewer
            v-if="hasParams"
            :value="params"
            collapsible
            :default-collapsed="payloadCollapsed"
            class="tool-approval-payload"
        />

        <div v-if="effectiveStatus === 'pending'" class="tool-approval-actions">
            <ff-button kind="primary" size="small" :disabled="disabled" @click="decide('approve')">
                Allow
            </ff-button>
            <ff-button
                kind="secondary"
                size="small"
                :disabled="disabled"
                title="Allow this tool for the rest of this chat without asking again"
                @click="decide('allow-always')"
            >
                Always allow
            </ff-button>
            <ff-button kind="tertiary" size="small" :disabled="disabled" @click="decide('deny')">
                Deny
            </ff-button>
            <ff-button
                kind="tertiary"
                size="small"
                :disabled="disabled"
                title="Deny this tool for the rest of this chat without asking again"
                @click="decide('deny-always')"
            >
                Always deny
            </ff-button>
        </div>
        <p v-else class="tool-approval-outcome">
            {{ outcomeLabel }}
        </p>
    </div>
</template>

<script>
import JsonViewer from '@/components/JsonViewer.vue'

export default {
    name: 'ToolApprovalCard',
    components: { JsonViewer },
    props: {
        name: {
            type: String,
            default: 'this tool'
        },
        toolClass: {
            type: String,
            default: ''
        },
        params: {
            type: Object,
            default: () => ({})
        },
        status: {
            type: String,
            // 'pending' | 'approved' | 'always-allowed' | 'denied' | 'always-denied'
            default: 'pending'
        },
        disabled: {
            type: Boolean,
            default: false
        }
    },
    emits: ['approve', 'allow-always', 'deny', 'deny-always', 'streaming-complete'],
    data () {
        return {
            // What the user pressed on this card, for instant feedback without waiting on a
            // store round-trip. The `status` prop also reflects the outcome — AnswerWrapper
            // feeds it from the store's reactive per-id map, which covers external
            // resolutions (chat stop / Start Over) this card never pressed.
            localStatus: null
        }
    },
    computed: {
        classLabel () {
            return { read: 'Read', write: 'Write', delete: 'Delete' }[this.toolClass] || 'Write'
        },
        // The decision to show: this card's own press wins; otherwise the prop's value.
        effectiveStatus () {
            return this.localStatus || this.status
        },
        // Post-decision feedback: reflect exactly what the user pressed, including whether
        // the choice stands for the rest of this chat.
        outcomeLabel () {
            return {
                approved: 'Allowed',
                'always-allowed': 'Allowed for this chat',
                denied: 'Denied',
                'always-denied': 'Denied for this chat'
            }[this.effectiveStatus] || (this.effectiveStatus === 'pending' ? '' : 'Denied')
        },
        hasParams () {
            return Object.keys(this.params || {}).length > 0
        },
        // Collapse the payload once a decision is made; the header toggle stays live
        // so the user can re-expand it at any time.
        payloadCollapsed () {
            return this.effectiveStatus !== 'pending'
        }
    },
    mounted () {
        // Interactive card, not streamed text — signal completion so the
        // AnswerWrapper streaming order can advance.
        this.$nextTick(() => this.$emit('streaming-complete'))
    },
    methods: {
        decide (action) {
            if (this.disabled || this.effectiveStatus !== 'pending') return
            this.localStatus = {
                approve: 'approved',
                'allow-always': 'always-allowed',
                deny: 'denied',
                'deny-always': 'always-denied'
            }[action] || 'denied'
            this.$emit(action)
        }
    }
}
</script>

<style scoped lang="scss">
.expert-tool-approval {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    border: 1px solid var(--ff-color-border);
    border-radius: 6px;
    background: var(--ff-color-bg-surface);
    // Match the "N tool calls" strip (ToolCalls.vue) so the card lines up with it.
    max-width: 90%;
}

.tool-approval-header {
    display: flex;
    align-items: center;
    gap: 8px;
}

.tool-approval-name {
    font-weight: 600;
}

.tool-approval-tag {
    font-size: 0.75rem;
    padding: 1px 6px;
    border-radius: 4px;
    &.tag-read { background: var(--ff-color-bg-emphasis); color: var(--ff-color-text-subtle); }
    &.tag-write { background: var(--ff-color-status-info-bg); color: var(--ff-color-status-info-text); }
    &.tag-delete { background: var(--ff-color-status-error-bg); color: var(--ff-color-status-error-text); }
}

.tool-approval-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
}

.tool-approval-outcome {
    margin: 0;
    font-weight: 600;
    color: var(--ff-color-text-subtle);
}
</style>
