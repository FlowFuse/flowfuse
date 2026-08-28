<template>
    <div class="expert-plan">
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
                {{ $t('ui.approve') }}
            </ff-button>
            <ff-button
                kind="secondary"
                size="small"
                :disabled="disabled"
                :title="$t('ui.loadThePlanIntoTheMessageBoxToEditItYourself')"
                @click="$emit('edit-manual')"
            >
                {{ $t('ui.edit') }}
            </ff-button>
            <ff-button
                kind="secondary"
                size="small"
                :disabled="disabled"
                :title="$t('ui.tellTheExpertWhatToChangeAndGetAnUpdatedPlan')"
                @click="$emit('request-changes')"
            >
                {{ $t('ui.requestChanges') }}
            </ff-button>
            <ff-button
                kind="tertiary"
                size="small"
                :disabled="disabled"
                @click="$emit('reject')"
            >
                {{ $t('ui.reject') }}
            </ff-button>
        </div>
    </div>
</template>

<script>
import RichContent from './RichContent.vue'

export default {
    name: 'PlanCard',
    components: { RichContent },
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

.plan-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
}
</style>
