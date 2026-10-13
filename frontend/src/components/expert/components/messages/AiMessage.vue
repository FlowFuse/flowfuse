<template>
    <div class="flex flex-col gap-3">
        <timeline-item v-for="item in toolRecords" :key="item._uuid" :item="item" />
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
import AnswerWrapper from './components/AnswerWrapper.vue'
import TimelineItem from './components/TimelineItem.vue'

import { ACTIVITY_KINDS, isToolRecord } from '@/composables/Components/expert/streamedActivity.js'
import useStreamingList from '@/composables/StreamingListHelper.js'
import { slugify } from '@/composables/strings/String.js'

export default {
    name: 'AiMessage',
    components: { AnswerWrapper, TimelineItem },
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
        toolRecords () {
            return this.answer.filter(isToolRecord)
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
