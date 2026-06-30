<template>
    <div class="expert-tool-approval" :class="`status-${status}`">
        <div class="tool-approval-header">
            <span class="tool-approval-name">{{ name }}</span>
            <span v-if="toolClass" class="tool-approval-tag" :class="`tag-${toolClass}`">
                {{ classLabel }}
            </span>
        </div>
        <dl v-if="paramEntries.length" class="tool-approval-params">
            <template v-for="entry in paramEntries" :key="entry.key">
                <dt>{{ entry.key }}</dt>
                <dd>{{ entry.value }}</dd>
            </template>
        </dl>

        <div v-if="status === 'pending'" class="tool-approval-actions">
            <ff-button kind="primary" size="small" :disabled="disabled" @click="$emit('approve')">
                Allow
            </ff-button>
            <ff-button
                kind="secondary"
                size="small"
                :disabled="disabled"
                title="Always allow this tool without asking again"
                @click="$emit('allow-always')"
            >
                Always allow
            </ff-button>
            <ff-button kind="tertiary" size="small" :disabled="disabled" @click="$emit('deny')">
                Deny
            </ff-button>
        </div>
        <p v-else class="tool-approval-outcome">
            {{ status === 'approved' ? 'Allowed' : 'Denied' }}
        </p>
    </div>
</template>

<script>
export default {
    name: 'ToolApprovalCard',
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
    computed: {
        classLabel () {
            return { read: 'Read only', write: 'Makes changes', delete: 'Deletes' }[this.toolClass] || 'Makes changes'
        },
        paramEntries () {
            const params = this.params || {}
            return Object.keys(params).map(key => {
                const raw = params[key]
                const value = typeof raw === 'object' ? JSON.stringify(raw) : String(raw)
                return { key, value }
            })
        }
    },
    mounted () {
        // Interactive card, not streamed text — signal completion so the
        // AnswerWrapper streaming order can advance.
        this.$nextTick(() => this.$emit('streaming-complete'))
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

.tool-approval-params {
    margin: 0;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 2px 10px;
    font-size: 0.8125rem;
    dt { font-weight: 600; color: var(--ff-color-text-subtle); }
    dd { margin: 0; word-break: break-word; }
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
