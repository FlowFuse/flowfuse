<template>
    <div v-if="!hasStructure" class="expert-plan">
        <rich-content
            :content="plan"
            :message-uuid="messageUuid"
            :answer-uuid="answerUuid"
            :should-stream="false"
            class="plan-body"
        />
        <div class="plan-actions">
            <ff-button kind="primary" size="small" :disabled="disabled" @click="$emit('approve')">
                Approve
            </ff-button>
            <ff-button kind="secondary" size="small" :disabled="disabled" title="Load the plan into the message box to edit it yourself" @click="$emit('edit-manual')">
                Edit
            </ff-button>
            <ff-button kind="secondary" size="small" :disabled="disabled" title="Tell the Expert what to change and get an updated plan" @click="$emit('request-changes')">
                Request changes
            </ff-button>
            <ff-button kind="tertiary" size="small" :disabled="disabled" @click="$emit('reject')">
                Reject
            </ff-button>
        </div>
    </div>

    <div v-else class="expert-plan expert-plan--structured">
        <template v-if="awaitingApproval">
            <div class="plan-head">
                <span class="plan-name">Plan: {{ name }}</span>
                <span class="plan-status" :class="`is-${status}`">{{ statusLabel }}</span>
            </div>
            <p v-if="description" class="plan-desc">{{ description }}</p>
            <rich-content
                :content="plan"
                :message-uuid="messageUuid"
                :answer-uuid="answerUuid"
                :should-stream="false"
                class="plan-body"
            />
            <div class="plan-actions">
                <ff-button kind="primary" size="small" :disabled="disabled" @click="$emit('approve')">
                    Approve
                </ff-button>
                <ff-button kind="secondary" size="small" :disabled="disabled" title="Load the plan into the message box to edit it yourself" @click="$emit('edit-manual')">
                    Edit
                </ff-button>
                <ff-button kind="secondary" size="small" :disabled="disabled" title="Tell the Expert what to change and get an updated plan" @click="$emit('request-changes')">
                    Request changes
                </ff-button>
                <ff-button kind="tertiary" size="small" :disabled="disabled" @click="$emit('reject')">
                    Reject
                </ff-button>
            </div>
        </template>
        <collapsible-section v-else class="plan-collapsed">
            <template #header>
                <span class="plan-name">Plan: {{ name }}</span>
                <span v-if="active" class="plan-badge">Active</span>
                <span class="plan-status" :class="`is-${status}`">{{ statusLabel }}</span>
            </template>
            <p v-if="description" class="plan-desc">{{ description }}</p>
            <rich-content
                :content="plan"
                :message-uuid="messageUuid"
                :answer-uuid="answerUuid"
                :should-stream="false"
                class="plan-body"
            />
        </collapsible-section>
    </div>
</template>

<script>
import CollapsibleSection from '../CollapsibleSection.vue'

import RichContent from './RichContent.vue'

const STATUS_LABELS = { proposed: 'Proposed', approved: 'Approved', rejected: 'Rejected' }

export default {
    name: 'PlanCard',
    components: { RichContent, CollapsibleSection },
    props: {
        plan: {
            type: String,
            required: true
        },
        messageUuid: {
            type: String,
            required: true
        },
        answerUuid: {
            type: String,
            required: true
        },
        name: {
            type: String,
            default: ''
        },
        description: {
            type: String,
            default: ''
        },
        status: {
            type: String,
            default: 'proposed'
        },
        active: {
            type: Boolean,
            default: false
        },
        awaitingApproval: {
            type: Boolean,
            default: true
        },
        disabled: {
            type: Boolean,
            default: false
        },
        shouldStream: {
            type: Boolean,
            default: false
        }
    },
    emits: ['approve', 'edit-manual', 'request-changes', 'reject', 'streaming-complete'],
    computed: {
        hasStructure () {
            return this.name.length > 0
        },
        statusLabel () {
            return STATUS_LABELS[this.status] || STATUS_LABELS.proposed
        }
    },
    mounted () {
        // plan cards are interactive, not streamed text; signal completion
        // so the AnswerWrapper streaming order can advance.
        this.$nextTick(() => this.$emit('streaming-complete'))
    }
}
</script>

<style scoped lang="scss">
// Render like a normal answer: no card border/background, just the plan content
// followed by the action buttons. The gap spaces the buttons from the content.
// The plan content inherits the message bubble's font-size, line-height and
// colour, so the Markdown renders exactly like any other chat answer.
.expert-plan {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.plan-head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.plan-name {
    font-weight: 600;
}

.plan-status {
    font-size: 0.75rem;
    padding: 0.0625rem 0.5rem;
    border-radius: 999px;
    border: 1px solid var(--ff-color-border);
    color: var(--ff-color-text-subtle);

    &.is-approved {
        color: var(--ff-color-success);
        border-color: var(--ff-color-success);
    }

    &.is-rejected {
        color: var(--ff-color-danger);
        border-color: var(--ff-color-danger);
    }
}

.plan-badge {
    font-size: 0.75rem;
    padding: 0.0625rem 0.5rem;
    border-radius: 999px;
    background: var(--ff-color-accent-surface);
    color: var(--ff-color-accent-text);
}

.plan-desc {
    margin: 0;
    color: var(--ff-color-text-subtle);
}

.plan-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
}

.plan-collapsed {
    :deep(.ff-collapsible--header) {
        gap: 0.5rem;
    }

    .plan-status {
        margin-left: auto;
    }
}
</style>
