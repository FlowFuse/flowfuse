<template>
    <div class="expert-plan" :class="{ 'expert-plan--structured': hasStructure }">
        <collapsible-section v-if="hasStructure && !awaitingApproval" class="plan-collapsed">
            <template #header>
                <span class="plan-name">Plan: {{ name }}</span>
                <span v-if="active" class="forge-badge plan-badge">Active</span>
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

        <template v-else>
            <div v-if="hasStructure" class="plan-head">
                <span class="plan-name">Plan: {{ name }}</span>
            </div>
            <p v-if="hasStructure && description" class="plan-desc">{{ description }}</p>
            <rich-content
                :content="plan"
                :message-uuid="messageUuid"
                :answer-uuid="answerUuid"
                :should-stream="false"
                class="plan-body"
            />
            <div class="plan-actions">
                <ff-button
                    kind="primary"
                    size="small"
                    :disabled="disabled"
                    @click="$emit('approve')"
                >
                    Approve
                </ff-button>
                <ff-button
                    kind="secondary"
                    size="small"
                    :disabled="disabled"
                    title="Load the plan into the message box to edit it yourself"
                    @click="$emit('edit-manual')"
                >
                    Edit
                </ff-button>
                <ff-button
                    kind="secondary"
                    size="small"
                    :disabled="disabled"
                    title="Tell the Expert what to change and get an updated plan"
                    @click="$emit('request-changes')"
                >
                    Request changes
                </ff-button>
                <ff-button
                    kind="tertiary"
                    size="small"
                    :disabled="disabled"
                    @click="$emit('reject')"
                >
                    Reject
                </ff-button>
            </div>
        </template>
    </div>
</template>

<script>
import CollapsibleSection from '../CollapsibleSection.vue'

import RichContent from './RichContent.vue'

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
        planId: {
            type: String,
            default: ''
        },
        name: {
            type: String,
            default: ''
        },
        description: {
            type: String,
            default: ''
        },
        active: {
            type: Boolean,
            default: false
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
            return this.planId.length > 0
        },
        awaitingApproval () {
            return !this.active
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
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--ff-color-text);
}

.plan-badge {
    background: var(--ff-color-accent);
    border-color: var(--ff-color-accent);
    color: var(--ff-color-text-on-brand);
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

    .plan-desc {
        margin-bottom: 0.75rem;
    }
}
</style>
