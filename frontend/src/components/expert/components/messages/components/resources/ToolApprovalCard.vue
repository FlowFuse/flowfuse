<template>
    <div class="expert-tool-approval" :class="`status-${status}`">
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

        <div v-if="status === 'pending'" class="tool-approval-actions">
            <ff-button kind="primary" size="small" :disabled="disabled || decided" @click="decide('approve')">
                Allow
            </ff-button>
            <ff-button
                kind="secondary"
                size="small"
                :disabled="disabled || decided"
                title="Always allow this tool without asking again"
                @click="decide('allow-always')"
            >
                Always allow
            </ff-button>
            <ff-button kind="tertiary" size="small" :disabled="disabled || decided" @click="decide('deny')">
                Deny
            </ff-button>
        </div>
        <p v-else class="tool-approval-outcome">
            {{ status === 'approved' ? 'Allowed' : 'Denied' }}
        </p>
    </div>
</template>

<script>
import JsonViewer from './JsonViewer.vue'

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
            default: 'pending' // 'pending' | 'approved' | 'denied'
        },
        disabled: {
            type: Boolean,
            default: false
        }
    },
    emits: ['approve', 'allow-always', 'deny', 'streaming-complete'],
    data () {
        return {
            // Optimistically disables the buttons the moment a choice is made, so the
            // card cannot be clicked twice while the decision round-trips to the agent.
            decided: false
        }
    },
    computed: {
        classLabel () {
            return { read: 'Read', write: 'Write', delete: 'Delete' }[this.toolClass] || 'Write'
        },
        hasParams () {
            return Object.keys(this.params || {}).length > 0
        },
        // Collapse the payload once the call is allowed, always-allowed or denied
        // (locally or via the round-tripped status); the header toggle stays live
        // so the user can re-expand it at any time.
        payloadCollapsed () {
            return this.decided || this.status !== 'pending'
        }
    },
    mounted () {
        // Interactive card, not streamed text — signal completion so the
        // AnswerWrapper streaming order can advance.
        this.$nextTick(() => this.$emit('streaming-complete'))
    },
    methods: {
        decide (action) {
            if (this.disabled || this.decided) return
            this.decided = true
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
