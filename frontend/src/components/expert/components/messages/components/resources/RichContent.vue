<template>
    <p v-html="formattedContent" />
</template>

<script>
import { marked } from 'marked'
import { mapActions } from 'vuex'

import useStreamingWords from '../../../../../../composables/strings/StreamingWords.js'
import { sanitize } from '../../../../../../composables/strings/String.js'

export default {
    name: 'RichContent',
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
        streamed: {
            required: true,
            type: Boolean
        }
    },
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
            const source = this.isStreaming ? this.text : this.content
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
    watch: {
        content: {
            immediate: false,
            handler (next) {
                // if the prop changes, restart the stream
                this.stream(next)
            }
        }
    },
    async mounted () {
        if (!this.streamed) {
            await this.stream(this.content)
            await this.updateAnswerStreamedState({
                messageUuid: this.messageUuid,
                answerUuid: this.answerUuid
            })
        }
    },
    methods: {
        ...mapActions('product/expert', ['updateAnswerStreamedState'])
    }
}
</script>

<style scoped lang="scss">

</style>
