<template>
    <div class="ff-expert-loading">
        <div class="loading-dots">
            <div class="loading-dot" />
            <div class="loading-dot" />
            <div class="loading-dot" />
        </div>
        <div v-if="showMessage" class="loading-message">
            {{ currentMessage }}
        </div>
    </div>
</template>

<script>
export default {
    name: 'ExpertLoadingDots',
    props: {
        variant: {
            type: String,
            default: 'default',
            validator: (value) => ['default', 'transfer', 'insights'].includes(value)
        }
    },
    data () {
        return {
            showMessage: false,
            currentMessageIndex: 0,
            messageVariants: {
                default: [
                    'Ingesting the docs...',
                    'Reading the blog...',
                    'Searching through FlowFuse knowledge base',
                    'Analyzing your question...',
                    'Finding the best answer...'
                ],
                transfer: [
                    'Catching up with new context...',
                    'Syncing your conversation...',
                    'Loading existing history...',
                    'Preparing your chat...'
                ],
                insights: [
                    'Connecting to MCP resources...',
                    'Querying your Node-RED instances...',
                    'Instructing MCP tooling...',
                    'Ingesting responses...',
                    'Gathering insights...',
                    'Considering instructions...',
                    'Processing user response...'
                ]
            },
            messageTimer: null,
            rotationTimer: null
        }
    },
    computed: {
        messages () {
            return this.messageVariants[this.variant]
        },
        currentMessage () {
            return this.messages[this.currentMessageIndex]
        }
    },
    mounted () {
        // Show first message after 5 seconds
        this.messageTimer = setTimeout(() => {
            this.showMessage = true
            // Rotate messages every 3 seconds
            this.rotationTimer = setInterval(() => {
                this.currentMessageIndex = (this.currentMessageIndex + 1) % this.messages.length
            }, 3000)
        }, 5000)
    },
    beforeUnmount () {
        // Clean up timers
        if (this.messageTimer) {
            clearTimeout(this.messageTimer)
        }
        if (this.rotationTimer) {
            clearInterval(this.rotationTimer)
        }
    }
}
</script>

<style scoped lang="scss">
.ff-expert-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
}

.loading-dots {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.loading-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: $ff-indigo-500;
    animation: bounce-dot 1.4s infinite ease-in-out both;

    &:nth-child(1) {
        animation-delay: -0.32s;
    }

    &:nth-child(2) {
        animation-delay: -0.16s;
    }
}

@keyframes bounce-dot {
    0%, 80%, 100% {
        transform: scale(0.7);
        opacity: 0.5;
    }
    40% {
        transform: scale(1);
        opacity: 1;
    }
}

.loading-message {
    font-size: 0.875rem;
    color: $ff-grey-600;
    font-style: italic;
    animation: fade-in 0.3s ease-in;
}

@keyframes fade-in {
    from {
        opacity: 0;
        transform: translateY(-4px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
