<template>
    <div class="flex flex-col gap-3">
        <template v-for="item in activity" :key="item._uuid">
            <reasoning-block v-if="item.kind === 'reasoning'" :item="item" :message-uuid="_uuid" />
            <agent-message v-else-if="item.kind === 'message'" :item="item" :message-uuid="_uuid" />
            <timeline-item v-else :item="item" />
        </template>
        <answer-wrapper
            v-for="(fAnswer, key) in visibleItems"
            :key="slugify(`${fAnswer.kind}-${fAnswer.title}-${fAnswer.summary}-${fAnswer._uuid}`)"
            :message-uuid="_uuid"
            :answer="fAnswer"
            :instant="instant"
            @streaming-complete="setSubItemStreamedState(key)"
        />
    </div>
</template>

<script>
import AgentMessage from './components/AgentMessage.vue'
import AnswerWrapper from './components/AnswerWrapper.vue'
import ReasoningBlock from './components/ReasoningBlock.vue'
import TimelineItem from './components/TimelineItem.vue'

import { ACTIVITY_KINDS } from '@/composables/Components/expert/streamedActivity.js'
import useStreamingList from '@/composables/StreamingListHelper.js'
import { slugify } from '@/composables/strings/String.js'

export default {
    name: 'AiMessage',
    components: { AgentMessage, AnswerWrapper, ReasoningBlock, TimelineItem },
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
        // eslint-disable-next-line vue/prop-name-casing
        _transactionId: {
            required: false,
            type: String,
            default: null
        },
        instant: {
            type: Boolean,
            default: false
        }
    },
    setup () {
        const { initStreamer, setSubItemStreamedState, visibleItems, items } = useStreamingList({ shallow: true })

        return { initStreamer, setSubItemStreamedState, visibleItems, items }
    },
    computed: {
        activity () {
            return this.answer.filter(answer => ACTIVITY_KINDS.includes(answer.kind))
        },
        terminalAnswers () {
            return this.answer.filter(answer => !ACTIVITY_KINDS.includes(answer.kind))
        }
    },
    watch: {
        // A streamed bubble mounts holding only activity; the final reply merges in later.
        terminalAnswers (answers) {
            if (answers.length > this.visibleItems.length) {
                this.initStreamer(answers, { shouldStream: !this.instant && !this._streamed })
            }
        }
    },
    async mounted () {
        await this.initStreamer(this.terminalAnswers, { shouldStream: !this.instant && !this._streamed })
    },
    methods: { slugify }
}
</script>

<style scoped lang="scss">

</style>
