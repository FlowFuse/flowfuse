<template>
    <div class="ff-expert-tool-call">
        <div class="ff-expert-tool-call--header" @click="toggleExpanded">
            <ChevronRightIcon class="ff-icon" :class="{ 'rotated': expanded }" />
            <span class="ff-expert-tool-call--count">
                {{ toolCallCount }} tool call{{ toolCallCount > 1 ? 's' : '' }}
            </span>
            <span class="ff-expert-tool-call--duration">
                time: {{ formattedDuration }}
            </span>
        </div>
        <div class="ff-expert-tool-call--body">
            <div
                v-for="tool in toolCalls"
                :key="tool.id"
                class="ff-expert-tool-call--item"
            >
                <div class="ff-expert-tool-call--title">{{ tool.title || tool.name }}</div>
                <div class="ff-expert-tool-call--name">{{ tool.name }}</div>
                <div v-if="expanded && tool.output" class="ff-expert-tool-call--output">
                    <pre><code>{{ tool.output }}</code></pre>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { ChevronRightIcon } from '@heroicons/vue/solid'

export default {
    name: 'ExpertToolCall',
    components: {
        ChevronRightIcon
    },
    props: {
        message: {
            type: Object,
            required: true,
            validator: (message) => {
                return Array.isArray(message.toolCalls)
            }
        }
    },
    data () {
        return {
            expanded: false
        }
    },
    computed: {
        toolCalls () {
            return this.message.toolCalls || []
        },
        toolCallCount () {
            return this.toolCalls.length
        },
        formattedDuration () {
            const duration = this.message.duration
            if (typeof duration === 'number') {
                return `${duration}s`
            }
            return duration || '0s'
        }
    },
    methods: {
        toggleExpanded () {
            this.expanded = !this.expanded
        }
    }
}
</script>

<style scoped lang="scss">
.ff-expert-tool-call {
    background-color: $ff-grey-50;
    border: 1px solid $ff-grey-200;
    border-radius: 0.5rem 0.5rem 0.5rem 0;
    overflow: hidden;
    max-width: 90%;
}

.ff-expert-tool-call--header {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    gap: 0.5rem;
    background-color: white;
    cursor: pointer;
    user-select: none;

    &:hover {
        background-color: $ff-grey-50;
    }

    .ff-icon {
        width: 1rem;
        height: 1rem;
        color: $ff-grey-500;
        flex-shrink: 0;
        transition: transform 0.2s ease;

        &.rotated {
            transform: rotate(90deg);
        }
    }
}

.ff-expert-tool-call--count {
    font-size: 1rem;
    font-weight: 500;
    color: $ff-grey-800;
    flex: 1;
}

.ff-expert-tool-call--duration {
    font-size: 1rem;
    color: $ff-grey-500;
}

.ff-expert-tool-call--body {
    border-top: 1px solid $ff-grey-200;
    padding: 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.ff-expert-tool-call--item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.ff-expert-tool-call--title {
    font-size: 0.875rem;
    font-weight: 600;
    color: $ff-grey-800;
}

.ff-expert-tool-call--name {
    font-size: 0.75rem;
    color: $ff-grey-500;
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
}

.ff-expert-tool-call--output {
    margin-top: 0.5rem;

    pre {
        margin: 0;
        padding: 0.75rem;
        background-color: $ff-grey-100;
        border-radius: 0.375rem;
        overflow-x: auto;

        code {
            font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
            font-size: 0.8125rem;
            color: $ff-grey-800;
            white-space: pre-wrap;
            word-break: break-word;
        }
    }
}
</style>
