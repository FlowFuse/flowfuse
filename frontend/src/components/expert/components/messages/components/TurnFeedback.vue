<template>
    <div class="ff-turn-feedback" data-el="turn-feedback">
        <div class="ff-turn-feedback--row">
            <ff-button
                v-ff-tooltip:bottom="'Good answer'"
                kind="plain"
                size="small"
                data-action="vote-up"
                aria-label="Good answer"
                :aria-pressed="vote === 'up' ? 'true' : 'false'"
                :disabled="pending"
                @click="rate('up')"
            >
                <template #icon>
                    <HandThumbUpSolidIcon v-if="vote === 'up'" />
                    <HandThumbUpIcon v-else />
                </template>
            </ff-button>
            <ff-button
                v-ff-tooltip:bottom="'Bad answer'"
                kind="plain"
                size="small"
                data-action="vote-down"
                aria-label="Bad answer"
                :aria-pressed="vote === 'down' ? 'true' : 'false'"
                :disabled="pending"
                @click="rate('down')"
            >
                <template #icon>
                    <HandThumbDownSolidIcon v-if="vote === 'down'" />
                    <HandThumbDownIcon v-else />
                </template>
            </ff-button>
            <span v-if="feedbackSent" class="ff-turn-feedback--confirmed" data-el="feedback-confirmed">
                <CheckIcon aria-hidden="true" />
                {{ confirmation }}
            </span>
        </div>
        <div class="ff-turn-feedback--panel" :class="{ open: panelVisible }" data-el="feedback-panel">
            <div class="ff-turn-feedback--panel-inner" :inert="!panelVisible">
                <textarea
                    v-model="comment"
                    class="ff-input ff-text-input"
                    rows="3"
                    maxlength="2000"
                    data-el="feedback-comment"
                    :placeholder="placeholder"
                    :disabled="pending"
                />
                <ff-checkbox v-model="share" label="Include this conversation" data-el="feedback-share" :disabled="pending" />
                <p class="ff-turn-feedback--hint">
                    Shares your messages, the answers, and any flows or debug output up to this answer with FlowFuse.
                </p>
                <div class="ff-turn-feedback--actions">
                    <ff-button kind="primary" size="small" data-action="send-feedback" :disabled="!canSend || pending" @click="send">
                        Send feedback
                    </ff-button>
                    <ff-button kind="tertiary" size="small" data-action="dismiss-feedback" :disabled="pending" @click="dismissTurnFeedback(messageUuid)">
                        No thanks
                    </ff-button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { CheckIcon, HandThumbDownIcon as HandThumbDownSolidIcon, HandThumbUpIcon as HandThumbUpSolidIcon } from '@heroicons/vue/20/solid'
import { HandThumbDownIcon, HandThumbUpIcon } from '@heroicons/vue/24/outline'
import { mapActions } from 'pinia'

import { useProductExpertStore } from '@/stores/product-expert.js'

export default {
    name: 'TurnFeedback',
    components: { CheckIcon, HandThumbDownIcon, HandThumbDownSolidIcon, HandThumbUpIcon, HandThumbUpSolidIcon },
    props: {
        messageUuid: {
            type: String,
            required: true
        },
        vote: {
            type: String,
            default: null
        },
        shared: {
            type: Boolean,
            default: false
        },
        feedbackSent: {
            type: Boolean,
            default: false
        },
        feedbackDismissed: {
            type: Boolean,
            default: false
        }
    },
    data () {
        return {
            pending: false,
            comment: '',
            share: false
        }
    },
    computed: {
        panelVisible () {
            return !!this.vote && !this.feedbackSent && !this.feedbackDismissed
        },
        placeholder () {
            return this.vote === 'down' ? 'What went wrong? (optional)' : 'What was good about this answer? (optional)'
        },
        canSend () {
            return this.comment.trim().length > 0 || this.share
        },
        confirmation () {
            return this.shared ? 'Thanks for your feedback. Conversation shared.' : 'Thanks for your feedback.'
        }
    },
    methods: {
        ...mapActions(useProductExpertStore, ['rateTurn', 'submitTurnFeedback', 'dismissTurnFeedback']),
        async rate (value) {
            if (this.pending || this.vote === value) {
                return
            }
            this.pending = true
            try {
                await this.rateTurn(this.messageUuid, value)
            } finally {
                this.pending = false
            }
        },
        async send () {
            this.pending = true
            try {
                await this.submitTurnFeedback(this.messageUuid, { comment: this.comment, share: this.share })
            } finally {
                this.pending = false
            }
        }
    }
}
</script>

<style scoped lang="scss">
.ff-turn-feedback {
    padding-left: 0.25rem;
    color: var(--ff-color-text-subtle);
    font-size: 0.875rem;
    line-height: 1.25rem;
}

.ff-turn-feedback--row {
    display: flex;
    align-items: center;
    gap: 0.25rem;

    // Muted until the row is used, so the answer stays the focus.
    .ff-btn {
        padding: 0.25rem;
        border-radius: 0.25rem;
        color: var(--ff-color-text-subtle);
        opacity: 0.6;
        transition: opacity 0.15s ease, color 0.15s ease;

        &:hover,
        &:focus-visible,
        &[aria-pressed="true"] {
            opacity: 1;
        }

        &:hover {
            color: var(--ff-color-text-strong);
        }

        &[aria-pressed="true"] svg {
            color: var(--ff-color-accent);
        }
    }
}

.ff-turn-feedback--confirmed {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin-left: 0.5rem;

    svg {
        width: 1rem;
        height: 1rem;
        color: var(--ff-color-positive);
    }
}

.ff-turn-feedback--panel {
    display: grid;
    grid-template-rows: 0fr;
    opacity: 0;
    transition: grid-template-rows 0.22s ease, opacity 0.22s ease;

    &.open {
        grid-template-rows: 1fr;
        opacity: 1;
    }
}

.ff-turn-feedback--panel-inner {
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: 32rem;
    padding-top: 0.25rem;

    textarea {
        resize: vertical;
        height: auto;
    }
}

.ff-turn-feedback--hint {
    margin: 0;
}

.ff-turn-feedback--actions {
    display: flex;
    gap: 0.5rem;
    padding-bottom: 0.25rem;
}

@media (prefers-reduced-motion: reduce) {
    .ff-turn-feedback--row .ff-btn,
    .ff-turn-feedback--panel {
        transition: none;
    }
}
</style>
