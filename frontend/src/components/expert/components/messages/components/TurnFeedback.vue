<template>
    <div class="ff-turn-feedback" data-el="turn-feedback">
        <div class="ff-turn-feedback--row">
            <ff-button
                v-ff-tooltip:bottom="'Good answer'"
                :kind="vote === 'up' ? 'secondary' : 'tertiary'"
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
                :kind="vote === 'down' ? 'secondary' : 'tertiary'"
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
            <span v-if="shared" class="ff-turn-feedback--confirmed" data-el="share-confirmed">
                <CheckIcon aria-hidden="true" />
                Conversation shared. Thank you.
            </span>
        </div>
        <div class="ff-turn-feedback--offer" :class="{ open: offerVisible }" data-el="share-offer">
            <div class="ff-turn-feedback--offer-inner" :inert="!offerVisible">
                <p>
                    Share this conversation with FlowFuse to help us improve the Expert.
                    It includes your messages, the answers, and any flows or debug output up to this answer.
                </p>
                <div class="ff-turn-feedback--actions">
                    <ff-button kind="secondary" size="small" data-action="share" :disabled="pending" @click="share">
                        Share conversation
                    </ff-button>
                    <ff-button kind="tertiary" size="small" data-action="dismiss-share" @click="dismissTurnShare(messageUuid)">
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
        shareDismissed: {
            type: Boolean,
            default: false
        }
    },
    data () {
        return {
            pending: false
        }
    },
    computed: {
        offerVisible () {
            return !!this.vote && !this.shared && !this.shareDismissed
        }
    },
    methods: {
        ...mapActions(useProductExpertStore, ['rateTurn', 'shareTurnConversation', 'dismissTurnShare']),
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
        async share () {
            this.pending = true
            try {
                await this.shareTurnConversation(this.messageUuid)
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
        opacity: 0.6;
        transition: opacity 0.15s ease;

        &:hover,
        &:focus-visible,
        &[aria-pressed="true"] {
            opacity: 1;
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

.ff-turn-feedback--offer {
    display: grid;
    grid-template-rows: 0fr;
    opacity: 0;
    transition: grid-template-rows 0.22s ease, opacity 0.22s ease;

    &.open {
        grid-template-rows: 1fr;
        opacity: 1;
    }
}

.ff-turn-feedback--offer-inner {
    min-height: 0;
    overflow: hidden;

    p {
        margin: 0.25rem 0 0.5rem;
        max-width: 32rem;
    }
}

.ff-turn-feedback--actions {
    display: flex;
    gap: 0.5rem;
    padding-bottom: 0.25rem;
}

@media (prefers-reduced-motion: reduce) {
    .ff-turn-feedback--row .ff-btn,
    .ff-turn-feedback--offer {
        transition: none;
    }
}
</style>
