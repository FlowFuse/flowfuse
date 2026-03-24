<template>
    <div class="flex flex-col gap-3">
        <tool-calls v-if="toolCalls" :message="toolCalls" />
        <answer-wrapper
            v-for="(fAnswer, key) in visibleItems"
            :key="slugify(`${fAnswer.kind}-${fAnswer.title}-${fAnswer.summary}-${fAnswer._uuid}`)"
            :message-uuid="_uuid"
            :answer="fAnswer"
            @streaming-complete="setSubItemStreamedState(key)"
        />
        <div v-if="toolCalls2 && toolCalls2.length">
            <div v-for="(call, key) in toolCalls2" :key="key">
                <span>
                    agent invoked
                    <i :title="JSON.stringify(call.params)" class="cursor-pointer">{{ call.action }}</i>
                </span>
            </div>
        </div>
    </div>
</template>

<script>
import useStreamingList from '../../../../composables/StreamingListHelper.js'
import { slugify } from '../../../../composables/strings/String.js'

import AnswerWrapper from './components/AnswerWrapper.vue'
import ToolCalls from './components/ToolCalls.vue'

export default {
    name: 'AiMessage',
    components: { ToolCalls, AnswerWrapper },
    props: {
        query: {
            type: String,
            required: false,
            default: null
        },
        answer: {
            type: Object,
            required: true
        },
        timings: {
            required: false,
            default: null,
            type: Object
        },
        // eslint-disable-next-line vue/prop-name-casing
        _type: {
            type: String,
            required: true
        },
        // eslint-disable-next-line vue/prop-name-casing
        _timestamp: {
            required: true,
            type: Number
        },
        // eslint-disable-next-line vue/prop-name-casing
        _uuid: {
            required: true,
            type: String
        },
        // eslint-disable-next-line vue/prop-name-casing
        _streamed: {
            required: true,
            type: Boolean
        },
        toolCalls2: {
            required: false,
            default: null,
            type: Array
        }
    },
    setup () {
        const { initStreamer, setSubItemStreamedState, visibleItems, items } = useStreamingList({ shallow: true })

        return { initStreamer, setSubItemStreamedState, visibleItems, items }
    },
    computed: {
        toolCalls () {
            // todo we need to reconsider how we serve data to the tool calls component. This is ok for now as it
            //  only impacts the immediate child component (was hacked out of the expert store)
            const mcpItems = this.answer.filter(answer => ['mcp_tool', 'mcp_resource', 'mcp_resource_template', 'mcp_prompt'].includes(answer.kind))

            // Handle MCP calls if present - includes tools, resources, and prompts
            if (mcpItems.length > 0) {
                const toolCalls = mcpItems.map(item => ({
                    id: item.toolId,
                    name: item.toolName,
                    title: item.toolTitle || item.toolName,
                    kind: item.kind,
                    args: item.input,
                    output: item.output,
                    durationMs: item.durationMs
                }))

                // Calculate total duration in seconds
                const totalDurationMs = mcpItems.reduce((sum, item) => sum + (item.durationMs || 0), 0)
                const totalDurationSec = (totalDurationMs / 1000).toFixed(2)

                return {
                    type: 'ai',
                    kind: 'tool_calls',
                    toolCalls,
                    duration: totalDurationSec,
                    content: `${toolCalls.length} tool call(s)`,
                    timestamp: Date.now()
                }
            }

            return null
        },
        filteredAnswers () {
            return this.answer.filter(answer => !['mcp_tool', 'mcp_resource', 'mcp_resource_template', 'mcp_prompt'].includes(answer.kind))
        }
    },
    async mounted () {
        await this.initStreamer(this.filteredAnswers, { shouldStream: !this._streamed })
    },
    methods: { slugify }
}
</script>

<style scoped lang="scss">

</style>
