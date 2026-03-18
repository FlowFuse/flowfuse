<template>
    <streamable-content
        :string="content"
        :should-stream="shouldStream"
        :rich-content="true"
        @streaming-complete="onStreamComplete"
    />
</template>

<script>
<<<<<<< 6816-action-links
import { marked } from 'marked'
import { mapActions, mapState } from 'vuex'
=======
import { mapActions } from 'vuex'
>>>>>>> expert/scalability

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
<<<<<<< 6816-action-links
    computed: {
        ...mapState('product/assistant', ['supportedActions']),
        formattedContent () {
            const source = this.content
            const html = marked(source || '', {
                breaks: true,
                gfm: true
            })
            return this.sanitize(html, {
                supportedActions: this.supportedActions,
                targetBlank: true,
                appendQueryParameters: {
                    utm_source: 'flowfuse-expert',
                    utm_medium: 'assistant',
                    utm_campaign: 'expert-chat'
                }
            })
        }
    },
=======
>>>>>>> expert/scalability
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
