<template>
    <div class="ff-expert-tool-call">
        <div class="ff-expert-tool-call--header">
            <ChevronRightIcon class="ff-icon" />
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
                <div class="ff-expert-tool-call--name">{{ tool.name }}</div>
                <div class="ff-expert-tool-call--query">"{{ toolQuery(tool) }}"</div>
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
        toolQuery (tool) {
            if (tool.args?.query) {
                return tool.args.query
            }
            if (tool.args && Object.keys(tool.args).length > 0) {
                return JSON.stringify(tool.args)
            }
            return ''
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

    .ff-icon {
        width: 1rem;
        height: 1rem;
        color: $ff-grey-500;
        flex-shrink: 0;
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

.ff-expert-tool-call--name {
    font-size: 0.875rem;
    font-weight: 500;
    color: $ff-grey-800;
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
}

.ff-expert-tool-call--query {
    font-size: 0.8125rem;
    color: $ff-grey-500;
    font-style: italic;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
