<template>
    <streamable-content
        :string="formattedContent"
        :should-stream="shouldStream"
        :rich-content="true"
        @streaming-complete="onStreamComplete"
    />
</template>

<script>
import { marked } from 'marked'
import { mapActions } from 'vuex'

import useStreamingWords from '../../../../../../composables/strings/StreamingWords.js'
import { sanitize } from '../../../../../../composables/strings/String.js'

import StreamableContent from './StreamableContent.vue'

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
    computed: {
        formattedContent () {
            const source = this.content
            const html = marked(source || '', {
                breaks: true,
                gfm: true
            })
            return this.sanitize(html, {
                targetBlank: true,
                appendQueryParameters: {
                    utm_source: 'flowfuse-expert',
                    utm_medium: 'assistant',
                    utm_campaign: 'expert-chat'
                }
            })
        }
    },
    async mounted () {
        if (!this.shouldStream) {
            await this.onStreamComplete()
        }
    },
    methods: {
        ...mapActions('product/expert', ['updateAnswerStreamedState']),
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
