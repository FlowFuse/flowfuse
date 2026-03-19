<template>
    <streamable-content
        :string="content"
        :should-stream="shouldStream"
        :rich-content="true"
        @streaming-complete="onStreamComplete"
    />
</template>

<script>
import { mapActions } from 'pinia'

import useStreamingWords from '../../../../../../composables/strings/StreamingWords.js'
import { sanitize } from '../../../../../../composables/strings/String.js'

import StreamableContent from './StreamableContent.vue'

import { useProductExpertStore } from '@/stores/product-expert.js'

export default {
    name: 'RichContent',
    components: { StreamableContent },
    props: {
        content: {
            required: true,
            type: String
        },
        messageUuid: {
            required: true,
            type: String
        },
        answerUuid: {
            required: true,
            type: String
        },
        shouldStream: {
            required: true,
            type: Boolean
        }
    },
    emits: ['streaming-complete'],
    setup () {
        const { text, isStreaming, stream, stop } = useStreamingWords({ delayMs: 30 })

        return {
            sanitize,
            text,
            isStreaming,
            stream,
            stop
        }
    },
    async mounted () {
        if (!this.shouldStream) {
            await this.onStreamComplete()
        }
    },
    methods: {
        ...mapActions(useProductExpertStore, ['updateAnswerStreamedState']),
        async onStreamComplete () {
            await this.updateAnswerStreamedState({
                messageUuid: this.messageUuid,
                answerUuid: this.answerUuid
            })
            this.$emit('streaming-complete')
        }
    }
}
</script>

<style scoped lang="scss">

</style>
