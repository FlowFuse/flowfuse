<template>
    <div class="ff-expert-tool-call">
        <div class="ff-expert-tool-call--header" @click="toggleExpanded">
            <ChevronRightIcon class="ff-icon" :class="{ 'rotated': expanded }" />
            <span class="ff-expert-tool-call--count">
                {{ toolCallCount }} tool call{{ toolCallCount > 1 ? 's' : '' }}
            </span>
            <span class="ff-expert-tool-call--duration">
                {{ formattedDuration }} ms
            </span>
        </div>
        <div class="ff-expert-tool-call--body" :class="{ 'is-expanded': expanded }">
            <ToolCallItem
                v-for="tool in toolCalls"
                :key="tool.id"
                :tool="tool"
                :expanded="expanded"
            />
        </div>
    </div>
</template>

<script>
import { ChevronRightIcon } from '@heroicons/vue/solid'

import ToolCallItem from './ToolCallItem.vue'

export default {
    name: 'ToolCalls',
    components: {
        ChevronRightIcon,
        ToolCallItem
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
            if (duration === null || duration === undefined) return 0
            // Duration is stored as seconds (string or number), convert to ms
            const seconds = typeof duration === 'string' ? parseFloat(duration) : duration
            return Math.round(seconds * 1000)
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
    --item-height: 3rem;
    border-top: 1px solid $ff-grey-200;
    padding: 0.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: calc(var(--item-height) * 2 + 1.5rem);
    overflow-y: auto;
    transition: max-height 0.2s ease;

    &.is-expanded {
        max-height: calc(var(--item-height) * 15 + 1.5rem);
    }
}
</style>
